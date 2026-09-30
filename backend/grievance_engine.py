"""Core engine for MP CM Online grievance redressal and 3-tier escalation.

Covers multimodal intake, regional routing, AI classification with
human-in-the-loop fallback, deduplication, hotspot ranking, SLA
escalation (L1 Department -> L2 Collector -> L3 CM Office), officer
workflow states (open / in_review / in_progress / resolved) and
approval requests between tiers.
"""

import datetime
import uuid
from typing import List, Dict, Any, Optional

try:
    from auth import DEPARTMENTS, DEPT_BY_ID, LEVEL1_EMAIL
except ImportError:  # pragma: no cover - direct script execution fallback
    DEPARTMENTS = []
    DEPT_BY_ID = {}
    LEVEL1_EMAIL = "kumardp2707@gmail.com"

DEPARTMENT_RULES = [
    {
        "id": "pwd",
        "name_en": "Public Works Department (Roads & Bridges)",
        "name_hi": "लोक निर्माण विभाग (सड़क एवं पुल)",
        "authority_l1_en": "Executive Engineer, PWD Division",
        "authority_l1_hi": "कार्यपालन यंत्री, लोक निर्माण संभाग",
        "keywords": ["road", "pothole", "bridge", "asphalt", "flyover", "highway", "culvert", "footpath",
                     "गड्ढा", "सड़क", "पुल", "डामर", "हाइवे", "मार्ग", "पुलिया"],
        "default_priority": "High",
    },
    {
        "id": "phe",
        "name_en": "Water Supply & PHE (Drinking Water)",
        "name_hi": "जल प्रदाय एवं लोक स्वास्थ्य यांत्रिकी",
        "authority_l1_en": "Assistant Engineer, Water Supply & PHE",
        "authority_l1_hi": "सहायक यंत्री, जल प्रदाय / लोक स्वास्थ्य यांत्रिकी",
        "keywords": ["water", "drinking water", "pipeline", "contamination", "leak", "tap", "borewell",
                     "handpump", "sewage", "पानी", "पेयजल", "पाइपलाइन", "गंदा पानी", "नल", "हैंडपंप", "सीवर"],
        "default_priority": "High",
    },
    {
        "id": "discom",
        "name_en": "Energy & Power Distribution (DISCOM)",
        "name_hi": "ऊर्जा एवं विद्युत वितरण (डिस्कॉम)",
        "authority_l1_en": "Assistant Engineer (Distribution), DISCOM",
        "authority_l1_hi": "सहायक यंत्री (वितरण), विद्युत वितरण कंपनी",
        "keywords": ["electricity", "power", "blackout", "transformer", "wire", "voltage", "current",
                     "spark", "outage", "बिजली", "ट्रांसफार्मर", "तार", "कटौती", "वोल्टेज", "करेंट"],
        "default_priority": "Critical",
    },
    {
        "id": "urban",
        "name_en": "Urban Administration & Sanitation (Nagar Nigam)",
        "name_hi": "नगरीय प्रशासन एवं स्वच्छता (नगर निगम)",
        "authority_l1_en": "Zonal Health Officer / Municipal Engineer",
        "authority_l1_hi": "जोनाधिकारी / स्वास्थ्य अधिकारी, नगर निगम",
        "keywords": ["garbage", "trash", "waste", "drainage", "drain", "sewer", "street light", "streetlight",
                     "cleanliness", "sanitation", "कचरा", "सफाई", "नाली", "सीवर", "स्ट्रीट लाइट", "गंदगी"],
        "default_priority": "Medium",
    },
    {
        "id": "health",
        "name_en": "Public Health & Medical Services",
        "name_hi": "लोक स्वास्थ्य एवं चिकित्सा सेवाएं",
        "authority_l1_en": "Chief Medical & Health Officer (CMHO)",
        "authority_l1_hi": "मुख्य चिकित्सा एवं स्वास्थ्य अधिकारी",
        "keywords": ["hospital", "doctor", "medicine", "ambulance", "phc", "chc", "nurse", "treatment",
                     "clinic", "vaccine", "अस्पताल", "डॉक्टर", "दवाई", "एम्बुलेंस", "स्वास्थ्य केंद्र", "इलाज"],
        "default_priority": "High",
    },
]

WORKFLOW_STATES = ("open", "in_review", "in_progress", "resolved")

WORKFLOW_LABEL_EN = {
    "open": "Open",
    "in_review": "In Review",
    "in_progress": "In Progress",
    "resolved": "Resolved",
}

WORKFLOW_LABEL_HI = {
    "open": "खुला",
    "in_review": "समीक्षाधीन",
    "in_progress": "कार्रवाई जारी",
    "resolved": "निराकृत",
}

# In-memory ticket store
GRIEVANCE_STORE: Dict[str, Dict[str, Any]] = {}


def normalize_mobile(mobile: str) -> str:
    digits = "".join(ch for ch in str(mobile or "") if ch.isdigit())
    if len(digits) > 10:
        digits = digits[-10:]
    return digits


def mask_auth_id(auth_type: str, auth_id: str) -> str:
    cleaned = (auth_id or "").replace(" ", "").replace("-", "")
    if (auth_type or "").lower() == "aadhaar":
        if len(cleaned) >= 4:
            return f"XXXX-XXXX-{cleaned[-4:]}"
        return "XXXX-XXXX-0000"
    if len(cleaned) >= 4:
        return f"XXXXXX{cleaned[-4:].upper()}"
    return "XXXXXX0000"


def mask_mobile(mobile: str) -> str:
    cleaned = normalize_mobile(mobile)
    if len(cleaned) >= 4:
        return f"+91-XXXXX-{cleaned[-4:]}"
    return "+91-XXXXX-0000"


def _dept_meta(dept_id: str) -> Optional[Dict[str, Any]]:
    for d in DEPARTMENT_RULES:
        if d["id"] == dept_id:
            return d
    if dept_id in DEPT_BY_ID:
        meta = DEPT_BY_ID[dept_id]
        for d in DEPARTMENT_RULES:
            if d["id"] == dept_id:
                return d
        return {
            "id": meta["id"],
            "name_en": meta["name_en"],
            "name_hi": meta["name_hi"],
            "authority_l1_en": meta.get("authority_l1_en", ""),
            "authority_l1_hi": meta.get("authority_l1_hi", ""),
            "keywords": [],
            "default_priority": "Medium",
        }
    return None


def classify_grievance(title: str, description: str, region_type: str):
    combined_text = f"{title or ''} {description or ''}".lower()

    if len((description or "").strip()) < 15 and not any(
        kw in combined_text for dept in DEPARTMENT_RULES for kw in dept["keywords"]
    ):
        return {
            "dept_id": "urban",
            "name_en": "Urban Administration & Sanitation (Nagar Nigam)",
            "name_hi": "नगरीय प्रशासन एवं स्वच्छता (नगर निगम)",
            "authority_l1_en": "L0 Triage Officer, MP CM Helpline Desk",
            "authority_l1_hi": "एल0 समीक्षा अधिकारी, सीएम हेल्पलाइन डेस्क",
            "priority": "Medium",
            "confidence": 0.52,
            "needs_human_review": True,
        }

    best_match = None
    max_score = 0

    for dept in DEPARTMENT_RULES:
        score = 0
        for kw in dept["keywords"]:
            if kw.lower() in combined_text:
                score += 1
        if region_type == "rural" and dept["id"] in ["pwd", "phe", "discom"]:
            score += 0.5
        elif region_type == "urban" and dept["id"] in ["urban", "discom", "health"]:
            score += 0.5
        if score > max_score:
            max_score = score
            best_match = dept

    if not best_match or max_score == 0:
        return {
            "dept_id": "urban",
            "name_en": "Public Grievance Redressal Cell",
            "name_hi": "लोक सेवा प्रबंधन एवं जन-शिकायत प्रकोष्ठ",
            "authority_l1_en": "District Public Grievance Officer",
            "authority_l1_hi": "जिला लोक शिकायत निवारण अधिकारी",
            "priority": "Medium",
            "confidence": 0.64,
            "needs_human_review": True,
        }

    priority = best_match["default_priority"]
    critical_triggers = ["danger", "hazard", "fire", "spark", "current", "collapse", "hospital",
                         "life", "poison", "burst", "sewage", "गंभीर", "आग", "करेंट", "जान", "खतरा", "मौत", "दुर्घटना"]
    if any(ct in combined_text for ct in critical_triggers):
        priority = "Critical"

    confidence = min(0.98, 0.82 + (max_score * 0.05))
    needs_review = confidence < 0.75

    return {
        "dept_id": best_match["id"],
        "name_en": best_match["name_en"],
        "name_hi": best_match["name_hi"],
        "authority_l1_en": best_match["authority_l1_en"],
        "authority_l1_hi": best_match["authority_l1_hi"],
        "priority": priority,
        "confidence": round(confidence, 2),
        "needs_human_review": needs_review,
    }


def check_deduplication(district: str, dept_id: str, title: str, description: str):
    words = set([w.lower() for w in f"{title or ''} {description or ''}".split() if len(w) > 3])
    for ticket_id, item in GRIEVANCE_STORE.items():
        if (item.get("district", "").lower() == (district or "").lower()
                and item.get("dept_id") == dept_id):
            existing_words = set([w.lower() for w in f"{item.get('title','')} {item.get('description','')}".split() if len(w) > 3])
            overlap = words.intersection(existing_words)
            if len(overlap) >= 3:
                return {
                    "is_duplicate": True,
                    "parent_ticket_id": ticket_id,
                    "summary": f"Similar issue already reported in {district} (Ticket #{ticket_id}). Merged into neighbourhood cluster.",
                }
    return {"is_duplicate": False, "parent_ticket_id": None, "summary": None}


def is_district_hotspot(district: str, dept_id: str) -> bool:
    count = sum(1 for item in GRIEVANCE_STORE.values() if item.get("district", "").lower() == (district or "").lower())
    return count >= 2


def create_grievance(data: Dict[str, Any], ticket_id: Optional[str] = None) -> Dict[str, Any]:
    ticket_num = ticket_id or f"MP-CMO-2026-{str(uuid.uuid4().int)[:5]}"
    if ticket_num in GRIEVANCE_STORE:
        return GRIEVANCE_STORE[ticket_num]
    now = datetime.datetime.now()
    now_str = now.strftime("%d %b %Y, %I:%M %p")
    sla_deadline = (now + datetime.timedelta(days=7)).strftime("%d %b %Y, %I:%M %p")

    requested_dept = (data.get("dept_id") or "").strip().lower()
    auto = classify_grievance(data.get("title", ""), data.get("description", ""), data.get("region_type", "urban"))

    if requested_dept and _dept_meta(requested_dept):
        meta = _dept_meta(requested_dept)
        classification = {
            "dept_id": meta["id"],
            "name_en": meta["name_en"],
            "name_hi": meta["name_hi"],
            "authority_l1_en": meta["authority_l1_en"],
            "authority_l1_hi": meta["authority_l1_hi"],
            "priority": auto.get("priority", meta.get("default_priority", "Medium")),
            "confidence": 0.97,
            "needs_human_review": False,
            "user_selected": True,
        }
    else:
        classification = dict(auto)
        classification["user_selected"] = False

    dedup = check_deduplication(data.get("district", "Bhopal"), classification["dept_id"],
                                data.get("title", ""), data.get("description", ""))
    hotspot_active = is_district_hotspot(data.get("district", "Bhopal"), classification["dept_id"])
    hotspot_name = f"{data.get('district')} {classification['name_en'].split('(')[0].strip()} Zone" if hotspot_active else None

    if classification["needs_human_review"]:
        status_en = "Flagged for Human Review (L0 Desk)"
        status_hi = "मानव समीक्षा हेतु चिह्नित (एल-0 डेस्क)"
        workflow = "in_review"
    else:
        status_en = "Level 1: Respective Department"
        status_hi = "स्तर 1: संबंधित विभाग समीक्षाधीन"
        workflow = "open"

    mobile_raw = normalize_mobile(data.get("mobile", ""))

    timeline = [
        {
            "timestamp": now_str,
            "stage": "L1_FILED",
            "actor": f"Citizen {data.get('citizen_name')}",
            "message": f"Grievance lodged via {(data.get('multimodal_type') or 'text').capitalize()} input. Identity authenticated via {(data.get('auth_type') or 'Aadhaar').upper()}. Assigned to {classification['name_en']}.",
        },
        {
            "timestamp": now_str,
            "stage": "AI_TRIAGED",
            "actor": "MP AI Grievance Engine v2.4",
            "message": f"Categorized to {classification['name_en']} with {int(classification['confidence']*100)}% confidence. Regional routing: {(data.get('region_type') or 'urban').upper()}.",
        },
    ]

    if dedup["is_duplicate"]:
        timeline.append({
            "timestamp": now_str,
            "stage": "DEDUPLICATED",
            "actor": "AI Deduplication Engine",
            "message": f"Duplicate detected. Linked to parent grievance #{dedup['parent_ticket_id']}.",
        })
        if dedup["parent_ticket_id"] in GRIEVANCE_STORE:
            GRIEVANCE_STORE[dedup["parent_ticket_id"]]["co_complainant_count"] += 1

    if hotspot_active:
        timeline.append({
            "timestamp": now_str,
            "stage": "HOTSPOT_ALERT",
            "actor": "Geographical Heatmap Engine",
            "message": f"High complaint volume detected in {data.get('district')} sector. Flagged on monitoring radar.",
        })

    record = {
        "ticket_id": ticket_num,
        "citizen_name": data.get("citizen_name"),
        "auth_type": data.get("auth_type", "aadhaar"),
        "auth_id_masked": mask_auth_id(data.get("auth_type", "aadhaar"), data.get("auth_id", "")),
        "mobile": mobile_raw,
        "mobile_masked": mask_mobile(mobile_raw),
        "citizen_email": (data.get("citizen_email") or "").strip().lower(),
        "district": data.get("district", "Bhopal"),
        "block_or_ward": data.get("block_or_ward", "Ward 1"),
        "region_type": data.get("region_type", "urban"),
        "address": data.get("address", ""),
        "title": data.get("title", ""),
        "description": data.get("description", ""),
        "multimodal_type": data.get("multimodal_type", "text"),
        "photo_evidence_url": data.get("photo_evidence_url") or data.get("photo_evidence_preview"),
        "audio_transcript": data.get("audio_transcript"),
        "audio_memo_url": data.get("audio_memo_url"),
        "dept_id": classification["dept_id"],
        "department": classification["name_en"],
        "department_hi": classification["name_hi"],
        "target_authority": classification["authority_l1_en"],
        "target_authority_hi": classification["authority_l1_hi"],
        "dept_contact_email": LEVEL1_EMAIL,
        "status": status_en,
        "status_hi": status_hi,
        "workflow_status": workflow,
        "priority": classification["priority"],
        "ai_confidence": classification["confidence"],
        "needs_human_review": classification["needs_human_review"],
        "dept_selected_by_user": classification.get("user_selected", False),
        "is_duplicate": dedup["is_duplicate"],
        "duplicate_of_ticket_id": dedup["parent_ticket_id"],
        "duplicate_summary": dedup["summary"],
        "co_complainant_count": 1,
        "hotspot_zone": hotspot_active,
        "hotspot_cluster_name": hotspot_name,
        "escalation_level": 1,
        "sla_days_total": 7,
        "sla_days_remaining": 7,
        "sla_deadline": sla_deadline,
        "created_at": now_str,
        "updated_at": now_str,
        "immutable": True,
        "timeline": timeline,
        "approval_requests": [],
        "email_log": [],
        "resolution_note": None,
        "resolution_evidence_url": None,
    }

    GRIEVANCE_STORE[ticket_num] = record
    return record


def log_email(record: Dict[str, Any], to_addr: str, result: Dict, subject: str) -> None:
    now_str = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    entry = {
        "timestamp": now_str,
        "to": to_addr,
        "provider": result.get("provider", "none"),
        "ok": bool(result.get("ok")),
        "error": result.get("error"),
        "subject": subject,
    }
    record.setdefault("email_log", []).append(entry)
    if result.get("ok"):
        record["timeline"].append({
            "timestamp": now_str,
            "stage": "EMAIL_SENT",
            "actor": "Mail dispatcher",
            "message": f"Email delivered to {to_addr} via {result.get('provider')}. Subject: {subject}",
        })
    else:
        record["timeline"].append({
            "timestamp": now_str,
            "stage": "EMAIL_FAILED",
            "actor": "Mail dispatcher",
            "message": f"Email to {to_addr} failed ({result.get('provider', 'none')}): {result.get('error', 'not configured')}",
        })
    _touch(record)


def _touch(record: Dict[str, Any]) -> None:
    record["updated_at"] = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")


def escalate_grievance(ticket_id: str, target_level: Optional[int] = None, reason: str = "",
                       escalated_by: str = "", designation: str = "") -> Dict[str, Any]:
    if ticket_id not in GRIEVANCE_STORE:
        raise KeyError(f"Ticket #{ticket_id} not found.")
    record = GRIEVANCE_STORE[ticket_id]
    current_level = record.get("escalation_level", 1)
    now_str = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    new_level = target_level if target_level else current_level + 1
    new_level = max(1, min(3, new_level))
    actor = escalated_by or f"Level {current_level} Desk"

    if new_level <= current_level:
        record["timeline"].append({
            "timestamp": now_str,
            "stage": "NOTE",
            "actor": actor,
            "message": f"Forward review noted. {reason or 'Case retained at current tier for further field action.'}",
        })
        _touch(record)
        return record

    if new_level == 2:
        record["escalation_level"] = 2
        record["status"] = "Level 2: District Collector (DM Desk)"
        record["status_hi"] = "स्तर 2: जिला कलेक्टर (डीएम डेस्क समीक्षा)"
        record["target_authority"] = f"District Collector & Magistrate, {record['district']}"
        record["target_authority_hi"] = f"जिला कलेक्टर एवं जिला दंडाधिकारी, {record['district']}"
        record["workflow_status"] = "in_progress"
        record["sla_days_remaining"] = 3
        record["timeline"].append({
            "timestamp": now_str,
            "stage": "L2_COLLECTOR",
            "actor": actor or f"District Collector Desk ({record['district']})",
            "message": f"Forwarded to Level 2 (District Collector). Reason: {reason or 'Department tier requested higher intervention'}. Show-cause review opened on {record['department']}.",
        })
    elif new_level == 3:
        record["escalation_level"] = 3
        record["status"] = "Level 3: CM Office Apex Redressal"
        record["status_hi"] = "स्तर 3: मुख्यमंत्री कार्यालय (सर्वोच्च समीक्षा)"
        record["target_authority"] = "Hon'ble Chief Minister Office (Special Task Force)"
        record["target_authority_hi"] = "माननीय मुख्यमंत्री कार्यालय (विशेष टास्क फोर्स)"
        record["priority"] = "Critical"
        record["workflow_status"] = "in_progress"
        record["sla_days_remaining"] = 1
        record["timeline"].append({
            "timestamp": now_str,
            "stage": "L3_CMO",
            "actor": actor or "Chief Minister Grievance Redressal Task Force",
            "message": f"Apex escalation to Level 3 (CM Office). {reason or 'Collector tier requested apex intervention'}. Direct review under MP Public Service Guarantee Act.",
        })
    if designation:
        record["timeline"][-1]["actor"] = f"{actor} ({designation})" if actor else designation
    _touch(record)
    return record


def update_workflow_status(ticket_id: str, workflow_status: str, officer_name: str,
                           officer_designation: str, remark: str = "") -> Dict[str, Any]:
    if ticket_id not in GRIEVANCE_STORE:
        raise KeyError(f"Ticket #{ticket_id} not found.")
    if workflow_status not in WORKFLOW_STATES:
        raise ValueError(f"Invalid workflow status '{workflow_status}'.")
    record = GRIEVANCE_STORE[ticket_id]
    if record.get("workflow_status") == "resolved" and workflow_status != "resolved":
        raise ValueError("Resolved tickets cannot be reopened from this desk.")
    now_str = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    record["workflow_status"] = workflow_status
    if workflow_status == "in_review":
        record["timeline"].append({
            "timestamp": now_str,
            "stage": "IN_REVIEW",
            "actor": f"{officer_name} ({officer_designation})",
            "message": remark or "Case taken up for detailed review. Field verification initiated.",
        })
    elif workflow_status == "in_progress":
        record["timeline"].append({
            "timestamp": now_str,
            "stage": "IN_PROGRESS",
            "actor": f"{officer_name} ({officer_designation})",
            "message": remark or "Field action started. Resolution work is in progress.",
        })
    elif workflow_status == "open":
        record["timeline"].append({
            "timestamp": now_str,
            "stage": "REOPENED_QUEUE",
            "actor": f"{officer_name} ({officer_designation})",
            "message": remark or "Case placed back in open queue for assignment.",
        })
    _touch(record)
    return record


def request_approval(ticket_id: str, requested_by: str, designation: str,
                     target_level: int, note: str) -> Dict[str, Any]:
    if ticket_id not in GRIEVANCE_STORE:
        raise KeyError(f"Ticket #{ticket_id} not found.")
    record = GRIEVANCE_STORE[ticket_id]
    now_str = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    entry = {
        "timestamp": now_str,
        "requested_by": requested_by,
        "designation": designation,
        "from_level": record.get("escalation_level", 1),
        "target_level": target_level,
        "note": note,
        "decision": "pending",
    }
    record.setdefault("approval_requests", []).append(entry)
    record["timeline"].append({
        "timestamp": now_str,
        "stage": "APPROVAL_REQUESTED",
        "actor": f"{requested_by} ({designation})",
        "message": f"Approval requested from Level {target_level} authority. Note: {note}",
    })
    _touch(record)
    return record


def respond_approval(ticket_id: str, index: int, decision: str, responder: str,
                     responder_designation: str, comment: str = "") -> Dict[str, Any]:
    if ticket_id not in GRIEVANCE_STORE:
        raise KeyError(f"Ticket #{ticket_id} not found.")
    record = GRIEVANCE_STORE[ticket_id]
    reqs = record.get("approval_requests", [])
    if not reqs or index < 0 or index >= len(reqs):
        raise KeyError("Approval request not found.")
    now_str = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    reqs[index]["decision"] = decision
    reqs[index]["responded_by"] = responder
    reqs[index]["response_comment"] = comment
    reqs[index]["responded_at"] = now_str
    record["timeline"].append({
        "timestamp": now_str,
        "stage": "APPROVAL_DECIDED",
        "actor": f"{responder} ({responder_designation})",
        "message": f"Approval {decision} on request from {reqs[index]['requested_by']}. {comment or ''}".strip(),
    })
    _touch(record)
    return record


def resolve_grievance(ticket_id: str, officer_name: str, officer_designation: str,
                      note: str, evidence_url: Optional[str] = None) -> Dict[str, Any]:
    if ticket_id not in GRIEVANCE_STORE:
        raise KeyError(f"Ticket #{ticket_id} not found.")
    record = GRIEVANCE_STORE[ticket_id]
    now_str = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    record["status"] = "Resolved"
    record["status_hi"] = "निराकृत (समाधान पूर्ण)"
    record["workflow_status"] = "resolved"
    record["resolution_note"] = note
    record["resolution_evidence_url"] = evidence_url
    record["sla_days_remaining"] = 0
    record["timeline"].append({
        "timestamp": now_str,
        "stage": "RESOLVED",
        "actor": f"{officer_name} ({officer_designation})",
        "message": f"Grievance resolved and verified: {note}",
        "evidence_url": evidence_url,
    })
    _touch(record)
    return record


def get_by_mobile(mobile: str) -> List[Dict[str, Any]]:
    needle = normalize_mobile(mobile)
    if not needle:
        return []
    out = [r for r in GRIEVANCE_STORE.values() if r.get("mobile") == needle]
    out.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return out


def get_hotspot_analytics() -> List[Dict[str, Any]]:
    district_counts: Dict[str, Dict[str, Any]] = {}
    for item in GRIEVANCE_STORE.values():
        d = item.get("district", "Unknown")
        if d not in district_counts:
            district_counts[d] = {
                "district": d,
                "total_complaints": 0,
                "critical_count": 0,
                "categories": {},
                "rural_count": 0,
                "urban_count": 0,
                "active_escalated_l2": 0,
                "active_escalated_l3": 0,
            }
        c = district_counts[d]
        c["total_complaints"] += 1
        if item.get("priority") == "Critical":
            c["critical_count"] += 1
        if item.get("region_type") == "rural":
            c["rural_count"] += 1
        else:
            c["urban_count"] += 1
        if item.get("escalation_level") == 2 and item.get("workflow_status") != "resolved":
            c["active_escalated_l2"] += 1
        elif item.get("escalation_level") == 3 and item.get("workflow_status") != "resolved":
            c["active_escalated_l3"] += 1
        dept = (item.get("department") or "General").split("(")[0].strip()
        c["categories"][dept] = c["categories"].get(dept, 0) + 1

    results = []
    for d, data in district_counts.items():
        top_cat = max(data["categories"].items(), key=lambda x: x[1])[0] if data["categories"] else "General"
        intensity = "Severe" if data["total_complaints"] >= 3 or data["critical_count"] >= 1 else "Elevated" if data["total_complaints"] >= 2 else "Moderate"
        results.append({
            "district": d,
            "total_complaints": data["total_complaints"],
            "critical_count": data["critical_count"],
            "primary_category": top_cat,
            "hotspot_intensity": intensity,
            "rural_count": data["rural_count"],
            "urban_count": data["urban_count"],
            "active_escalated_l2": data["active_escalated_l2"],
            "active_escalated_l3": data["active_escalated_l3"],
        })
    results.sort(key=lambda x: x["total_complaints"], reverse=True)
    return results


def init_seed_data():
    """Seed representative MP cases. Fixed ticket ids keep reseeds idempotent
    across backend restarts (persisted tickets are reused, never duplicated)."""

    if "MP-CMO-2026-SD001" not in GRIEVANCE_STORE:
        create_grievance({
            "citizen_name": "Ramesh Chandra Patel",
            "auth_type": "aadhaar",
            "auth_id": "4920-5821-9921",
            "mobile": "9826011223",
            "district": "Sehore",
            "block_or_ward": "Ashta Tehsil, Ward 4",
            "region_type": "rural",
            "address": "Gram Panchayat Siddiqganj, Mandi Road",
            "dept_id": "pwd",
            "title": "Severe craters and broken culvert on Mandi approach road",
            "description": "The main road connecting Siddiqganj Mandi has huge 2-foot potholes after monsoon. Tractor trolleys loaded with soybean are getting stuck and overturning. PWD division has not inspected.",
            "multimodal_type": "photo",
            "photo_evidence_preview": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60",
            "evidence_verified": True,
        }, ticket_id="MP-CMO-2026-SD001")

    if "MP-CMO-2026-SD002" not in GRIEVANCE_STORE:
        t2 = create_grievance({
            "citizen_name": "Sunita Verma",
            "auth_type": "aadhaar",
            "auth_id": "8812-3490-5120",
            "mobile": "9425098765",
            "district": "Bhopal",
            "block_or_ward": "Kolar Zone 18, Ward 82",
            "region_type": "urban",
            "address": "Bairagarh Chichali, Kolar Road, Bhopal",
            "dept_id": "phe",
            "title": "Severe contaminated muddy drinking water for 12 consecutive days",
            "description": "Sewage pipe burst mixing directly with PHE municipal drinking water line. Over 200 households affected, children falling ill with gastroenteritis. Filed multiple complaints with Nagar Nigam with no action.",
            "multimodal_type": "photo",
            "photo_evidence_preview": "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=600&auto=format&fit=crop&q=60",
            "evidence_verified": True,
        }, ticket_id="MP-CMO-2026-SD002")
        escalate_grievance(t2["ticket_id"], target_level=2,
                           reason="7-Day SLA expired without water quality restoration by municipal desk.",
                           escalated_by="RAM", designation="Executive Engineer (Nodal Desk)")

    if "MP-CMO-2026-SD003" not in GRIEVANCE_STORE:
        t3 = create_grievance({
            "citizen_name": "Vikram Joshi",
            "auth_type": "pan",
            "auth_id": "BNRPJ8912K",
            "mobile": "9179043210",
            "district": "Ujjain",
            "block_or_ward": "Tarana Block, Gram Nanakheda",
            "region_type": "rural",
            "address": "Nanakheda Krishi Upaj Feeder, Ujjain",
            "dept_id": "discom",
            "title": "100 KVA agricultural transformer burnt - 4 villages without electricity for 16 days",
            "description": "High voltage surge caused 100 KVA distribution transformer to explode with spark danger. Standing wheat crop irrigation halted completely. DISCOM local JE has not replaced the unit.",
            "multimodal_type": "voice",
            "audio_transcript": "हमारे तराना ब्लॉक में 16 दिन से 100 केवी का ट्रांसफार्मर जला पड़ा है। गेहूं की फसल सूख रही है और बिजली कंपनी कोई सुनवाई नहीं कर रही है। कृपया तुरंत हस्तक्षेप करें।",
            "evidence_verified": True,
        }, ticket_id="MP-CMO-2026-SD003")
        escalate_grievance(t3["ticket_id"], target_level=2, reason="Level 1 SLA elapsed. Local replacement pending.",
                           escalated_by="RAM", designation="Executive Engineer (Nodal Desk)")
        escalate_grievance(t3["ticket_id"], target_level=3, reason="Collector deadline breached. Crop damage emergency.",
                           escalated_by="Shyam", designation="District Collector & Magistrate")

    if "MP-CMO-2026-SD004" not in GRIEVANCE_STORE:
        t4 = create_grievance({
            "citizen_name": "Meena Kushwaha",
            "auth_type": "aadhaar",
            "auth_id": "7712-4401-2098",
            "mobile": "9893055443",
            "district": "Gwalior",
            "block_or_ward": "Lashkar Ward 14",
            "region_type": "urban",
            "address": "Near Maharaj Bada, Gwalior",
            "dept_id": "urban",
            "title": "Overflowing garbage dump and blocked drain near market road",
            "description": "Large garbage heap unattended for 9 days near Lashkar market. Drain water overflowing onto footpath, foul smell across shops, mosquito breeding. Needs urgent sanitation drive.",
            "multimodal_type": "photo",
            "photo_evidence_preview": "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600&auto=format&fit=crop&q=60",
            "evidence_verified": True,
        }, ticket_id="MP-CMO-2026-SD004")
        update_workflow_status(t4["ticket_id"], "in_review", "RAM", "Nagar Nigam Gwalior",
                               "Sanitation inspector deputed. Photographs verified, cleanup crew scheduled.")

    if "MP-CMO-2026-SD005" not in GRIEVANCE_STORE:
        t5 = create_grievance({
            "citizen_name": "Asha Bairagi",
            "auth_type": "aadhaar",
            "auth_id": "3190-6721-8841",
            "mobile": "9755012398",
            "district": "Indore",
            "block_or_ward": "Ward 22, Vijay Nagar",
            "region_type": "urban",
            "address": "Scheme 78, Near PHC Vijay Nagar",
            "dept_id": "health",
            "title": "PHC doctor absent for a week, medicine stock exhausted",
            "description": "Primary health centre opens late and the posted doctor has been absent for 7 days. Basic fever and ORS medicines are out of stock. Patients are being turned away daily.",
            "multimodal_type": "text",
            "evidence_verified": True,
        }, ticket_id="MP-CMO-2026-SD005")
        update_workflow_status(t5["ticket_id"], "in_progress", "RAM", "CMHO Indore",
                               "Locum doctor deputed. Emergency medicine indent raised with district store.")

    if "MP-CMO-2026-SD006" not in GRIEVANCE_STORE:
        create_grievance({
            "citizen_name": "Devendra Meena",
            "auth_type": "aadhaar",
            "auth_id": "3190-6721-8842",
            "mobile": "9826011223",
            "district": "Sehore",
            "block_or_ward": "Ashta Tehsil, Ward 4",
            "region_type": "rural",
            "address": "Siddiqganj Mandi Road outer section",
            "dept_id": "pwd",
            "title": "Road to Mandi full of deep potholes and craters broken",
            "description": "Soybean harvest trucks cannot cross Siddiqganj Mandi road due to damaged asphalt and big potholes. Need urgent PWD repair.",
            "multimodal_type": "photo",
            "photo_evidence_preview": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60",
            "evidence_verified": True,
        }, ticket_id="MP-CMO-2026-SD006")


init_seed_data()
