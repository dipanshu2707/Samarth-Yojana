import io
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from PIL import Image

from main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["schemes_count"] >= 13


def test_health_all():
    r = client.get("/health/all")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["services"]["eligibility"] == "ok"
    assert data["services"]["document"] == "ok"


def test_match_aarti_persona():
    # Rural OBC undergraduate student, 65% in Class 12 -> Post-Matric, Gaon Ki Beti, NSP
    profile = {
        "age": 19,
        "gender": "female",
        "residency": "Madhya Pradesh",
        "rural_or_urban": "rural",
        "category": "OBC",
        "annual_family_income": 120000,
        "education_level": "undergraduate",
        "class12_percentage": 65.0,
        "occupation": "student",
        "language": "en",
    }
    r = client.post("/api/match", json=profile)
    assert r.status_code == 200, r.text
    data = r.json()
    matched_ids = [m["scheme_id"] for m in data["matches"]]
    assert "mp_post_matric_scst_obc" in matched_ids
    assert "mp_gaon_ki_beti" in matched_ids
    # MMVY must NOT match at 65% (needs 70%+)
    assert "mp_mmvy" not in matched_ids


def test_match_direct_alias():
    profile = {"age": 30, "gender": "female", "residency": "Madhya Pradesh", "language": "en"}
    r = client.post("/match", json=profile)
    assert r.status_code == 200, r.text


def _sample_image_bytes(width=600, height=400, color="white"):
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_check_document_rejects_bad_type():
    r = client.post(
        "/api/check-document",
        files={"file": ("note.txt", b"hello", "text/plain")},
        data={"document_type": "income_certificate"},
    )
    assert r.status_code == 400


def test_check_document_heuristic_path():
    img_bytes = _sample_image_bytes()
    r = client.post(
        "/api/check-document",
        files={"file": ("doc.jpg", img_bytes, "image/jpeg")},
        data={"document_type": "income_certificate", "scheme_id": ""},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["verdict"] in ("likely_acceptable", "needs_review", "likely_wrong_document")
    assert "legibility" in data


def test_grievance_flow():
    payload = {
        "citizen_name": "Test Citizen",
        "auth_type": "aadhaar",
        "auth_id": "9988-7766-5544",
        "mobile": "9826198765",
        "district": "Indore",
        "block_or_ward": "Ward 22",
        "region_type": "urban",
        "address": "Vijay Nagar",
        "title": "Severe road craters and asphalt breakup on main crossing",
        "description": "Heavy monsoon rains damaged the road with deep potholes. PWD repair required urgently.",
        "multimodal_type": "text",
    }
    r = client.post("/api/grievance/submit", json=payload)
    assert r.status_code == 200, r.text
    ticket_id = r.json()["ticket_id"]

    track = client.get(f"/api/grievance/track/{ticket_id}")
    assert track.status_code == 200

    esc = client.post(f"/api/grievance/{ticket_id}/escalate", json={"target_level": 2, "reason": "test"})
    assert esc.status_code == 200
    assert esc.json()["escalation_level"] == 2

    hotspots = client.get("/api/grievance/hotspots")
    assert hotspots.status_code == 200
