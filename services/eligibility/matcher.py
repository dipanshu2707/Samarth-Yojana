"""
matcher.py - Pure Python eligibility rule engine for Yojana Sathi.
No LLM calls in this module. Evaluates citizen profile against schemes_dataset.json.
"""

from typing import Dict, Any, List, Tuple, Optional

def normalize_str(val: Optional[str]) -> str:
    if not val:
        return ""
    return str(val).strip().lower()

def is_rural(profile: Dict[str, Any]) -> bool:
    residency = normalize_str(profile.get("residency"))
    rural_urban = normalize_str(profile.get("rural_or_urban"))
    return "rural" in residency or rural_urban == "rural"

def is_mp_resident(profile: Dict[str, Any]) -> bool:
    residency = normalize_str(profile.get("residency"))
    return "madhya pradesh" in residency or "mp" in residency

def match_scheme(scheme: Dict[str, Any], profile: Dict[str, Any]) -> Tuple[str, List[str], List[str]]:
    """
    Evaluates profile against a single scheme.
    Returns:
        (status, reasons_for_match, missing_info)
        where status is 'pass', 'fail', or 'possible'
    """
    scheme_id = scheme["id"]
    elig = scheme.get("eligibility", {})
    reasons = []
    missing_info = []

    # 1. Residency check
    scheme_res = normalize_str(elig.get("residency"))
    prof_res = profile.get("residency")
    
    if "rural" in scheme_res:
        if prof_res is None and not profile.get("rural_or_urban"):
            missing_info.append("rural or urban residency in MP")
        elif not (is_mp_resident(profile) and is_rural(profile)):
            return "fail", [], []
        else:
            reasons.append("Domicile of rural Madhya Pradesh")
    elif "madhya pradesh" in scheme_res or "mp" in scheme_res or scheme.get("state") == "Madhya Pradesh":
        if prof_res is None:
            missing_info.append("Madhya Pradesh domicile status")
        elif not is_mp_resident(profile):
            return "fail", [], []
        else:
            reasons.append("Resident of Madhya Pradesh")

    # 2. Gender check
    scheme_gender = normalize_str(elig.get("gender"))
    prof_gender = normalize_str(profile.get("gender"))
    if scheme_gender and scheme_gender != "any":
        if not prof_gender:
            missing_info.append("gender")
        elif prof_gender != scheme_gender:
            return "fail", [], []
        else:
            reasons.append(f"Gender: {profile.get('gender')}")

    # 3. Age check
    age = profile.get("age")
    age_min = elig.get("age_min")
    age_max = elig.get("age_max")
    if age_min is not None or age_max is not None:
        if age is None:
            missing_info.append("age")
        else:
            if age_min is not None and age < age_min:
                return "fail", [], []
            if age_max is not None and age > age_max:
                return "fail", [], []
            reasons.append(f"Age {age} within allowable range")

    # 4. Category check
    allowed_categories = elig.get("category", [])
    if allowed_categories:
        allowed_cats_norm = [normalize_str(c) for c in allowed_categories]
        if "any" not in allowed_cats_norm:
            prof_cat = normalize_str(profile.get("category"))
            if not prof_cat:
                missing_info.append("social category (SC/ST/OBC/General/EWS)")
            elif prof_cat not in allowed_cats_norm:
                return "fail", [], []
            else:
                reasons.append(f"Social category: {profile.get('category')}")

    # 5. Income check
    max_income = elig.get("max_annual_family_income")
    annual_income = profile.get("annual_family_income")
    if max_income is not None:
        if annual_income is None:
            missing_info.append(f"annual family income (limit ₹{max_income:,})")
        elif annual_income > max_income:
            return "fail", [], []
        else:
            reasons.append(f"Annual family income within ₹{max_income:,} limit")

    # 6. Education level check
    allowed_edu = elig.get("education_level", [])
    prof_edu = normalize_str(profile.get("education_level"))
    if allowed_edu:
        allowed_edu_norm = [normalize_str(e) for e in allowed_edu]
        if "any" not in allowed_edu_norm:
            if not prof_edu:
                missing_info.append("education level")
            elif prof_edu not in allowed_edu_norm:
                return "fail", [], []
            else:
                reasons.append(f"Education level: {profile.get('education_level')}")

    # 7. Occupation check & Student requirements
    prof_occ = normalize_str(profile.get("occupation"))
    domain = scheme.get("domain", "")

    # Seekho Kamao: must be unemployed and NOT currently a full-time student
    if scheme_id == "mp_seekho_kamao":
        if prof_occ == "student":
            return "fail", [], []
        if prof_occ and prof_occ != "unemployed":
            return "fail", [], []
        if not prof_occ:
            missing_info.append("employment status (must be unemployed non-student)")
        else:
            reasons.append("Currently unemployed and completed eligible formal education")

    # Student scholarships: applicant must be pursuing education / student
    student_scholarship_ids = [
        "mp_post_matric_scst_obc",
        "mp_vikramaditya_scholarship",
        "mp_gaon_ki_beti",
        "mp_awas_sahayata",
        "mp_mmvy",
        "mp_mmjky_sambal",
        "central_nsp_st_fellowship",
        "central_nsp_general"
    ]
    if scheme_id in student_scholarship_ids:
        # If occupation is explicitly unemployed or employed and NOT studying, fail
        if prof_occ in ["unemployed", "employed", "business"] and prof_edu not in ["undergraduate", "postgraduate", "diploma", "class_11", "class_12", "phd", "professional"]:
            return "fail", [], []
        if prof_occ in ["unemployed"] and prof_edu == "iti":
            return "fail", [], []

    # 8. Marks check
    pct = profile.get("class12_percentage")
    if scheme_id in ["mp_vikramaditya_scholarship", "mp_gaon_ki_beti"]:
        if pct is not None:
            if pct < 60.0:
                return "fail", [], []
            reasons.append(f"Class 12 score ({pct}%) satisfies minimum 60% requirement")
        elif prof_edu in ["undergraduate", "postgraduate"]:
            missing_info.append("Class 12 percentage (min 60% required)")

    if scheme_id == "mp_mmvy":
        # Requires 70%+ for MP board, 85% for CBSE
        if pct is not None:
            if pct < 70.0:
                return "fail", [], []
            reasons.append(f"Merit score ({pct}%) clears MMVY cutoff")
        else:
            missing_info.append("Class 12 percentage (70%+ for MP Board / 85%+ CBSE required)")

    if scheme_id == "central_nsp_general":
        if pct is not None:
            if pct < 50.0:
                return "fail", [], []
        reasons.append("Covers central/state post-matric assistance on National Scholarship Portal")

    # 9. Scheme-Specific Hard Constraints & Dependencies

    # A. Ladli Laxmi Yojana
    if scheme_id == "mp_ladli_laxmi":
        # Girl born on/after 1 Jan 2006. Must be registered within 1 year of birth.
        if age is not None and age > 1:
            registered = profile.get("registered_at_anganwadi")
            if registered is False:
                return "fail", [], []
            elif registered is None:
                # Registration condition is a hard disqualifier if girl is older and never registered
                return "fail", [], []
        if profile.get("parents_income_tax_payer") is True:
            return "fail", [], []
        reasons.append("Eligible girl child registered under Ladli Laxmi guidelines")

    # B. Ladli Behna Yojana
    if scheme_id == "mp_ladli_behna":
        marital = normalize_str(profile.get("marital_status"))
        if marital:
            if marital not in ["married", "widowed", "divorced", "abandoned"]:
                return "fail", [], []
            reasons.append(f"Marital status ({marital}) satisfies women welfare eligibility")
        else:
            missing_info.append("marital status (must be married, widowed, divorced, or abandoned)")

        if profile.get("income_tax_payer") is True:
            return "fail", [], []
        if profile.get("owns_four_wheeler") is True:
            return "fail", [], []
        land = profile.get("owns_agricultural_land_acres")
        if land is not None and land > 5.0:
            return "fail", [], []

    # C. Ladli Behna Awas Yojana (Dependent Scheme!)
    if scheme_id == "mp_ladli_behna_awas":
        # Check basic Ladli Behna criteria (female, age 21-60, married/widowed/divorced/abandoned)
        marital = normalize_str(profile.get("marital_status"))
        if marital and marital not in ["married", "widowed", "divorced", "abandoned"]:
            return "fail", [], []

        is_lb_beneficiary = profile.get("is_ladli_behna_beneficiary")
        is_homeless = profile.get("is_homeless_or_kutcha_house")
        no_pmay = profile.get("excluded_from_pmay")

        if is_lb_beneficiary is False or is_homeless is False or no_pmay is False:
            return "fail", [], []
        
        # If any prerequisite is not explicitly True, it CANNOT be in 'matches'
        if not (is_lb_beneficiary is True and is_homeless is True and no_pmay is True):
            missing_info.extend([
                "Active Ladli Behna beneficiary confirmation",
                "Kutcha/damaged house or homelessness proof",
                "Confirmation of exclusion from PMAY list"
            ])
            return "possible", reasons, missing_info
        else:
            reasons.append("Active Ladli Behna beneficiary in need of housing support and excluded from PMAY")

    # D. Awas Sahayata (Hostel support)
    if scheme_id == "mp_awas_sahayata":
        living_away = profile.get("living_away_from_home")
        no_hostel = profile.get("no_hostel_available")
        if living_away is False or no_hostel is False:
            return "fail", [], []
        if living_away is None or no_hostel is None:
            missing_info.append("residence away from home and lack of allotted hostel accommodation")
            return "possible", reasons, missing_info
        reasons.append("Higher education away from home without institutional hostel seat")

    # E. Sambal Scheme
    if scheme_id == "mp_mmjky_sambal":
        is_sambal = profile.get("is_unorganised_worker_ward")
        if is_sambal is False:
            return "fail", [], []
        if is_sambal is None:
            missing_info.append("Parent's Sambal registration card / unorganised worker status")
            return "possible", reasons, missing_info
        reasons.append("Parent registered under MP Sambal unorganised worker portal")

    # F. National ST Fellowship
    if scheme_id == "central_nsp_st_fellowship":
        prof_cat = normalize_str(profile.get("category"))
        if prof_cat != "st":
            return "fail", [], []
        premier = profile.get("enrolled_in_premier_institution")
        if premier is False:
            return "fail", [], []
        if premier is None:
            missing_info.append("Admission confirmation at Ministry-notified premier institution")
            return "possible", reasons, missing_info
        reasons.append("ST student enrolled in notified premier institute")

    # G. Ayushman Bharat PM-JAY
    if scheme_id == "central_ayushman_bharat_pmjay":
        is_senior = age is not None and age >= 70
        has_ration_card = profile.get("has_bpl_or_secc_card")
        if is_senior:
            reasons.append("Universal senior citizen coverage under Ayushman Vay Vandana Card (Age 70+)")
        elif has_ration_card is True:
            reasons.append("Identified via SECC 2011 deprivation criteria or BPL/Antyodaya ration card")
        elif has_ration_card is False and not is_senior:
            return "fail", [], []
        else:
            missing_info.append("BPL / Antyodaya ration card or SECC 2011 status (or age 70+)")
            return "possible", reasons, missing_info

    # Final verdict calculation
    if missing_info:
        return "possible", reasons, missing_info
    
    return "pass", reasons, []

def evaluate_all(profile: Dict[str, Any], dataset: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates citizen profile against all schemes in the dataset.
    Returns:
    {
        "matches": [...],
        "possible_but_unconfirmed": [...],
        "disclaimer": "..."
    }
    """
    schemes = dataset.get("schemes", [])
    matches = []
    possible = []

    for scheme in schemes:
        status, reasons, missing = match_scheme(scheme, profile)
        
        item = {
            "scheme_id": scheme["id"],
            "name": scheme.get("name_en", scheme["id"]),
            "confidence": "high" if status == "pass" else "medium",
            "plain_language_reason": " ; ".join(reasons) if reasons else f"Potentially matches {scheme.get('name_en')}",
            "benefits": scheme.get("benefits", ""),
            "required_documents": scheme.get("required_documents", []),
            "official_portal": scheme.get("official_portal", ""),
            "missing_info_that_would_help": missing
        }

        if status == "pass":
            matches.append(item)
        elif status == "possible":
            possible.append(item)

    return {
        "matches": matches,
        "possible_but_unconfirmed": possible,
        "disclaimer": "This tool gives an informational estimate only. Confirm eligibility and apply on the scheme's official portal."
    }
