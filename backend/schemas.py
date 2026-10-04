from typing import Optional, List, Dict, Any
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
    stage: str
    actor: str
    message: str
    evidence_url: Optional[str] = None

class ApprovalRequestItem(BaseModel):
    timestamp: str
    requested_by: str
    designation: str = ""
    from_level: int = 1
    target_level: int = 2
    note: str = ""
    decision: str = "pending"
    responded_by: Optional[str] = None
    response_comment: Optional[str] = None
    responded_at: Optional[str] = None

class EmailLogItem(BaseModel):
    timestamp: str
    to: str = ""
    provider: str = "none"
    ok: bool = False
    error: Optional[str] = None
    subject: Optional[str] = None

class GrievanceSubmitRequest(BaseModel):
    citizen_name: str
    auth_type: str = "aadhaar"
    auth_id: str
    mobile: str = ""
    citizen_email: Optional[str] = ""
    district: str = "Bhopal"
    block_or_ward: str = ""
    region_type: str = "urban"
    address: str = ""
    dept_id: Optional[str] = None
    title: str
    description: str
    multimodal_type: str = "text"
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
    mobile: str = ""
    mobile_masked: str
    citizen_email: str = ""
    district: str
    block_or_ward: str
    region_type: str
    address: str
    title: str
    description: str
    multimodal_type: str
    photo_evidence_url: Optional[str] = None
    audio_transcript: Optional[str] = None
    audio_memo_url: Optional[str] = None
    dept_id: str = ""
    department: str
    department_hi: str
    target_authority: str
    target_authority_hi: str
    dept_contact_email: Optional[str] = None
    status: str
    status_hi: str
    workflow_status: str = "open"
    priority: str
    ai_confidence: float
    needs_human_review: bool
    dept_selected_by_user: bool = False
    is_duplicate: bool
    duplicate_of_ticket_id: Optional[str] = None
    duplicate_summary: Optional[str] = None
    co_complainant_count: int = 1
    hotspot_zone: bool
    hotspot_cluster_name: Optional[str] = None
    escalation_level: int
    sla_days_total: int = 7
    sla_days_remaining: int
    sla_deadline: str
    created_at: str
    updated_at: str
    immutable: bool = True
    timeline: List[GrievanceAction] = []
    approval_requests: List[ApprovalRequestItem] = []
    email_log: List[EmailLogItem] = []
    resolution_note: Optional[str] = None
    resolution_evidence_url: Optional[str] = None

class GrievanceEscalateRequest(BaseModel):
    target_level: Optional[int] = None
    reason: Optional[str] = "Resolution SLA expired without departmental redressal"
    escalated_by: Optional[str] = ""
    designation: Optional[str] = ""

class GrievanceStatusUpdateRequest(BaseModel):
    workflow_status: str = Field(description="open | in_review | in_progress | resolved")
    officer_name: str
    officer_designation: str = ""
    remark: Optional[str] = ""

class GrievanceApprovalRequest(BaseModel):
    requested_by: str
    designation: str = ""
    target_level: int = 2
    note: str = ""

class GrievanceApprovalDecision(BaseModel):
    index: int = 0
    decision: str = "approved"
    responder: str
    responder_designation: str = ""
    comment: Optional[str] = ""

class GrievanceResolveRequest(BaseModel):
    officer_name: str
    officer_designation: str
    resolution_note: str
    evidence_url: Optional[str] = None

class EmailTestRequest(BaseModel):
    to: str

class HotspotItem(BaseModel):
    district: str
    total_complaints: int
    critical_count: int
    primary_category: str
    hotspot_intensity: str
    rural_count: int
    urban_count: int
    active_escalated_l2: int
    active_escalated_l3: int

class LoginRequest(BaseModel):
    email: str
    password: str
    dept_id: Optional[str] = None

class LoginResponse(BaseModel):
    token: str
    email: str
    name: str
    designation_en: str
    designation_hi: str
    level: int
    role: str
    departments: List[str] = []
    selected_dept: Optional[str] = None

class DepartmentItem(BaseModel):
    id: str
    name_en: str
    name_hi: str
    contact_email: str
    authority_l1_en: str
    authority_l1_hi: str
    description_en: str = ""
    description_hi: str = ""


# ==========================================
# Helpdesk AI chat schemas
# ==========================================

class HelpdeskHistoryItem(BaseModel):
    role: str = Field(description="user | assistant")
    content: str


class HelpdeskChatRequest(BaseModel):
    message: str
    language: str = "en"
    history: List[HelpdeskHistoryItem] = []
    profile: Optional[Dict[str, Any]] = None
    doc_context: Optional[Dict[str, Any]] = None


class HelpdeskChatResponse(BaseModel):
    reply: str
    intent: str = "in_scope"
    guardrail_triggered: bool = False
    suggested_schemes: List[str] = []
    model: str = ""
    fallback: bool = False
