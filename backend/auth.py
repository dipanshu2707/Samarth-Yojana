"""Authority authentication and department directory.

Three seeded authority roles:
  Level 1 - Department Nodal Officer (shared desk mail for all 5 departments)
  Level 2 - District Collector
  Level 3 - CM Office Apex Redressal

Five citizen-facing departments share the Level-1 contact mail.
"""

import os
from typing import Dict, List, Optional

try:
    from dotenv import load_dotenv
    _here = os.path.dirname(os.path.abspath(__file__))
    load_dotenv(os.path.join(_here, ".env"))
    load_dotenv(os.path.join(_here, "..", ".env"))
except Exception:
    pass

LEVEL1_EMAIL = os.getenv("L1_NODAL_EMAIL", "kumardp2707@gmail.com").strip().lower()
LEVEL2_EMAIL = os.getenv("L2_COLLECTOR_EMAIL", "manilal2357@gmail.com").strip().lower()
LEVEL3_EMAIL = os.getenv("L3_CMO_EMAIL", "0585mt241001@pimrbhopal.ac.in").strip().lower()

DEPARTMENTS: List[Dict] = [
    {
        "id": "pwd",
        "name_en": "Public Works Department (Roads & Bridges)",
        "name_hi": "लोक निर्माण विभाग (सड़क एवं पुल)",
        "contact_email": LEVEL1_EMAIL,
        "authority_l1_en": "Executive Engineer, PWD Division",
        "authority_l1_hi": "कार्यपालन यंत्री, लोक निर्माण संभाग",
        "description_en": "Potholes, broken roads, culverts, bridges and footpaths",
        "description_hi": "गड्ढे, टूटी सड़कें, पुलिया, पुल एवं फुटपाथ",
    },
    {
        "id": "phe",
        "name_en": "Water Supply & PHE (Drinking Water)",
        "name_hi": "जल प्रदाय एवं लोक स्वास्थ्य यांत्रिकी",
        "contact_email": LEVEL1_EMAIL,
        "authority_l1_en": "Assistant Engineer, Water Supply & PHE",
        "authority_l1_hi": "सहायक यंत्री, जल प्रदाय / लोक स्वास्थ्य यांत्रिकी",
        "description_en": "Drinking water, pipelines, contamination, handpumps, taps",
        "description_hi": "पेयजल, पाइपलाइन, दूषित पानी, हैंडपंप, नल",
    },
    {
        "id": "discom",
        "name_en": "Energy & Power Distribution (DISCOM)",
        "name_hi": "ऊर्जा एवं विद्युत वितरण (डिस्कॉम)",
        "contact_email": LEVEL1_EMAIL,
        "authority_l1_en": "Assistant Engineer (Distribution), DISCOM",
        "authority_l1_hi": "सहायक यंत्री (वितरण), विद्युत वितरण कंपनी",
        "description_en": "Power cuts, transformers, loose wires, voltage issues",
        "description_hi": "बिजली कटौती, ट्रांसफार्मर, झूलते तार, वोल्टेज समस्या",
    },
    {
        "id": "urban",
        "name_en": "Urban Administration & Sanitation (Nagar Nigam)",
        "name_hi": "नगरीय प्रशासन एवं स्वच्छता (नगर निगम)",
        "contact_email": LEVEL1_EMAIL,
        "authority_l1_en": "Zonal Health Officer / Municipal Engineer",
        "authority_l1_hi": "जोनाधिकारी / स्वास्थ्य अधिकारी, नगर निगम",
        "description_en": "Garbage, drainage, sewer, street lights, cleanliness",
        "description_hi": "कचरा, नाली, सीवर, स्ट्रीट लाइट, सफाई",
    },
    {
        "id": "health",
        "name_en": "Public Health & Medical Services",
        "name_hi": "लोक स्वास्थ्य एवं चिकित्सा सेवाएं",
        "contact_email": LEVEL1_EMAIL,
        "authority_l1_en": "Chief Medical & Health Officer (CMHO)",
        "authority_l1_hi": "मुख्य चिकित्सा एवं स्वास्थ्य अधिकारी",
        "description_en": "Hospitals, doctors, medicines, ambulances, PHC/CHC",
        "description_hi": "अस्पताल, डॉक्टर, दवाई, एम्बुलेंस, स्वास्थ्य केंद्र",
    },
]

DEPT_BY_ID: Dict[str, Dict] = {d["id"]: d for d in DEPARTMENTS}

AUTHORITY_LEVELS = {
    1: {
        "level": 1,
        "title_en": "Department Nodal Officer",
        "title_hi": "विभागीय नोडल अधिकारी",
        "email": LEVEL1_EMAIL,
        "scope": "department",
    },
    2: {
        "level": 2,
        "title_en": "District Collector & Magistrate",
        "title_hi": "जिला कलेक्टर एवं दंडाधिकारी",
        "email": LEVEL2_EMAIL,
        "scope": "district",
    },
    3: {
        "level": 3,
        "title_en": "Chief Minister Office — Apex Redressal",
        "title_hi": "मुख्यमंत्री कार्यालय — सर्वोच्च निवारण",
        "email": LEVEL3_EMAIL,
        "scope": "state",
    },
}

# Seeded officer accounts. Passwords are intentionally simple for controlled
# presentation access; replace via environment in production.
USERS: Dict[str, Dict] = {
    LEVEL1_EMAIL: {
        "email": LEVEL1_EMAIL,
        "password": os.getenv("L1_PASSWORD", "nodal123"),
        "name": "RAM",
        "designation_en": "Executive Engineer (Nodal Desk)",
        "designation_hi": "कार्यपालन यंत्री (नोडल डेस्क)",
        "level": 1,
        "role": "dept_nodal",
        "departments": [d["id"] for d in DEPARTMENTS],
    },
    LEVEL2_EMAIL: {
        "email": LEVEL2_EMAIL,
        "password": os.getenv("L2_PASSWORD", "collector123"),
        "name": "Shyam",
        "designation_en": "District Collector & Magistrate",
        "designation_hi": "जिला कलेक्टर एवं दंडाधिकारी",
        "level": 2,
        "role": "collector",
        "departments": [d["id"] for d in DEPARTMENTS],
    },
    LEVEL3_EMAIL: {
        "email": LEVEL3_EMAIL,
        "password": os.getenv("L3_PASSWORD", "cmo123"),
        "name": "Jay",
        "designation_en": "CM Office — Special Redressal Task Force",
        "designation_hi": "मुख्यमंत्री कार्यालय — विशेष निवारण टास्क फोर्स",
        "level": 3,
        "role": "cmo_apex",
        "departments": [d["id"] for d in DEPARTMENTS],
    },
}


def get_user_public(email: str) -> Optional[Dict]:
    key = (email or "").strip().lower()
    u = USERS.get(key)
    if not u:
        return None
    return {
        "email": u["email"],
        "name": u["name"],
        "designation_en": u["designation_en"],
        "designation_hi": u["designation_hi"],
        "level": u["level"],
        "role": u["role"],
        "departments": u["departments"],
    }


def verify_login(email: str, password: str) -> Optional[Dict]:
    key = (email or "").strip().lower()
    u = USERS.get(key)
    if not u:
        return None
    if (password or "") != u["password"]:
        return None
    return get_user_public(key)


def make_token(email: str) -> str:
    return (email or "").strip().lower()


def get_user_from_token(token: str) -> Optional[Dict]:
    if not token:
        return None
    return get_user_public(token.strip().lower())


def can_view_grievance(user: Dict, grievance: Dict) -> bool:
    """Visibility rules: L1 sees only its selected desk department,
    L2/L3 see everything (state-wide monitoring)."""
    level = user.get("level", 1)
    if level >= 2:
        return True
    selected = user.get("selected_dept")
    if selected:
        return grievance.get("dept_id") == selected
    return True
