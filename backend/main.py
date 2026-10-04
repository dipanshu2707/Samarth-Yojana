"""
Yojana Sathi Unified API - Single-service merge of gateway + eligibility + document.

Replaces the previous 3-service setup (gateway:8000, eligibility:8001, document:8002)
with one FastAPI app so it can be deployed as a SINGLE Render web service,
with the React frontend separately on Vercel.

External contract is unchanged (frontend only ever talked to the gateway):
  GET  /health
  GET  /health/all
  POST /api/match
  POST /api/check-document
  POST /api/grievance/submit
  GET  /api/grievance/list
  GET  /api/grievance/track/{ticket_id}
  POST /api/grievance/{ticket_id}/escalate
  POST /api/grievance/{ticket_id}/resolve
  GET  /api/grievance/hotspots

Internal change: /api/match and /api/check-document now call the
eligibility matcher and document OCR/vision functions IN-PROCESS
instead of proxying over HTTP to sibling services.
"""

import json
import os
import sys
import time
from collections import defaultdict
from typing import Dict, Any, Optional, List

from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form, Body, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

from schemas import (
    MatchRequest, MatchResponse, DocumentCheckResponse,
    GrievanceSubmitRequest, GrievanceResponse, GrievanceEscalateRequest,
    GrievanceResolveRequest, GrievanceStatusUpdateRequest,
    GrievanceApprovalRequest, GrievanceApprovalDecision,
    HotspotItem, LoginRequest, LoginResponse, DepartmentItem,
    EmailTestRequest, HelpdeskChatRequest, HelpdeskChatResponse,
    HelpdeskHistoryItem,
)
from grievance_engine import (
    GRIEVANCE_STORE, create_grievance, escalate_grievance,
    resolve_grievance, get_hotspot_analytics, get_by_mobile,
    update_workflow_status, request_approval, respond_approval,
    WORKFLOW_STATES,
)
from auth import (
    DEPARTMENTS, verify_login, make_token, get_user_from_token,
    AUTHORITY_LEVELS, LEVEL1_EMAIL, LEVEL2_EMAIL, LEVEL3_EMAIL,
)
from email_service import (
    send_email, get_status as email_status,
    ticket_subject, ticket_body,
)
from grievance_engine import log_email
import db as persist
from object_store import ensure_bucket, upload_bytes, storage_status
from matcher import evaluate_all
from explainer import explain_matches
from ocr import extract_text_from_image
from vision_check import check_document_readiness

app = FastAPI(title="Yojana Sathi Unified API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Local evidence image storage: backend/uploads/<ticket>.jpg
# Served at /uploads/... so officers and citizens can open the proof.
# ------------------------------------------------------------------

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

UPLOAD_MAX_BYTES = 4 * 1024 * 1024
UPLOAD_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def _save_upload(contents: bytes, content_type: str, ticket_id: str) -> str:
    ext = UPLOAD_TYPES.get((content_type or "").lower(), ".jpg")
    safe_ticket = "".join(c for c in (ticket_id or "tmp") if c.isalnum() or c in ("-", "_")) or "tmp"
    stamp = "".join(c for c in str(time.time()).replace(".", ""))[-6:]
    filename = f"{safe_ticket}_{stamp}{ext}"
    # Persistent cloud copy first (Render's disk is ephemeral).
    public_url = upload_bytes(filename, contents, content_type or "image/jpeg")
    if public_url:
        return public_url
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(contents)
    return f"/uploads/{filename}"


def _save_data_url(data_url: str, ticket_id: str) -> Optional[str]:
    """Convert a data:image/...;base64,... URL into a local /uploads file."""
    import base64

    try:
        if not data_url or not data_url.startswith("data:image/"):
            return None
        header, _, b64 = data_url.partition(",")
        mime = header.split(";")[0].split(":")[1] if ":" in header else "image/jpeg"
        raw = base64.b64decode(b64)
        if len(raw) > UPLOAD_MAX_BYTES:
            return None
        return _save_upload(raw, mime, ticket_id)
    except Exception as e:
        print(f"[uploads] data-url save failed: {e}")
        return None

# ------------------------------------------------------------------
# Dataset loading (same schemes_dataset.json as before, now bundled
# inside backend/ so Render with rootDir=backend works out of the box)
# ------------------------------------------------------------------

DATASET = None


def find_and_load_dataset():
    candidates = [
        os.getenv("DATASET_PATH", ""),
        os.path.join(os.path.dirname(__file__), "schemes_dataset.json"),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "schemes_dataset.json")),
        os.path.abspath("schemes_dataset.json"),
        os.path.join(os.getcwd(), "backend", "schemes_dataset.json"),
        "/app/schemes_dataset.json",
    ]
    for p in candidates:
        if p and os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if "schemes" not in data or not isinstance(data["schemes"], list):
                        raise ValueError(f"Dataset at {p} is missing 'schemes' list")
                    print(f"[Unified API] Loaded {len(data['schemes'])} schemes from {p}")
                    return data
            except Exception as e:
                raise RuntimeError(f"FATAL: schemes_dataset.json at {p} failed validation: {e}")
    raise RuntimeError("FATAL: schemes_dataset.json could not be found in any expected location.")


DATASET = find_and_load_dataset()

# ------------------------------------------------------------------
# Ticket persistence: local JSON file always, Supabase when configured.
# ------------------------------------------------------------------

try:
    _restored = persist.load_store()
    if _restored:
        GRIEVANCE_STORE.update(_restored)
        print(f"[Unified API] Restored {len(_restored)} tickets from storage")
    else:
        persist.save_local(GRIEVANCE_STORE)
        print(f"[Unified API] Persisted {len(GRIEVANCE_STORE)} seed tickets locally")
except Exception as e:
    print(f"[Unified API] Storage restore failed: {e}")

try:
    ensure_bucket()
except Exception as e:
    print(f"[Unified API] Storage bucket check failed: {e}")

# ------------------------------------------------------------------
# Rate limiting (same policy as the old gateway: 60 req/min per IP)
# ------------------------------------------------------------------

RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 60
ip_request_history = defaultdict(list)


def is_rate_limited(client_ip: str) -> bool:
    now = time.time()
    timestamps = ip_request_history[client_ip]
    ip_request_history[client_ip] = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
    if len(ip_request_history[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return True
    ip_request_history[client_ip].append(now)
    return False


@app.middleware("http")
async def rate_limiting_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        client_ip = request.client.host if request.client else "unknown"
        if is_rate_limited(client_ip):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"error": "Rate limit exceeded. Please wait a minute before making more requests."},
            )
    return await call_next(request)


# ------------------------------------------------------------------
# Health
# ------------------------------------------------------------------

@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "yojana-sathi-unified-api",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "api",
        "schemes_count": len(DATASET["schemes"]) if DATASET else 0,
    }


@app.get("/health/all")
async def health_all():
    # Single process: every module is local, so either all ok or dataset failed at boot.
    schemes_count = len(DATASET["schemes"]) if DATASET else 0
    return {
        "status": "ok" if DATASET else "degraded",
        "services": {
            "gateway": "ok",
            "eligibility": "ok" if DATASET else "unreachable",
            "document": "ok",
            "schemes_count": schemes_count,
        },
    }


# ------------------------------------------------------------------
# Eligibility (in-process, was: HTTP proxy to eligibility-service)
# ------------------------------------------------------------------

async def _run_match(profile: dict) -> dict:
    if not DATASET:
        raise HTTPException(status_code=500, detail="Schemes dataset not loaded")

    raw_result = evaluate_all(profile, DATASET)
    language = profile.get("language", "en")

    if raw_result.get("matches"):
        raw_result["matches"] = await explain_matches(
            raw_result["matches"], profile, language=language
        )
    if raw_result.get("possible_but_unconfirmed"):
        raw_result["possible_but_unconfirmed"] = await explain_matches(
            raw_result["possible_but_unconfirmed"], profile, language=language
        )
    return raw_result


@app.post("/api/match", response_model=MatchResponse)
async def api_match(request_data: MatchRequest):
    try:
        payload = request_data.model_dump(exclude_none=True)
        return await _run_match(payload)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Unified API] Match error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while calculating eligibility.",
        )


# Back-compat alias for callers that hit the old eligibility service directly.
@app.post("/match")
async def match_direct(profile: dict = Body(...)):
    return await _run_match(profile)


# ------------------------------------------------------------------
# Document readiness (in-process, was: HTTP proxy to document-service)
# ------------------------------------------------------------------

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]


async def _run_document_check(contents: bytes, filename: str, content_type: str,
                              document_type: str, scheme_id: str = "") -> dict:
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {content_type}. Please upload a JPG, PNG, or WebP image.",
        )
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds the 5MB limit. Please upload a smaller or compressed photo.",
        )
    try:
        extracted_text, metadata = extract_text_from_image(contents)
        result = await check_document_readiness(
            image_bytes=contents,
            document_type=document_type,
            scheme_context=scheme_id,
            extracted_text=extracted_text,
            metadata=metadata,
        )
        # DPDP Act 2023: image processed transiently in memory, never persisted.
        del contents
        if extracted_text:
            result["extracted_text_snippet"] = extracted_text[:200] + ("..." if len(extracted_text) > 200 else "")
        else:
            result["extracted_text_snippet"] = None
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Unified API] Error processing document: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while inspecting the document: {str(e)}",
        )


@app.post("/api/check-document", response_model=DocumentCheckResponse)
async def api_check_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    scheme_id: str = Form(default=""),
):
    contents = await file.read()
    return await _run_document_check(contents, file.filename, file.content_type, document_type, scheme_id)


# Back-compat alias for callers that hit the old document service directly.
@app.post("/check-document")
async def check_document_direct(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    scheme_id: str = Form(default=""),
):
    contents = await file.read()
    return await _run_document_check(contents, file.filename, file.content_type, document_type, scheme_id)


# ==========================================================
# Authority login, departments and grievance workflow
# ==========================================================

@app.post("/api/auth/login", response_model=LoginResponse)
async def api_login(payload: LoginRequest):
    user = verify_login(payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password for authority login.",
        )
    selected = None
    if user["level"] == 1 and payload.dept_id:
        wanted = (payload.dept_id or "").strip().lower()
        if wanted in user["departments"]:
            selected = wanted
    return {
        "token": make_token(user["email"]),
        "email": user["email"],
        "name": user["name"],
        "designation_en": user["designation_en"],
        "designation_hi": user["designation_hi"],
        "level": user["level"],
        "role": user["role"],
        "departments": user["departments"],
        "selected_dept": selected,
    }


@app.get("/api/departments", response_model=List[DepartmentItem])
async def api_departments():
    return DEPARTMENTS


@app.get("/api/authority-levels")
async def api_authority_levels():
    return {"levels": list(AUTHORITY_LEVELS.values())}


def _level_email(level: int) -> str:
    if level == 2:
        return LEVEL2_EMAIL
    if level == 3:
        return LEVEL3_EMAIL
    return LEVEL1_EMAIL


def _notify(recipients, ticket: dict, subject: str, action_line: str, actor: str = "") -> dict:
    """Send one real email and log the truthful outcome on the ticket."""
    result = send_email(recipients, subject, ticket_body(ticket, action_line, actor))
    to_label = recipients if isinstance(recipients, str) else ", ".join(recipients or [])
    try:
        log_email(ticket, to_label, result, subject)
    except Exception:
        pass
    return result


@app.get("/api/email/status")
async def api_email_status():
    return email_status()


@app.post("/api/email/test")
async def api_email_test(payload: EmailTestRequest):
    to_addr = (payload.to or "").strip()
    if "@" not in to_addr:
        raise HTTPException(status_code=400, detail="Valid recipient email required.")
    result = send_email(to_addr, "MP CM Online - test delivery", "This is a live delivery test from the grievance portal.")
    if not result.get("ok"):
        raise HTTPException(status_code=502, detail=f"Delivery failed: {result.get('error')}")
    return {"delivered": True, **result, "to": to_addr}


@app.post("/api/grievance/upload-photo")
async def api_upload_photo(file: UploadFile = File(...), ticket_id: str = Form(default="tmp")):
    if (file.content_type or "").lower() not in UPLOAD_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG or WebP images are accepted.")
    contents = await file.read()
    if len(contents) > UPLOAD_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Image must be under 4 MB.")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file received.")
    url = _save_upload(contents, file.content_type, ticket_id)
    return {"url": url}


@app.get("/api/db/status")
async def api_db_status():
    info = persist.db_status()
    info["tickets_in_memory"] = len(GRIEVANCE_STORE)
    info["storage"] = storage_status()
    return info


@app.post("/api/grievance/submit", response_model=GrievanceResponse)
async def api_submit_grievance(request_data: GrievanceSubmitRequest):
    payload = request_data.model_dump()
    if not payload.get("title") or not payload.get("description"):
        raise HTTPException(status_code=400, detail="Title and description are required.")
    if not (payload.get("mobile") or "").strip():
        raise HTTPException(status_code=400, detail="Mobile number is required to track the complaint.")
    try:
        record = create_grievance(payload)
        # Data-URL photos (older clients) are moved to local disk files
        # so the ticket id always matches a file under backend/uploads/.
        for key in ("photo_evidence_url", "photo_evidence_preview"):
            val = record.get(key)
            if isinstance(val, str) and val.startswith("data:image/"):
                saved = _save_data_url(val, record["ticket_id"])
                if saved:
                    record["photo_evidence_url"] = saved
        persist.persist_record(record, GRIEVANCE_STORE)
        # Real-time routing mail to the selected department desk.
        subject = ticket_subject("New grievance", record["ticket_id"], record["title"])
        _notify(
            record.get("dept_contact_email") or LEVEL1_EMAIL,
            record, subject,
            f"New complaint filed and routed to {record['department']}. Photo/voice proof is in the portal dossier.",
            f"Citizen {record.get('citizen_name')}",
        )
        # Receipt copy to the citizen when an address was supplied.
        if (record.get("citizen_email") or "").strip():
            _notify(
                record["citizen_email"], record,
                ticket_subject("Receipt", record["ticket_id"], record["title"]),
                "Your complaint is registered. Track it with your mobile number; officer remarks appear in the timeline.",
                "MP CM Online",
            )
        return record
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register grievance: {str(e)}",
        )


@app.get("/api/grievance/list")
async def api_list_grievances(
    level: Optional[int] = None,
    district: Optional[str] = None,
    status_filter: Optional[str] = None,
    dept_id: Optional[str] = None,
    workflow_status: Optional[str] = None,
    token: Optional[str] = None,
):
    items = list(GRIEVANCE_STORE.values())
    # Role-scoped visibility: Level-1 desk sees only its own department.
    if token:
        viewer = get_user_from_token(token)
        if viewer and viewer["level"] == 1:
            desk = dept_id or request_dept_hint(token)
            if desk:
                items = [i for i in items if i.get("dept_id") == desk]
            # without an explicit desk, show nothing rather than leaking
            # other departments (strict isolation for L1 desk).
            elif dept_id is None:
                items = []
    if level is not None:
        items = [i for i in items if i.get("escalation_level") == level]
    if district:
        items = [i for i in items if i.get("district", "").lower() == district.lower()]
    if dept_id:
        items = [i for i in items if (i.get("dept_id") or "").lower() == dept_id.lower()]
    if workflow_status:
        items = [i for i in items if (i.get("workflow_status") or "") == workflow_status.lower()]
    if status_filter:
        needle = status_filter.lower()
        if needle in ("open", "in_review", "in_progress", "resolved", "closed"):
            mapped = "resolved" if needle == "closed" else needle
            items = [i for i in items if (i.get("workflow_status") or "") == mapped]
        else:
            items = [i for i in items if needle in i.get("status", "").lower()]

    return {"grievances": items, "total": len(items)}


def request_dept_hint(token: str) -> Optional[str]:
    # Token alone does not carry desk choice; desk is passed explicitly
    # via dept_id. Kept as hook for header-based desk selection.
    return None


@app.get("/api/grievance/by-mobile/{mobile}")
async def api_grievances_by_mobile(mobile: str):
    items = get_by_mobile(mobile)
    return {"grievances": items, "total": len(items), "mobile_masked": items[0]["mobile_masked"] if items else None}


@app.get("/api/grievance/track/{ticket_id}", response_model=GrievanceResponse)
async def api_track_grievance(ticket_id: str):
    clean_id = ticket_id.strip()
    if clean_id not in GRIEVANCE_STORE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No grievance ticket found matching '{clean_id}'. Please check your Ticket ID.",
        )
    return GRIEVANCE_STORE[clean_id]


@app.post("/api/grievance/{ticket_id}/escalate", response_model=GrievanceResponse)
async def api_escalate_grievance(ticket_id: str, request_data: GrievanceEscalateRequest):
    clean_id = ticket_id.strip()
    try:
        before = (GRIEVANCE_STORE.get(clean_id) or {}).get("escalation_level", 1)
        updated = escalate_grievance(
            clean_id,
            target_level=request_data.target_level,
            reason=request_data.reason or "",
            escalated_by=request_data.escalated_by or "",
            designation=request_data.designation or "",
        )
        after = updated.get("escalation_level", before)
        if after > before:
            target = _level_email(after)
            _notify(
                target, updated,
                ticket_subject(f"Forwarded to Level {after}", clean_id, updated.get("title", "")),
                f"Case forwarded from Level {before} to Level {after}. Reason: {request_data.reason or 'higher intervention requested'}.",
                request_data.escalated_by or f"Level {before} desk",
            )
            if (updated.get("citizen_email") or "").strip():
                _notify(
                    updated["citizen_email"], updated,
                    ticket_subject("Status update", clean_id, updated.get("title", "")),
                    f"Your complaint moved to Level {after} for further action.",
                    "MP CM Online",
                )
        persist.persist_record(updated, GRIEVANCE_STORE)
        return updated
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket '{clean_id}' does not exist.",
        )


@app.post("/api/grievance/{ticket_id}/status", response_model=GrievanceResponse)
async def api_update_status(ticket_id: str, request_data: GrievanceStatusUpdateRequest):
    clean_id = ticket_id.strip()
    wanted = (request_data.workflow_status or "").strip().lower()
    if wanted == "closed":
        wanted = "resolved"
    if wanted not in WORKFLOW_STATES:
        raise HTTPException(status_code=400, detail="workflow_status must be open | in_review | in_progress | resolved.")
    try:
        if wanted == "resolved":
            updated = resolve_grievance(
                clean_id,
                officer_name=request_data.officer_name,
                officer_designation=request_data.officer_designation,
                note=request_data.remark or "Resolved after field verification.",
            )
        else:
            updated = update_workflow_status(
                clean_id, wanted,
                officer_name=request_data.officer_name,
                officer_designation=request_data.officer_designation,
                remark=request_data.remark or "",
            )
        if (updated.get("citizen_email") or "").strip():
            _notify(
                updated["citizen_email"], updated,
                ticket_subject("Status update", clean_id, updated.get("title", "")),
                f"Officer remark ({wanted}): {request_data.remark or 'workflow updated'}.",
                f"{request_data.officer_name} ({request_data.officer_designation})",
            )
        persist.persist_record(updated, GRIEVANCE_STORE)
        return updated
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ticket '{clean_id}' does not exist.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/grievance/{ticket_id}/request-approval", response_model=GrievanceResponse)
async def api_request_approval(ticket_id: str, request_data: GrievanceApprovalRequest):
    clean_id = ticket_id.strip()
    try:
        updated = request_approval(
            clean_id,
            requested_by=request_data.requested_by,
            designation=request_data.designation,
            target_level=request_data.target_level,
            note=request_data.note,
        )
        _notify(
            _level_email(request_data.target_level), updated,
            ticket_subject("Approval requested", clean_id, updated.get("title", "")),
            f"Approval requested by {request_data.requested_by} ({request_data.designation}). Note: {request_data.note}",
            request_data.requested_by,
        )
        persist.persist_record(updated, GRIEVANCE_STORE)
        return updated
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ticket '{clean_id}' does not exist.")


@app.post("/api/grievance/{ticket_id}/approval-decision", response_model=GrievanceResponse)
async def api_approval_decision(ticket_id: str, request_data: GrievanceApprovalDecision):
    clean_id = ticket_id.strip()
    try:
        updated = respond_approval(
            clean_id, request_data.index, request_data.decision,
            responder=request_data.responder,
            responder_designation=request_data.responder_designation,
            comment=request_data.comment or "",
        )
        persist.persist_record(updated, GRIEVANCE_STORE)
        return updated
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/grievance/{ticket_id}/resolve", response_model=GrievanceResponse)
async def api_resolve_grievance(ticket_id: str, request_data: GrievanceResolveRequest):
    clean_id = ticket_id.strip()
    try:
        resolved = resolve_grievance(
            clean_id,
            officer_name=request_data.officer_name,
            officer_designation=request_data.officer_designation,
            note=request_data.resolution_note,
            evidence_url=request_data.evidence_url,
        )
        if (resolved.get("citizen_email") or "").strip():
            _notify(
                resolved["citizen_email"], resolved,
                ticket_subject("Resolved", clean_id, resolved.get("title", "")),
                f"Resolved: {request_data.resolution_note}",
                f"{request_data.officer_name} ({request_data.officer_designation})",
            )
        persist.persist_record(resolved, GRIEVANCE_STORE)
        return resolved
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket '{clean_id}' does not exist.",
        )


@app.get("/api/grievance/hotspots", response_model=List[HotspotItem])
async def api_get_hotspots():
    return get_hotspot_analytics()


# ==========================================================
# Helpdesk AI chat (OpenRouter, server-side key, guardrailed)
# ==========================================================

@app.get("/api/helpdesk/status")
async def api_helpdesk_status():
    import helpdesk as hd

    key = (os.getenv("OPENROUTER_API_KEY", "") or "").strip()
    model = os.getenv("OPENROUTER_MODEL", hd.DEFAULT_MODEL) or hd.DEFAULT_MODEL
    return {
        "configured": bool(key),
        "model": model,
        "provider": "openrouter",
        # Capability handshake: the chat UI enables thinking + token
        # streaming only when the backend reports these. If an old
        # backend is running, the UI shows "restart backend" instead
        # of silently falling back to instant replies.
        "agent": True,
        "stream": True,
        "search_tool": "duckduckgo-free",
        "helpdesk_version": 2,
    }


@app.post("/api/helpdesk/chat", response_model=HelpdeskChatResponse)
async def api_helpdesk_chat(payload: HelpdeskChatRequest):
    import helpdesk as hd

    prep = _helpdesk_prep(payload)
    message, language, scope = prep["message"], prep["language"], prep["scope"]
    history_msgs, match_block = prep["history"], prep["match_block"]
    doc_block, matches = prep["doc_block"], prep["matches"]

    # 1) Deterministic pre-guardrail — no LLM call for clear out-of-scope input.
    if scope == "out_of_scope":
        return HelpdeskChatResponse(
            reply=hd.refusal_text(language),
            intent="out_of_scope",
            guardrail_triggered=True,
            suggested_schemes=[],
            model="guardrail",
            fallback=False,
        )

    system_text, user_text, meta = await hd.build_turn(
        message, history_msgs, language, DATASET, match_block, doc_block
    )
    reply, error = await hd.call_openrouter(
        history_msgs + [{"role": "user", "content": user_text}],
        dataset=DATASET,
        system_text=system_text,
    )
    if error or not reply:
        print(f"[Helpdesk] LLM unavailable, fallback: {error}")
        return HelpdeskChatResponse(
            reply=hd.local_fallback_answer(message, language, matches or None),
            intent="in_scope" if scope == "in_scope" else "ambiguous",
            guardrail_triggered=False,
            suggested_schemes=[m.get("scheme_id", "") for m in (matches or []) if m.get("scheme_id")],
            model="fallback",
            fallback=True,
        )

    # 3) Post-filter: if the model drifted and answered an out-of-scope
    #    question anyway, replace with the refusal (defence in depth).
    if scope == "ambiguous" and hd.classify_scope(message) == "out_of_scope":
        return HelpdeskChatResponse(
            reply=hd.refusal_text(language),
            intent="out_of_scope",
            guardrail_triggered=True,
            suggested_schemes=[],
            model="guardrail",
            fallback=False,
        )

    suggested = [m.get("scheme_id", "") for m in (matches or []) if m.get("scheme_id")]
    for sid in meta.get("schemes", []):
        if sid and sid not in suggested:
            suggested.append(sid)
    return HelpdeskChatResponse(
        reply=reply,
        intent="in_scope" if scope == "in_scope" else "ambiguous",
        guardrail_triggered=False,
        suggested_schemes=suggested,
        model=os.getenv("OPENROUTER_MODEL", hd.DEFAULT_MODEL) or hd.DEFAULT_MODEL,
        fallback=False,
    )


def _helpdesk_prep(payload: HelpdeskChatRequest) -> dict:
    """Shared validation + deterministic grounding for both chat endpoints."""
    message = (payload.message or "").strip()
    language = "hi" if (payload.language or "en").lower().startswith("hi") else "en"
    if not message:
        raise HTTPException(status_code=400, detail="Message is required.")
    if len(message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 chars).")

    import helpdesk as hd

    scope = hd.classify_scope(message)

    # Deterministic eligibility grounding: run the rule engine in-process
    # when a profile is supplied so the LLM cannot invent eligibility.
    matches: list = []
    match_block = ""
    if isinstance(payload.profile, dict) and payload.profile:
        try:
            res = evaluate_all(payload.profile, DATASET)
            matches = (res.get("matches") or [])[:5]
            if matches:
                lines = [
                    f"- {m.get('scheme_id')}: {m.get('name')} — {m.get('plain_language_reason', '')}"
                    for m in matches
                ]
                match_block = (
                    "Deterministic rule-engine matches for this profile (present these faithfully, do not add others):\n"
                    + "\n".join(lines)
                )
        except Exception as e:
            print(f"[Helpdesk] matcher grounding failed: {e}")

    doc_block = ""
    if isinstance(payload.doc_context, dict) and payload.doc_context:
        try:
            doc_block = "Document pre-check result to explain:\n" + json.dumps(
                payload.doc_context, ensure_ascii=False
            )[:1500]
        except Exception:
            doc_block = ""

    history = []
    for h in (payload.history or [])[-8:]:
        role = (h.role or "").strip().lower()
        if role not in ("user", "assistant"):
            continue
        if not (h.content or "").strip():
            continue
        history.append({"role": role, "content": h.content.strip()[:1000]})

    return {
        "message": message, "language": language, "scope": scope,
        "history": history, "match_block": match_block,
        "doc_block": doc_block, "matches": matches,
    }


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _think(language: str, key: str, detail: str = "") -> str:
    texts = {
        "understand": {"en": "Understanding your question…", "hi": "आपका सवाल समझ रहा हूँ…"},
        "facts": {"en": "Checking what I already know about you…", "hi": "आपके बारे में ज्ञात जानकारी जांच रहा हूँ…"},
        "schemes": {"en": "Checking official scheme rules…", "hi": "आधिकारिक योजना नियम जांच रहा हूँ…"},
        "search": {"en": "Searching official updates", "hi": "आधिकारिक अपडेट खोज रहा हूँ"},
        "found": {"en": "Found official sources, verifying…", "hi": "आधिकारिक स्रोत मिले, सत्यापित कर रहा हूँ…"},
        "nosearch": {"en": "No fresh search needed, using verified scheme data…",
                     "hi": "ताज़ा खोज की ज़रूरत नहीं, सत्यापित योजना डेटा उपयोग कर रहा हूँ…"},
        "compose": {"en": "Composing your answer…", "hi": "आपका उत्तर तैयार कर रहा हूँ…"},
    }
    base = texts.get(key, texts["understand"]).get(language, texts["understand"]["en"])
    if detail:
        base = f"{base} ({detail})"
    return base


@app.post("/api/helpdesk/chat/stream")
async def api_helpdesk_chat_stream(payload: HelpdeskChatRequest):
    """Agentic streaming chat: thinking events, then live response tokens.

    Events: `thinking` {text} -> `token` {text} -> `done` {intent,
    guardrail_triggered, suggested_schemes, model, fallback, searched, reply}.
    """
    import helpdesk as hd

    prep = _helpdesk_prep(payload)
    message, language, scope = prep["message"], prep["language"], prep["scope"]
    model_name = os.getenv("OPENROUTER_MODEL", hd.DEFAULT_MODEL) or hd.DEFAULT_MODEL

    async def gen():
        yield _sse("thinking", {"text": _think(language, "understand")})
        if scope == "out_of_scope":
            reply = hd.refusal_text(language)
            yield _sse("done", {
                "reply": reply, "intent": "out_of_scope", "guardrail_triggered": True,
                "suggested_schemes": [], "model": "guardrail", "fallback": False, "searched": False,
            })
            return

        yield _sse("thinking", {"text": _think(language, "facts")})
        system_text, user_text, meta = await hd.build_turn(
            message, prep["history"], language, DATASET, prep["match_block"], prep["doc_block"]
        )
        known = ", ".join(f"{k}={v}" for k, v in (meta.get("slots") or {}).items())
        if known:
            yield _sse("thinking", {"text": _think(language, "facts", known[:120])})
        if meta.get("schemes"):
            yield _sse("thinking", {"text": _think(language, "schemes", ", ".join(meta['schemes'][:3]))})
        if hd.needs_search(message):
            yield _sse("thinking", {"text": _think(language, "search", f"'{message[:60]}'")})
            if meta.get("searched"):
                yield _sse("thinking", {"text": _think(language, "found")})
            else:
                yield _sse("thinking", {"text": _think(language, "nosearch")})
        yield _sse("thinking", {"text": _think(language, "compose")})

        full = []
        try:
            async for delta in hd.stream_openrouter(
                system_text, prep["history"] + [{"role": "user", "content": user_text}]
            ):
                full.append(delta)
                yield _sse("token", {"text": delta})
        except Exception as e:
            print(f"[Helpdesk] stream failed, fallback: {e}")
            matches = prep["matches"]
            reply = hd.local_fallback_answer(message, language, matches or None)
            yield _sse("done", {
                "reply": reply, "intent": "in_scope" if scope == "in_scope" else "ambiguous",
                "guardrail_triggered": False,
                "suggested_schemes": [m.get("scheme_id", "") for m in (matches or []) if m.get("scheme_id")],
                "model": "fallback", "fallback": True, "searched": bool(meta.get("searched")),
            })
            return

        reply = "".join(full).strip()
        if not reply:
            reply = hd.local_fallback_answer(message, language, prep["matches"] or None)
            yield _sse("done", {
                "reply": reply, "intent": "ambiguous", "guardrail_triggered": False,
                "suggested_schemes": [], "model": "fallback", "fallback": True,
                "searched": bool(meta.get("searched")),
            })
            return

        if scope == "ambiguous" and hd.classify_scope(message) == "out_of_scope":
            reply = hd.refusal_text(language)
            yield _sse("done", {
                "reply": reply, "intent": "out_of_scope", "guardrail_triggered": True,
                "suggested_schemes": [], "model": "guardrail", "fallback": False, "searched": False,
            })
            return

        suggested = [m.get("scheme_id", "") for m in (prep["matches"] or []) if m.get("scheme_id")]
        for sid in meta.get("schemes", []):
            if sid and sid not in suggested:
                suggested.append(sid)
        yield _sse("done", {
            "reply": reply, "intent": "in_scope" if scope == "in_scope" else "ambiguous",
            "guardrail_triggered": False, "suggested_schemes": suggested,
            "model": model_name, "fallback": False, "searched": bool(meta.get("searched")),
        })

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
