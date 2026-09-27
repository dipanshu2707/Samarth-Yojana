import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from main import app, is_rate_limited

client = TestClient(app)

def test_gateway_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "gateway"

def test_rate_limiter():
    ip = "192.168.1.100"
    for _ in range(50):
        assert is_rate_limited(ip) is False

def test_grievance_submit_ai_triage():
    payload = {
        "citizen_name": "Radha Bai",
        "auth_type": "aadhaar",
        "auth_id": "9988-7766-5544",
        "mobile": "9826198765",
        "district": "Indore",
        "block_or_ward": "Ward 22",
        "region_type": "urban",
        "address": "Vijay Nagar, Near Scheme 54",
        "title": "Severe road craters and asphalt breakup on main crossing",
        "description": "Heavy monsoon rains have damaged the road with deep potholes causing motorcycle accidents. PWD / Nagar Nigam road repair required urgently.",
        "multimodal_type": "photo",
        "evidence_verified": True
    }
    response = client.post("/api/grievance/submit", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "ticket_id" in data
    assert data["auth_id_masked"] == "XXXX-XXXX-5544"
    assert "Public Works Department" in data["department"]
    assert data["escalation_level"] == 1
    assert data["sla_days_total"] == 7
    assert data["sla_days_remaining"] == 7

def test_grievance_deduplication():
    payload1 = {
        "citizen_name": "Rohan Sharma",
        "auth_type": "pan",
        "auth_id": "ABCDE1234F",
        "district": "Jabalpur",
        "region_type": "urban",
        "title": "Severe drinking water pipeline contamination and sewage leak",
        "description": "Municipal drinking water pipeline has burst and is mixing with raw sewage pipeline.",
        "multimodal_type": "text"
    }
    r1 = client.post("/api/grievance/submit", json=payload1)
    assert r1.status_code == 200
    parent_id = r1.json()["ticket_id"]

    # Second complaint with same issue in Jabalpur
    payload2 = {
        "citizen_name": "Pooja Patel",
        "auth_type": "aadhaar",
        "auth_id": "1122-3344-5566",
        "district": "Jabalpur",
        "region_type": "urban",
        "title": "Drinking water pipeline contamination with sewage burst",
        "description": "Drinking water supply contaminated with dirty sewage leak across ward.",
        "multimodal_type": "text"
    }
    r2 = client.post("/api/grievance/submit", json=payload2)
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["is_duplicate"] is True
    assert data2["duplicate_of_ticket_id"] == parent_id

def test_grievance_3_tier_escalation():
    # Submit ticket
    submit_res = client.post("/api/grievance/submit", json={
        "citizen_name": "Deepak Chouhan",
        "auth_type": "aadhaar",
        "auth_id": "5566-7788-9900",
        "district": "Bhopal",
        "region_type": "urban",
        "title": "Transformer sparking with live dangerous wires hanging near school",
        "description": "100 KVA electricity transformer caught fire with spark and live wires hanging over pavement.",
        "multimodal_type": "photo"
    })
    ticket_id = submit_res.json()["ticket_id"]

    # Level 1 -> Level 2 (Collector)
    esc_l2 = client.post(f"/api/grievance/{ticket_id}/escalate", json={
        "target_level": 2,
        "reason": "Department failed to resolve within 7-Day SLA"
    })
    assert esc_l2.status_code == 200
    l2_data = esc_l2.json()
    assert l2_data["escalation_level"] == 2
    assert "District Collector" in l2_data["status"]

    # Level 2 -> Level 3 (CM Office)
    esc_l3 = client.post(f"/api/grievance/{ticket_id}/escalate", json={
        "target_level": 3,
        "reason": "Collector SLA breached, systemic public safety emergency"
    })
    assert esc_l3.status_code == 200
    l3_data = esc_l3.json()
    assert l3_data["escalation_level"] == 3
    assert "CM Office" in l3_data["status"]

def test_grievance_tracking_and_hotspots():
    list_res = client.get("/api/grievance/list")
    assert list_res.status_code == 200
    assert list_res.json()["total"] > 0
    sample_ticket = list_res.json()["grievances"][0]["ticket_id"]

    track_res = client.get(f"/api/grievance/track/{sample_ticket}")
    assert track_res.status_code == 200
    assert track_res.json()["ticket_id"] == sample_ticket

    hotspot_res = client.get("/api/grievance/hotspots")
    assert hotspot_res.status_code == 200
    assert len(hotspot_res.json()) > 0
