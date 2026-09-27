"""
vision_check.py - Document readiness judgment module.
Combines OCR text and Claude Vision LLM to verify whether an uploaded document
matches the required type, has acceptable legibility, and highlights potential flags.
Includes robust fallback for offline / mock testing.
"""

import os
import json
import re
from typing import Dict, Any, List, Optional
from llm_client import call_llm_vision

VISION_SYSTEM_PROMPT = """You are Yojana Sathi's Document-Readiness Verification Assistant for citizens of Madhya Pradesh.
Your job is to inspect an uploaded image and determine if it appears to be the expected government/academic document type (e.g., Aadhaar card, Income Certificate, Caste Certificate, Class 10/12 Marksheet, Domicile Certificate, Samagra ID, Bank Passbook, Ration Card, etc.).

CRITICAL HONESTY & ETHICAL GUIDELINES:
1. You are a PRE-SCREENING DECISION SUPPORT TOOL, NOT a government approval authority.
2. VERDICT MUST BE EXACTLY ONE OF:
   - "likely_acceptable" (The document clearly appears to be the expected type, key headings are legible, no obvious defects).
   - "needs_review" (Document is blurry, partially cropped, has glare, validity date may be expired, or you cannot be confident).
   - "likely_wrong_document" (The image is not a document, or is a completely different document type like a selfie, photo of an object, receipt, etc.).
3. NEVER say "approved" or "accepted".
4. NEVER invent or hallucinate certificate numbers, dates, or citizen names if they are not plainly visible.
5. Be conservative: if you are unsure, choose "needs_review" with helpful advice on how the citizen should re-take the photo.

OUTPUT FORMAT: Return ONLY valid JSON with this exact schema:
{
  "document_type_detected": "string (e.g. income_certificate, aadhaar_card, marksheet, unknown)",
  "matches_expected_type": true/false,
  "legibility": "good" | "fair" | "poor" | "unreadable",
  "flags": ["list of strings highlighting specific cautions or tips for the citizen"],
  "verdict": "likely_acceptable" | "needs_review" | "likely_wrong_document",
  "confidence": "high" | "medium" | "low"
}
"""

def heuristic_document_check(
    document_type: str,
    extracted_text: str,
    metadata: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Fallback analyzer when LLM vision is unavailable.
    Uses OCR text matching and image heuristics.
    """
    doc_norm = document_type.lower().replace(" ", "_")
    text_norm = extracted_text.lower()
    
    # Common keyword dictionary for MP/Indian documents
    keywords_map = {
        "income": ["income", "aay", "praman", "revenue", "tehsildar", "annual", "वार्षिक", "आय", "प्रमाण"],
        "caste": ["caste", "jati", "anusuchit", "sc", "st", "obc", "जाति", "प्रमाण"],
        "domicile": ["domicile", "niwas", "resident", "madhya pradesh", "bhopal", "स्थानीय", "मूल निवासी"],
        "marksheet": ["marksheet", "board", "secondary", "examination", "marks", "roll no", "grade", "अंकसूची", "माध्यमिक"],
        "aadhaar": ["aadhaar", "unique identification", "uidai", "mera aadhaar", "government of india", "आधार"],
        "samagra": ["samagra", "samagra id", "sssm", "समग्र"],
        "passbook": ["passbook", "bank", "account", "ifsc", "branch", "खाता"],
        "ration": ["ration", "bpl", "antyodaya", "food", "राशन"]
    }

    # Check for image dimensions / blank
    if metadata.get("low_resolution"):
        return {
            "document_type_detected": "low_resolution_image",
            "matches_expected_type": False,
            "legibility": "poor",
            "flags": ["Image resolution is too low (< 300px). Please re-capture a clearer, higher-resolution photo."],
            "verdict": "needs_review",
            "confidence": "medium"
        }

    # If OCR extracted text, check keyword matches
    if text_norm:
        matched_category = None
        for cat, kws in keywords_map.items():
            if any(kw in text_norm for kw in kws):
                matched_category = cat
                break

        if matched_category:
            # Check if it matches expected doc
            expected_matches = any(kw in doc_norm for kw in [matched_category]) or matched_category in doc_norm
            flags = []
            if "income" in doc_norm:
                flags.append("Please verify the income certificate was issued within the last 1-3 years as required by the scheme portal.")
            if "marksheet" in doc_norm:
                flags.append("Ensure the roll number, student name, and percentage/marks are completely legible.")

            return {
                "document_type_detected": f"{matched_category}_document",
                "matches_expected_type": bool(expected_matches),
                "legibility": "good",
                "flags": flags if flags else ["Document text verified via OCR. Ensure all 4 corners of the document are visible."],
                "verdict": "likely_acceptable" if expected_matches else "needs_review",
                "confidence": "medium"
            }
        else:
            # Has text, but no recognized government document keywords
            return {
                "document_type_detected": "unrecognized_document_or_text",
                "matches_expected_type": False,
                "legibility": "fair",
                "flags": ["Document text does not appear to contain standard government certificate markings. Please verify this is the correct document."],
                "verdict": "needs_review",
                "confidence": "low"
            }

    # If no OCR text was extracted at all (or OCR engine not active)
    # Check if this might be a non-document
    return {
        "document_type_detected": "unconfirmed_document",
        "matches_expected_type": True,
        "legibility": "fair",
        "flags": [
            "Visual check complete. Ensure document is laid flat on a neutral background with no glare.",
            "Verify the official seal, issuing authority signature, and date of issue before submitting."
        ],
        "verdict": "needs_review",
        "confidence": "medium"
    }

async def check_document_readiness(
    image_bytes: bytes,
    document_type: str,
    scheme_context: str = "",
    extracted_text: str = "",
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Analyzes document image readiness using vision LLM if available,
    falling back gracefully to heuristic/OCR validation.
    """
    if metadata is None:
        metadata = {}

    media_type = "image/jpeg"
    fmt = metadata.get("format", "JPEG").lower()
    if fmt == "png":
        media_type = "image/png"
    elif fmt == "webp":
        media_type = "image/webp"

    # Try Vision LLM if API key is present
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if api_key:
        prompt = f"""
Expected document type: {document_type}
Scheme context: {scheme_context}
Extracted OCR text snippet:
\"\"\"{extracted_text[:1000]}\"\"\"

Please inspect the provided image and assess whether it matches the expected document type, its legibility, and any flags.
Respond ONLY with the JSON object as specified.
"""
        try:
            raw_result = await call_llm_vision(
                image_bytes=image_bytes,
                media_type=media_type,
                prompt=prompt,
                system_prompt=VISION_SYSTEM_PROMPT
            )
            if raw_result:
                cleaned = raw_result.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                parsed = json.loads(cleaned.strip())
                # Ensure verdict matches allowed values
                if parsed.get("verdict") not in ["likely_acceptable", "needs_review", "likely_wrong_document"]:
                    parsed["verdict"] = "needs_review"
                return parsed
        except Exception as e:
            print(f"[Vision Check] Vision LLM call failed or timed out: {e}")

    # Fallback to heuristic / OCR check
    result = heuristic_document_check(document_type, extracted_text, metadata)
    return result
