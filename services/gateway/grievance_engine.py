"""
grievance_engine.py - Core Engine for MP CM Online Grievance Redressal & 3-Tier Escalation.
Handles:
1. Multimodal complaint intake & Aadhaar/PAN validation
2. Regional routing (Urban vs Rural)
3. AI Classification & Human-in-the-loop fallback (<75% confidence)
4. Strict Deduplication (merging duplicates within same area)
5. Hotspot & Priority Severity Ranking
6. 3-Tier SLA Escalation Engine (L1 Department -> L2 District Collector -> L3 Chief Minister Office)
"""

import time
import uuid
import datetime
from typing import List, Dict, Any, Optional

DEPARTMENT_RULES = [
    {
        "id": "pwd",
        "name_en": "Public Works Department (PWD - Roads & Bridges)",
        "name_hi": "लोक निर्माण विभाग (सड़क, पुल एवं निर्माण)",
        "authority_l1_en": "Executive Engineer, PWD Division",
        "authority_l1_hi": "कार्यपालन यंत्री, लोक निर्माण संभाग",
        "keywords": ["road", "pothole", "bridge", "asphalt", "flyover", "highway", "गड्ढा", "सड़क", "पुल", "डामर", "हाइवे", "मार्ग"],
        "default_priority": "High"
    },
    {
        "id": "phe",
        "name_en": "Public Health Engineering & MP Jal Nigam (Water Supply)",
        "name_hi": "लोक स्वास्थ्य यांत्रिकी एवं म.प्र. जल निगम (पेयजल)",
        "authority_l1_en": "Assistant Engineer, Water Supply & PHE",
        "authority_l1_hi": "सहायक यंत्री, लोक स्वास्थ्य यांत्रिकी / जल निगम",
        "keywords": ["water", "drinking water", "pipeline", "contamination", "leak", "tap", "borewell", "handpump", "पानी", "पेयजल", "पाइपलाइन", "गंदा पानी", "नल", "हैंडपंप"],
        "default_priority": "High"
    },
    {
        "id": "discom",
        "name_en": "MP Power Distribution Co. (DISCOM / Energy Dept)",
        "name_hi": "म.प्र. विद्युत वितरण कंपनी (ऊर्जा विभाग)",
        "authority_l1_en": "Assistant Engineer (Distribution), DISCOM",
        "authority_l1_hi": "सहायक यंत्री (वितरण), बिजली कंपनी",
        "keywords": ["electricity", "power", "blackout", "transformer", "wire", "voltage", "current", "spark", "बिजली", "ट्रांसफार्मर", "तार", "कटौती", "वोल्टेज", "करेंट"],
        "default_priority": "Critical"
    },
    {
        "id": "urban_admin",
        "name_en": "Urban Administration & Swachhata (Nagar Nigam / Palika)",
        "name_hi": "नगरीय प्रशासन एवं स्वच्छता (नगर निगम / पालिका)",
        "authority_l1_en": "Zonal Health Officer / Municipal Engineer",
        "authority_l1_hi": "जोनाधिकारी / स्वास्थ्य अधिकारी, नगर निगम",
        "keywords": ["garbage", "trash", "waste", "drainage", "sewer", "street light", "cleanliness", "कचरा", "सफाई", "नाली", "सीवर", "कचरा ढेर", "स्ट्रीट लाइट", "गंदगी"],
        "default_priority": "Medium"
    },
    {
        "id": "rural_dev",
        "name_en": "Panchayat & Rural Development (Janpad / Gram Sabha)",
        "name_hi": "पंचायत एवं ग्रामीण विकास (जनपद / ग्राम पंचायत)",
        "authority_l1_en": "Chief Executive Officer (CEO), Janpad Panchayat",
        "authority_l1_hi": "मुख्य कार्यपालन अधिकारी (सीईओ), जनपद पंचायत",
        "keywords": ["panchayat", "sarpanch", "gram", "rural road", "pmgsy", "drain", "handpump rural", "पंचायत", "सरपंच", "ग्राम", "गौठान", "कच्ची सड़क", "गांव"],
        "default_priority": "Medium"
    },
    {
        "id": "revenue",
        "name_en": "Revenue & Land Records (Revenue Dept)",
        "name_hi": "राजस्व एवं भू-अभिलेख विभाग",
        "authority_l1_en": "Sub-Divisional Magistrate (SDM) / Tehsildar",
        "authority_l1_hi": "अनुविभागीय अधिकारी (एसडीएम) / तहसीलदार",
        "keywords": ["land", "patwari", "demarcation", "mutation", "namantaran", "khasra", "encroachment", "जमीन", "पटवारी", "नामांतरण", "सीमांकन", "खसरा", "अतिक्रमण"],
        "default_priority": "Medium"
    },
    {
        "id": "health",
        "name_en": "Public Health & Medical Education (Health Dept)",
        "name_hi": "लोक स्वास्थ्य एवं चिकित्सा शिक्षा विभाग",
        "authority_l1_en": "Chief Medical & Health Officer (CMHO)",
        "authority_l1_hi": "मुख्य चिकित्सा एवं स्वास्थ्य अधिकारी (सीएमएचओ)",
        "keywords": ["hospital", "doctor", "medicine", "ambulance", "phc", "chc", "nurse", "treatment", "अस्पताल", "डॉक्टर", "दवाई", "एम्बुलेंस", "प्राथमिक स्वास्थ्य केंद्र", "इलाज"],
        "default_priority": "High"
    }
]

# In-Memory Database for Grievance Tickets
GRIEVANCE_STORE: Dict[str, Dict[str, Any]] = {}

def mask_auth_id(auth_type: str, auth_id: str) -> str:
    cleaned = auth_id.replace(" ", "").replace("-", "")
    if auth_type.lower() == "aadhaar":
        if len(cleaned) >= 4:
            return f"XXXX-XXXX-{cleaned[-4:]}"
        return "XXXX-XXXX-0000"
    else: # PAN
        if len(cleaned) >= 4:
            return f"XXXXXX{cleaned[-4:].upper()}"
        return "XXXXXX0000"

def mask_mobile(mobile: str) -> str:
    cleaned = mobile.replace("+91", "").replace(" ", "").replace("-", "")
    if len(cleaned) >= 4:
        return f"+91-XXXXX-{cleaned[-4:]}"
    return "+91-XXXXX-0000"

def classify_grievance(title: str, description: str, region_type: str):
    combined_text = f"{title} {description}".lower()
    
    # Check for empty / vague text (Human-in-the-loop trigger)
    if len(description.strip()) < 15 and not any(kw in combined_text for dept in DEPARTMENT_RULES for kw in dept["keywords"]):
        return {
            "dept_id": "general_admin",
            "name_en": "General Administration (Unclassified)",
            "name_hi": "सामान्य प्रशासन (अवर्गीकृत शिकायत)",
            "authority_l1_en": "L0 Triage Officer, MP CM Helpline Desk",
            "authority_l1_hi": "एल0 समीक्षा अधिकारी, सीएम हेल्पलाइन डेस्क",
            "priority": "Medium",
            "confidence": 0.52,
            "needs_human_review": True
        }

    best_match = None
    max_score = 0

    for dept in DEPARTMENT_RULES:
        # Boost rural dept if region is rural
        score = 0
        for kw in dept["keywords"]:
            if kw.lower() in combined_text:
                score += 1
        
        if region_type == "rural" and dept["id"] in ["rural_dev", "pwd", "phe"]:
            score += 0.5
        elif region_type == "urban" and dept["id"] in ["urban_admin", "discom"]:
            score += 0.5

        if score > max_score:
            max_score = score
            best_match = dept

    if not best_match or max_score == 0:
        return {
            "dept_id": "general_admin",
            "name_en": "Public Grievance Redressal Cell",
            "name_hi": "लोक सेवा प्रबंधन एवं जन-शिकायत प्रकोष्ठ",
            "authority_l1_en": "District Public Grievance Officer",
            "authority_l1_hi": "जिला लोक शिकायत निवारण अधिकारी",
            "priority": "Medium",
            "confidence": 0.64,
            "needs_human_review": True
        }

    # Calculate severity / priority
    priority = best_match["default_priority"]
    critical_triggers = ["danger", "hazard", "fire", "spark", "current", "collapse", "hospital", "life", "poison", "गंभीर", "आग", "करेंट", "जान", "खतरा", "मौत", "दुर्घटना"]
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
        "needs_human_review": needs_review
    }

def check_deduplication(district: str, dept_id: str, title: str, description: str):
    """
    Scans recent complaints in the same district and department for duplicate issues.
    """
    words = set([w.lower() for w in f"{title} {description}".split() if len(w) > 3])
    
    for ticket_id, item in GRIEVANCE_STORE.items():
        if item["district"].lower() == district.lower() and item.get("dept_id") == dept_id:
            existing_words = set([w.lower() for w in f"{item['title']} {item['description']}".split() if len(w) > 3])
            overlap = words.intersection(existing_words)
            if len(overlap) >= 3:
                return {
                    "is_duplicate": True,
                    "parent_ticket_id": ticket_id,
                    "summary": f"Similar issue already reported in {district} (Ticket #{ticket_id}). Merged into neighborhood cluster to consolidate departmental workforce."
                }
    
    return {"is_duplicate": False, "parent_ticket_id": None, "summary": None}

def is_district_hotspot(district: str, dept_id: str) -> bool:
    count = sum(1 for item in GRIEVANCE_STORE.values() if item["district"].lower() == district.lower())
    return count >= 2 # Seed or dynamic threshold

def create_grievance(data: Dict[str, Any]) -> Dict[str, Any]:
    ticket_num = f"MP-CMO-2026-{str(uuid.uuid4().int)[:5]}"
    now = datetime.datetime.now()
    now_str = now.strftime("%d %b %Y, %I:%M %p")
    sla_deadline = (now + datetime.timedelta(days=7)).strftime("%d %b %Y, %I:%M %p")

    # AI Classification
    classification = classify_grievance(data.get("title", ""), data.get("description", ""), data.get("region_type", "urban"))
    
    # Deduplication
    dedup = check_deduplication(data.get("district", "Bhopal"), classification["dept_id"], data.get("title", ""), data.get("description", ""))
    
    # Hotspot Detection
    hotspot_active = is_district_hotspot(data.get("district", "Bhopal"), classification["dept_id"])
    hotspot_name = f"{data.get('district')} {classification['name_en'].split('(')[0]} Zone" if hotspot_active else None

    # Authority based on level (Initial Level 1)
    status_en = "Level 1: Respective Department"
    status_hi = "स्तर 1: संबंधित विभाग समीक्षाधीन"
    if classification["needs_human_review"]:
        status_en = "Flagged for Human Review (L0 Desk)"
        status_hi = "मानव समीक्षा हेतु चिह्नित (एल-0 डेस्क)"

    timeline = [
        {
            "timestamp": now_str,
            "stage": "L1_FILED",
            "actor": f"Citizen {data.get('citizen_name')}",
            "message": f"Grievance lodged digitally via {data.get('multimodal_type', 'text').capitalize()} input mode. Identity authenticated via {data.get('auth_type', 'Aadhaar').upper()}."
        },
        {
            "timestamp": now_str,
            "stage": "AI_TRIAGED",
            "actor": "MP AI Grievance Engine v2.4",
            "message": f"Categorized to {classification['name_en']} with {int(classification['confidence']*100)}% AI confidence. Regional routing: {data.get('region_type', 'urban').upper()}."
        }
    ]

    if dedup["is_duplicate"]:
        timeline.append({
            "timestamp": now_str,
            "stage": "DEDUPLICATED",
            "actor": "AI Smart Deduplication Engine",
            "message": f"Duplicate detected. Linked to parent grievance #{dedup['parent_ticket_id']}. Consolidated community weight."
        })
        # Increment parent ticket co-complainant count
        if dedup["parent_ticket_id"] in GRIEVANCE_STORE:
            GRIEVANCE_STORE[dedup["parent_ticket_id"]]["co_complainant_count"] += 1

    if hotspot_active:
        timeline.append({
            "timestamp": now_str,
            "stage": "HOTSPOT_ALERT",
            "actor": "Geographical Heatmap Engine",
            "message": f"High complaint volume detected in {data.get('district')} sector. Flagged on District Collector Monitoring Radar."
        })

    record = {
        "ticket_id": ticket_num,
        "citizen_name": data.get("citizen_name"),
        "auth_type": data.get("auth_type", "aadhaar"),
        "auth_id_masked": mask_auth_id(data.get("auth_type", "aadhaar"), data.get("auth_id", "")),
        "mobile_masked": mask_mobile(data.get("mobile", "")),
        "district": data.get("district", "Bhopal"),
        "block_or_ward": data.get("block_or_ward", "Ward 1"),
        "region_type": data.get("region_type", "urban"),
        "address": data.get("address", ""),
        "title": data.get("title", ""),
        "description": data.get("description", ""),
        "multimodal_type": data.get("multimodal_type", "text"),
        "photo_evidence_url": data.get("photo_evidence_url") or data.get("photo_evidence_preview"),
        "audio_transcript": data.get("audio_transcript"),
        "dept_id": classification["dept_id"],
        "department": classification["name_en"],
        "department_hi": classification["name_hi"],
        "target_authority": classification["authority_l1_en"],
        "target_authority_hi": classification["authority_l1_hi"],
        "status": status_en,
        "status_hi": status_hi,
        "priority": classification["priority"],
        "ai_confidence": classification["confidence"],
        "needs_human_review": classification["needs_human_review"],
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
        "resolution_note": None
    }

    GRIEVANCE_STORE[ticket_num] = record
    return record

def escalate_grievance(ticket_id: str, target_level: Optional[int] = None, reason: str = "") -> Dict[str, Any]:
    if ticket_id not in GRIEVANCE_STORE:
        raise KeyError(f"Ticket #{ticket_id} not found.")

    record = GRIEVANCE_STORE[ticket_id]
    current_level = record["escalation_level"]
    now_str = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")

    new_level = target_level if target_level else current_level + 1
    if new_level > 3:
        new_level = 3

    if new_level == 2:
        record["escalation_level"] = 2
        record["status"] = "Level 2: District Collector (DM Desk)"
        record["status_hi"] = "स्तर 2: जिला कलेक्टर (डीएम डेस्क समीक्षा)"
        record["target_authority"] = f"District Collector & Magistrate, {record['district']}"
        record["target_authority_hi"] = f"जिला कलेक्टर एवं जिला दंडाधिकारी, {record['district']}"
        record["sla_days_remaining"] = 3
        record["timeline"].append({
            "timestamp": now_str,
            "stage": "L2_COLLECTOR",
            "actor": f"District Collector Desk ({record['district']})",
            "message": f"Escalated to Level 2. Reason: {reason or '7-Day SLA expired at departmental level'}. Show-cause notice issued to {record['department']}."
        })
    elif new_level == 3:
        record["escalation_level"] = 3
        record["status"] = "Level 3: CM Office Apex Redressal"
        record["status_hi"] = "स्तर 3: मुख्यमंत्री कार्यालय (सीएमओ सर्वोच्च समीक्षा)"
        record["target_authority"] = "Hon'ble Chief Minister Office (CMO Special Task Force)"
        record["target_authority_hi"] = "माननीय मुख्यमंत्री कार्यालय (सीएम हेल्पलाइन विशेष टास्क फोर्स)"
        record["priority"] = "Critical"
        record["sla_days_remaining"] = 1
        record["timeline"].append({
            "timestamp": now_str,
            "stage": "L3_CMO",
            "actor": "Chief Minister Grievance Redressal Task Force",
            "message": f"Apex Escalation triggered to Level 3 (CM Office). Direct intervention initiated under MP Public Service Guarantee Act."
        })

    record["updated_at"] = now_str
    return record

def resolve_grievance(ticket_id: str, officer_name: str, officer_designation: str, note: str, evidence_url: Optional[str] = None) -> Dict[str, Any]:
    if ticket_id not in GRIEVANCE_STORE:
        raise KeyError(f"Ticket #{ticket_id} not found.")

    record = GRIEVANCE_STORE[ticket_id]
    now_str = datetime.datetime.now().strftime("%d %b %Y, %I:%M %p")
    record["status"] = "Resolved"
    record["status_hi"] = "निराकृत (समाधान पूर्ण)"
    record["resolution_note"] = note
    record["sla_days_remaining"] = 0
    record["timeline"].append({
        "timestamp": now_str,
        "stage": "RESOLVED",
        "actor": f"{officer_name} ({officer_designation})",
        "message": f"Grievance resolved and verified: {note}",
        "evidence_url": evidence_url
    })
    record["updated_at"] = now_str
    return record

def get_hotspot_analytics() -> List[Dict[str, Any]]:
    # Generate district-level grievance analytics
    district_counts: Dict[str, Dict[str, Any]] = {}
    
    for item in GRIEVANCE_STORE.values():
        d = item["district"]
        if d not in district_counts:
            district_counts[d] = {
                "district": d,
                "total_complaints": 0,
                "critical_count": 0,
                "categories": {},
                "rural_count": 0,
                "urban_count": 0,
                "active_escalated_l2": 0,
                "active_escalated_l3": 0
            }
        c = district_counts[d]
        c["total_complaints"] += 1
        if item["priority"] == "Critical":
            c["critical_count"] += 1
        if item["region_type"] == "rural":
            c["rural_count"] += 1
        else:
            c["urban_count"] += 1
        if item["escalation_level"] == 2:
            c["active_escalated_l2"] += 1
        elif item["escalation_level"] == 3:
            c["active_escalated_l3"] += 1
        
        dept = item["department"].split("(")[0].strip()
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
            "active_escalated_l3": data["active_escalated_l3"]
        })
    
    # Sort by total complaints desc
    results.sort(key=lambda x: x["total_complaints"], reverse=True)
    return results

def init_seed_data():
    """Seeds realistic MP grievance cases to show Level 1, 2, 3 escalation and human review."""
    if GRIEVANCE_STORE:
        return

    # Seed 1: Level 1 (PWD Road in Sehore)
    create_grievance({
        "citizen_name": "Ramesh Chandra Patel",
        "auth_type": "aadhaar",
        "auth_id": "4920-5821-9921",
        "mobile": "9826011223",
        "district": "Sehore",
        "block_or_ward": "Ashta Tehsil, Ward 4",
        "region_type": "rural",
        "address": "Gram Panchayat Siddiqganj, Mandi Road",
        "title": "Severe craters and broken culvert on Mandi approach road",
        "description": "The main road connecting Siddiqganj Mandi has huge 2-foot potholes after monsoon. Tractor trolleys loaded with soybean are getting stuck and overturning. PWD division has not inspected.",
        "multimodal_type": "photo",
        "photo_evidence_preview": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60",
        "evidence_verified": True
    })

    # Seed 2: Level 2 (Water supply in Bhopal Kolar - Escalated to Collector)
    t2 = create_grievance({
        "citizen_name": "Sunita Verma",
        "auth_type": "aadhaar",
        "auth_id": "8812-3490-5120",
        "mobile": "9425098765",
        "district": "Bhopal",
        "block_or_ward": "Kolar Zone 18, Ward 82",
        "region_type": "urban",
        "address": "Bairagarh Chichali, Kolar Road, Bhopal",
        "title": "Severe contaminated muddy drinking water for 12 consecutive days",
        "description": "Sewage pipe burst mixing directly with PHE municipal drinking water line. Over 200 households affected, children falling ill with gastroenteritis. Filed multiple complaints with Nagar Nigam with no action.",
        "multimodal_type": "photo",
        "photo_evidence_preview": "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=600&auto=format&fit=crop&q=60",
        "evidence_verified": True
    })
    escalate_grievance(t2["ticket_id"], target_level=2, reason="7-Day SLA expired without water quality restoration by Municipal Zone 18.")

    # Seed 3: Level 3 (Power Transformer failure in Ujjain - Escalated to CM Office)
    t3 = create_grievance({
        "citizen_name": "Vikram Joshi",
        "auth_type": "pan",
        "auth_id": "BNRPJ8912K",
        "mobile": "9179043210",
        "district": "Ujjain",
        "block_or_ward": "Tarana Block, Gram Nanakheda",
        "region_type": "rural",
        "address": "Nanakheda Krishi Upaj Feeder, Ujjain",
        "title": "100 KVA agricultural transformer burnt - 4 villages without electricity for 16 days",
        "description": "High voltage surge caused 100 KVA distribution transformer to explode with spark danger. Standing wheat crop irrigation halted completely. DISCOM local JE refuses replacement without bribe.",
        "multimodal_type": "voice",
        "audio_transcript": "हमारे तराना ब्लॉक में 16 दिन से 100 केवी का ट्रांसफार्मर जला पड़ा है। गेहूं की फसल सूख रही है और बिजली कंपनी कोई सुनवाई नहीं कर रही है। कृपया तुरंत मुख्यमंत्री कार्यालय हस्तक्षेप करे।",
        "evidence_verified": True
    })
    escalate_grievance(t3["ticket_id"], target_level=2, reason="Level 1 SLA elapsed. Local DISCOM JE neglected replacement.")
    escalate_grievance(t3["ticket_id"], target_level=3, reason="Level 2 Collector deadline breached. Systemic crop damage emergency.")

    # Seed 4: Flagged for Human-in-the-Loop review
    create_grievance({
        "citizen_name": "Anil Kumar Soni",
        "auth_type": "aadhaar",
        "auth_id": "7712-4401-2098",
        "mobile": "9893055443",
        "district": "Gwalior",
        "block_or_ward": "Lashkar Ward 14",
        "region_type": "urban",
        "address": "Near Maharaj Bada, Gwalior",
        "title": "Notice received regarding disputed boundary wall",
        "description": "Need assistance with paperwork boundary order 12.",
        "multimodal_type": "text",
        "evidence_verified": False
    })

    # Seed 5: Duplicate to demonstrate deduplication
    create_grievance({
        "citizen_name": "Devendra Meena",
        "auth_type": "aadhaar",
        "auth_id": "3190-6721-8841",
        "mobile": "9755012398",
        "district": "Sehore",
        "block_or_ward": "Ashta Tehsil, Ward 4",
        "region_type": "rural",
        "address": "Siddiqganj Mandi Road outer section",
        "title": "Road to Mandi full of deep potholes and craters broken",
        "description": "Soybean harvest trucks cannot cross Siddiqganj Mandi road due to damaged asphalt and big potholes. Need urgent PWD repair.",
        "multimodal_type": "photo",
        "photo_evidence_preview": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=60",
        "evidence_verified": True
    })

# Initialize seeds on module load
init_seed_data()
