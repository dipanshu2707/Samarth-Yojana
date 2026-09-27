"""
Gateway Service - The Backend-For-Frontend (BFF) layer.
Coordinates calls between the React frontend, eligibility-service, and document-service.
Provides rate limiting, structured error handling, and health aggregation.
"""

import os
import sys
import time
from collections import defaultdict
from typing import Dict, Any, Optional, List

from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))
from schemas import (
    MatchRequest, MatchResponse, DocumentCheckResponse,
    GrievanceSubmitRequest, GrievanceResponse, GrievanceEscalateRequest, GrievanceResolveRequest, HotspotItem
)
from grievance_engine import (
    GRIEVANCE_STORE, create_grievance, escalate_grievance, resolve_grievance, get_hotspot_analytics
)

app = FastAPI(title="Yojana Sathi & MP CM Online Gateway Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ELIGIBILITY_SERVICE_URL = os.getenv("ELIGIBILITY_SERVICE_URL", "http://localhost:8001")
DOCUMENT_SERVICE_URL = os.getenv("DOCUMENT_SERVICE_URL", "http://localhost:8002")

# Basic In-Memory Rate Limiter (per client IP)
# Window: 60 seconds, Max: 60 requests
RATE_LIMIT_WINDOW = 60 # seconds
RATE_LIMIT_MAX_REQUESTS = 60
ip_request_history = defaultdict(list)

def is_rate_limited(client_ip: str) -> bool:
    now = time.time()
    timestamps = ip_request_history[client_ip]
    # Prune expired timestamps
    ip_request_history[client_ip] = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
    if len(ip_request_history[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return True
    ip_request_history[client_ip].append(now)
    return False

@app.middleware("http")
async def rate_limiting_middleware(request: Request, call_next):
    # Only rate-limit API calls, skip health checks
    if request.url.path.startswith("/api/"):
        client_ip = request.client.host if request.client else "unknown"
        if is_rate_limited(client_ip):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"error": "Rate limit exceeded. Please wait a minute before making more requests."}
            )
    return await call_next(request)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "gateway"}

@app.get("/health/all")
async def health_all():
    results = {"gateway": "ok", "eligibility": "unknown", "document": "unknown"}
    async with httpx.AsyncClient(timeout=3.0) as client:
        try:
            r = await client.get(f"{ELIGIBILITY_SERVICE_URL}/health")
            if r.status_code == 200:
                results["eligibility"] = "ok"
            else:
                results["eligibility"] = f"error_{r.status_code}"
        except Exception:
            results["eligibility"] = "unreachable"

        try:
            r = await client.get(f"{DOCUMENT_SERVICE_URL}/health")
            if r.status_code == 200:
                results["document"] = "ok"
            else:
                results["document"] = f"error_{r.status_code}"
        except Exception:
            results["document"] = "unreachable"

    overall_ok = all(v == "ok" for v in results.values())
    return {
        "status": "ok" if overall_ok else "degraded",
        "services": results
    }

@app.post("/api/match", response_model=MatchResponse)
async def api_match(request_data: MatchRequest):
    """
    Proxies citizen profile to eligibility-service and returns matched schemes.
    Handles network errors, service unavailability, and timeouts gracefully.
    """
    payload = request_data.model_dump(exclude_none=True)
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(
                f"{ELIGIBILITY_SERVICE_URL}/match",
                json=payload
            )
            if response.status_code == 200:
                return response.json()
            else:
                print(f"[Gateway] Eligibility service returned {response.status_code}: {response.text}")
                return MatchResponse(
                    matches=[],
                    possible_but_unconfirmed=[],
                    disclaimer="The eligibility service encountered a temporary error. Please try again shortly."
                )
        except httpx.ConnectError:
            print("[Gateway] Could not connect to eligibility service")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Eligibility service is temporarily offline. Please ensure all backend services are running."
            )
        except httpx.TimeoutException:
            print("[Gateway] Eligibility service request timed out")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Matching service took too long to respond. Please try again."
            )
        except Exception as e:
            print(f"[Gateway] Unexpected proxy error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred while calculating eligibility."
            )

@app.post("/api/check-document", response_model=DocumentCheckResponse)
async def api_check_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    scheme_id: str = Form(default="")
):
    """
    Proxies document photo to document-service for OCR and visual readiness evaluation.
    """
    contents = await file.read()
    files = {"file": (file.filename, contents, file.content_type)}
    data = {"document_type": document_type, "scheme_id": scheme_id}

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(
                f"{DOCUMENT_SERVICE_URL}/check-document",
                files=files,
                data=data
            )
            if response.status_code == 200:
                return response.json()
            else:
                detail = "Document service returned an error"
                try:
                    detail = response.json().get("detail", detail)
                except Exception:
                    pass
                raise HTTPException(status_code=response.status_code, detail=detail)
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Document readiness verification service is currently offline."
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Document inspection timed out. Please try uploading a slightly smaller or clearer image."
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error inspecting document: {str(e)}"
            )

# ==========================================================
# MP CM Online - Grievance Redressal & Escalation Endpoints
# ==========================================================

@app.post("/api/grievance/submit", response_model=GrievanceResponse)
async def api_submit_grievance(request_data: GrievanceSubmitRequest):
    """
    Submits a new civic grievance with AI triage, regional routing,
    deduplication check, hotspot detection, and Level 1 7-day SLA window.
    Complaints are permanently immutable once registered.
    """
    payload = request_data.model_dump()
    try:
        record = create_grievance(payload)
        return record
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register grievance: {str(e)}"
        )

@app.get("/api/grievance/list")
async def api_list_grievances(
    level: Optional[int] = None,
    district: Optional[str] = None,
    status_filter: Optional[str] = None
):
    """
    Lists grievances with optional filtering by Escalation Level (1, 2, 3),
    District, or Status for administrative tracking.
    """
    items = list(GRIEVANCE_STORE.values())
    if level is not None:
        items = [i for i in items if i.get("escalation_level") == level]
    if district:
        items = [i for i in items if i.get("district", "").lower() == district.lower()]
    if status_filter:
        items = [i for i in items if status_filter.lower() in i.get("status", "").lower()]
    
    return {"grievances": items, "total": len(items)}

@app.get("/api/grievance/track/{ticket_id}", response_model=GrievanceResponse)
async def api_track_grievance(ticket_id: str):
    """
    Citizen Ticket Tracker: Returns real-time status, 3-tier escalation level,
    SLA countdown, assigned department, and audit trail timeline.
    """
    clean_id = ticket_id.strip()
    if clean_id not in GRIEVANCE_STORE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No grievance ticket found matching '{clean_id}'. Please check your Ticket ID."
        )
    return GRIEVANCE_STORE[clean_id]

@app.post("/api/grievance/{ticket_id}/escalate", response_model=GrievanceResponse)
async def api_escalate_grievance(ticket_id: str, request_data: GrievanceEscalateRequest):
    """
    Simulates / triggers escalation across the 3 tiers:
    Level 1 (Department) -> Level 2 (District Collector) -> Level 3 (CM Office).
    """
    clean_id = ticket_id.strip()
    try:
        updated = escalate_grievance(clean_id, target_level=request_data.target_level, reason=request_data.reason)
        return updated
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket '{clean_id}' does not exist."
        )

@app.post("/api/grievance/{ticket_id}/resolve", response_model=GrievanceResponse)
async def api_resolve_grievance(ticket_id: str, request_data: GrievanceResolveRequest):
    """
    Marks a grievance resolved with official audit notes and proof.
    """
    clean_id = ticket_id.strip()
    try:
        resolved = resolve_grievance(
            clean_id,
            officer_name=request_data.officer_name,
            officer_designation=request_data.officer_designation,
            note=request_data.resolution_note,
            evidence_url=request_data.evidence_url
        )
        return resolved
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket '{clean_id}' does not exist."
        )

@app.get("/api/grievance/hotspots", response_model=List[HotspotItem])
async def api_get_hotspots():
    """
    Returns live geographical hotspot analytics across Madhya Pradesh districts.
    """
    return get_hotspot_analytics()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
