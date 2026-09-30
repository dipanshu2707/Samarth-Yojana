"""
explainer.py - Plain-language explanation layer for eligibility matches.
Generates personalized, respectful explanations in English or Hindi using Claude LLM,
with robust timeout and graceful fallback to rule-based explanations.
"""

import os
import json
import asyncio
from typing import Dict, Any, List
from llm_client import call_llm_text

SYSTEM_PROMPT = """You are Yojana Sathi's scheme eligibility explainer for citizens of Madhya Pradesh.
TASK: For each matched scheme provided below, write a warm, respectful, 1-2 sentence plain-language reason explaining why the citizen qualifies based on their profile.
CRITICAL RULES:
1. Only explain the match already determined below; do not introduce new eligibility claims or change eligibility decisions.
2. The language MUST be strictly the requested language (if 'hi', write in clear, natural Hindi in Devanagari script).
3. Never claim official approval or sanction. Use phrasing like 'You meet the eligibility criteria...' or 'आपकी जानकारी के अनुसार आप इस योजना के लिए पात्र हैं'.
4. Return ONLY valid JSON mapping scheme_id to the explanation string. Format:
{
  "scheme_id_1": "Explanation text here",
  "scheme_id_2": "Explanation text here"
}
"""

def generate_fallback_reason(scheme_id: str, scheme_name: str, language: str, reasons: str) -> str:
    """Generate a clean rule-based fallback when LLM is unavailable or times out."""
    if language == "hi":
        if reasons:
            return f"आपकी प्रोफ़ाइल ({reasons}) {scheme_name} के पात्रता मानदंडों से मेल खाती है।"
        return f"आपके द्वारा दी गई जानकारी के अनुसार आप {scheme_name} के लिए पात्र हैं।"
    else:
        if reasons:
            return f"You qualify for {scheme_name} based on: {reasons}."
        return f"You qualify for {scheme_name} based on your submitted profile details."

async def explain_matches(
    matches: List[Dict[str, Any]],
    profile: Dict[str, Any],
    language: str = "en"
) -> List[Dict[str, Any]]:
    """
    Enriches each match item with a personalized plain_language_reason.
    If LLM is unavailable or fails, gracefully falls back to templated explanations.
    """
    if not matches:
        return matches

    lang = "hi" if language == "hi" else "en"
    
    # Check if LLM API key exists
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        for m in matches:
            m["plain_language_reason"] = generate_fallback_reason(
                m["scheme_id"], m["name"], lang, m.get("plain_language_reason", "")
            )
        return matches

    # Build prompt with scheme context
    schemes_context = []
    for m in matches:
        schemes_context.append({
            "scheme_id": m["scheme_id"],
            "name": m["name"],
            "benefits": m.get("benefits", ""),
            "preliminary_reasons": m.get("plain_language_reason", "")
        })

    user_prompt = f"""
Language requested: {lang}
Citizen profile:
{json.dumps(profile, ensure_ascii=False, indent=2)}

Matched Schemes:
{json.dumps(schemes_context, ensure_ascii=False, indent=2)}

Please generate the JSON map of scheme_id -> plain-language explanation now:
"""

    try:
        raw_response = await asyncio.wait_for(
            call_llm_text(user_prompt, system_prompt=SYSTEM_PROMPT, temperature=0.2),
            timeout=8.0
        )
        if raw_response:
            cleaned = raw_response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            data = json.loads(cleaned.strip())
            if isinstance(data, dict):
                for m in matches:
                    sid = m["scheme_id"]
                    if sid in data and isinstance(data[sid], str) and data[sid].strip():
                        m["plain_language_reason"] = data[sid].strip()
                    else:
                        m["plain_language_reason"] = generate_fallback_reason(
                            sid, m["name"], lang, m.get("plain_language_reason", "")
                        )
                return matches
    except Exception as e:
        print(f"[Explainer] Fallback activated due to: {e}")

    # Fallback if LLM call returned None or failed parsing
    for m in matches:
        m["plain_language_reason"] = generate_fallback_reason(
            m["scheme_id"], m["name"], lang, m.get("plain_language_reason", "")
        )
    return matches
