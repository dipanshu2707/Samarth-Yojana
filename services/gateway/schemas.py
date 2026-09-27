from typing import Optional, List
from pydantic import BaseModel, Field

class MatchRequest(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    residency: Optional[str] = None
    district: Optional[str] = None
    rural_or_urban: Optional[str] = None
    category: Optional[str] = None
    annual_family_income: Optional[float] = None
    education_level: Optional[str] = None
    class12_percentage: Optional[float] = None
    occupation: Optional[str] = None
    marital_status: Optional[str] = None
    birth_year: Optional[int] = None
    registered_at_anganwadi: Optional[bool] = None
    parents_income_tax_payer: Optional[bool] = None
    owns_agricultural_land_acres: Optional[float] = None
    owns_four_wheeler: Optional[bool] = None
    income_tax_payer: Optional[bool] = None
    is_ladli_behna_beneficiary: Optional[bool] = None
    is_homeless_or_kutcha_house: Optional[bool] = None
    excluded_from_pmay: Optional[bool] = None
    is_unorganised_worker_ward: Optional[bool] = None
    living_away_from_home: Optional[bool] = None
    no_hostel_available: Optional[bool] = None
    language: str = "en"

class SchemeMatch(BaseModel):
    scheme_id: str
    name: str
    confidence: str
    plain_language_reason: str
    benefits: str
    required_documents: List[str] = []
    official_portal: str
    missing_info_that_would_help: List[str] = []

class MatchResponse(BaseModel):
    matches: List[SchemeMatch] = []
    possible_but_unconfirmed: List[SchemeMatch] = []
    disclaimer: str = "This tool gives an informational estimate only. Confirm eligibility and apply on the scheme's official portal."

class DocumentCheckResponse(BaseModel):
    document_type_detected: str
    matches_expected_type: bool
    legibility: str
    flags: List[str] = []
    verdict: str
    confidence: str
    extracted_text_snippet: Optional[str] = None

# ==========================================
# MP CM Online Grievance Redressal Schemas
# ==========================================

class GrievanceAction(BaseModel):
    timestamp: str
    stage: str # "L1_FILED", "AI_TRIAGED", "L1_DEPARTMENT", "L2_COLLECTOR", "L3_CMO", "RESOLVED", "HUMAN_REVIEW"
    actor: str
    message: str
    evidence_url: Optional[str] = None

class GrievanceSubmitRequest(BaseModel):
    citizen_name: str
    auth_type: str = "aadhaar" # "aadhaar" | "pan"
    auth_id: str
    mobile: str = ""
    district: str = "Bhopal"
    block_or_ward: str = ""
    region_type: str = "urban" # "rural" | "urban"
    address: str = ""
    title: str
    description: str
    multimodal_type: str = "text" # "text" | "photo" | "voice" | "multimodal"
    photo_evidence_url: Optional[str] = None
    photo_evidence_preview: Optional[str] = None
    audio_memo_url: Optional[str] = None
    audio_transcript: Optional[str] = None
    evidence_verified: bool = True
    language: str = "en"

class GrievanceResponse(BaseModel):
    ticket_id: str
    citizen_name: str
    auth_type: str
    auth_id_masked: str
    mobile_masked: str
    district: str
    block_or_ward: str
    region_type: str # "rural" | "urban"
    address: str
    title: str
    description: str
    multimodal_type: str
    photo_evidence_url: Optional[str] = None
    audio_transcript: Optional[str] = None
    department: str
    department_hi: str
    target_authority: str
    target_authority_hi: str
    status: str
    status_hi: str
    priority: str # "Critical" | "High" | "Medium" | "Low"
    ai_confidence: float
    needs_human_review: bool
    is_duplicate: bool
    duplicate_of_ticket_id: Optional[str] = None
    duplicate_summary: Optional[str] = None
    co_complainant_count: int = 1
    hotspot_zone: bool
    hotspot_cluster_name: Optional[str] = None
    escalation_level: int # 1, 2, 3
    sla_days_total: int = 7
    sla_days_remaining: int
    sla_deadline: str
    created_at: str
    updated_at: str
    immutable: bool = True
    timeline: List[GrievanceAction] = []
    resolution_note: Optional[str] = None

class GrievanceEscalateRequest(BaseModel):
    target_level: Optional[int] = None # 2 or 3
    reason: Optional[str] = "7-Day Resolution SLA Expired without Departmental Redressal"

class GrievanceResolveRequest(BaseModel):
    officer_name: str
    officer_designation: str
    resolution_note: str
    evidence_url: Optional[str] = None

class HotspotItem(BaseModel):
    district: str
    total_complaints: int
    critical_count: int
    primary_category: str
    hotspot_intensity: str # "Severe" | "Elevated" | "Moderate"
    rural_count: int
    urban_count: int
    active_escalated_l2: int
    active_escalated_l3: int

