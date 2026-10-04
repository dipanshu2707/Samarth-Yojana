"""
helpdesk.py - Helpdesk AI chat for Yojana Sathi + MP CM Online grievance portal.

- Proxies chat to OpenRouter (model: nvidia/nemotron-3-super-120b-a12b:free).
- API key NEVER leaves the backend: read from OPENROUTER_API_KEY env.
- Guardrails:
  1. Deterministic pre-filter (no LLM call) for clearly out-of-scope queries.
  2. Grounding system prompt: only 13 schemes in schemes_dataset.json +
     grievance filing/tracking/escalation + document readiness.
  3. Post-filter: if the model drifts (mentions inventing schemes), append disclaimer.
- Uploads + verification happen in the chat UI via /api/check-document;
  the verification JSON is passed back in as `doc_context` so the LLM can explain it.
- Eligibility: if caller passes a `profile` dict, we run matcher.evaluate_all
  in-process and inject the deterministic match list so the LLM cannot invent eligibility.
"""

import json
import os
import re
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple
from urllib.parse import unquote

import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"
TIMEOUT_SECONDS = 30.0
STREAM_TIMEOUT_SECONDS = 60.0
SEARCH_TIMEOUT_SECONDS = 10.0
UA_HEADER = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MPOnline-Helpdesk/1.0"}

# ------------------------------------------------------------------
# Scope definition: what this helpdesk is allowed to talk about.
# ------------------------------------------------------------------

IN_SCOPE_KEYWORDS = [
    # schemes / eligibility
    "yojana", "yojna", "scheme", "eligib", "ladli", "behna", "laxmi", "sambal",
    "scholarship", "mmvy", "medhavi", "gaon ki beti", "vikramaditya", "awas",
    "seekho", "kamao", "ayushman", "pm-jay", "pmjay", "nsp", "portal",
    "benefit", "benefits", "document", "aadhaar", "aadhar", "samagra",
    "domicile", "income", "caste", "marksheet", "passbook", "ration",
    "scholar", "stipend", "pension", "apply", "application",
    # grievance
    "grievance", "complaint", "shikayat", "ticket", "cm online", "cmo",
    "181", "helpline", "escalat", "officer", "collector", "nodal",
    "status", "track", "resolve", "hotspot", "district",
    # hindi
    "योजना", "पात्रता", "छात्रवृत्ति", "शिकायत", "टिकट", "दस्तावेज",
    "आधार", "समग्र", "आय", "जाति", "हेल्पलाइन", "लाड़ली", "लाडली",
    "सहायता", "आवेदन",
]

# Strong signals that the query is NOT about this app. Used for the
# deterministic pre-guardrail (no LLM call needed).
OUT_OF_SCOPE_PATTERNS = [
    r"\bignore\s+(all\s+|previous\s+|prior\s+|your\s+)?instructions\b",
    r"\bpretend\s+(you\s+are|to\s+be)\b",
    r"\bact\s+as\s+(?!.*(helpdesk|assistant for (mp|yojana)))\b.{0,20}\b(dan|jailbreak|evil|unrestricted)\b",
    r"\btell\s+me\s+a\s+(joke|story|poem|shayari)\b",
    r"\b(joke|shayari|story|poem)\b(?!(.*(scheme|yojana|grievance|complaint)))",
    r"\b(write|generate|debug|fix)\b.{0,30}\b(code|python|javascript|java|c\+\+|sql|function|program)\b",
    r"\b(python|javascript|typescript|react|leetcode|algorithm)\b.{0,20}\b(code|program|function|error|interview)\b",
    r"\b(homework|exam|assignment)\b",
    r"\b(recipe|cooking|biryani|curry)\b",
    r"\b(movie|film|actor|actress|netflix|cricket|football|ipl)\b",
    r"\b(stock|share price|crypto|bitcoin|investment advice)\b",
    r"\b(election (prediction|result|winner)|who will win|vote for)\b",
    r"\b(joke|shayari|story|poem) (?!.*(scheme|yojana))\b",
    r"\b(weather|horoscope|astrology)\b",
    r"\b(medical (diagnosis|prescription)|disease treatment|dosage|treatment for (diabetes|cancer|fever))\b",
    r"\b(hack|crack|bypass|jailbreak|prompt injection|wifi\s*(hack|password))\b",
]

OUT_OF_SCOPE_COMPILED = [re.compile(p, re.IGNORECASE) for p in OUT_OF_SCOPE_PATTERNS]


def classify_scope(message: str) -> str:
    """Return 'in_scope' | 'out_of_scope' | 'ambiguous' without any LLM call."""
    text = (message or "").strip()
    if not text:
        return "ambiguous"
    low = text.lower()
    if any(k in low for k in IN_SCOPE_KEYWORDS):
        return "in_scope"
    for rx in OUT_OF_SCOPE_COMPILED:
        if rx.search(text):
            return "out_of_scope"
    # Very short generic greetings are in-scope (we greet + redirect to help).
    if re.fullmatch(r"(hi+|hello+|hey+|namaste|namaskar|ram ram)[!. ]*", low):
        return "in_scope"
    # Generic small-talk / open-ended questions with no app keywords -> out of scope.
    if len(low.split()) <= 12:
        generic = [
            "who are you", "what can you do", "help me", "tell me something",
            "what is the", "who is the", "capital of", "meaning of life",
            "sing a", "draw a", "translate",
        ]
        if any(g in low for g in generic):
            return "out_of_scope"
    return "ambiguous"


def refusal_text(language: str) -> str:
    if language == "hi":
        return (
            "मैं इस विषय में मदद नहीं कर सकता — मैं केवल MP योजना साथी (13 MP/केंद्रीय योजनाओं की पात्रता, "
            "लाभ, दस्तावेज़) और MP CM Online जन-शिकायत (शिकायत दर्ज/ट्रैक, टिकट, 181 हेल्पलाइन) से जुड़े सवालों का उत्तर देता हूँ।\n\n"
            "कृपया इससे जुड़ा सवाल पूछें, जैसे:\n"
            "• \"मैं 19 साल की ग्रामीण OBC छात्रा हूँ — कौन सी छात्रवृत्ति मिल सकती है?\"\n"
            "• \"लाड़ली बहना के लिए कौन से दस्तावेज़ चाहिए?\"\n"
            "• \"शिकायत कैसे दर्ज करूँ / टिकट कैसे ट्रैक करूँ?\""
        )
    return (
        "I can't help with that — I only answer questions about MP Yojana Sathi "
        "(eligibility, benefits and documents for the 13 MP/Central schemes in this app) "
        "and MP CM Online grievances (filing/tracking complaints, tickets, 181 helpline).\n\n"
        "Please ask something relevant, for example:\n"
        "• \"I am a 19-year-old rural OBC student — which scholarships can I get?\"\n"
        "• \"Which documents are needed for Ladli Behna?\"\n"
        "• \"How do I file / track a complaint?\""
    )


SYSTEM_PROMPT = """You are the Helpdesk AI for the MPOnline citizen app, which has exactly TWO services:

1) Yojana Sathi — eligibility + document pre-screening for these schemes ONLY (never invent other schemes):
{schemes_block}

2) MP CM Online grievance redressal — file a complaint with photo/voice evidence, track by ticket ID or mobile, 3-level escalation (L1 nodal officer -> L2 collector -> L3 CM office), CM helpline 181 (toll-free).

STRICT GUARDRAILS — you MUST obey:
- Stay relevant to the two services above. If the user asks anything else (coding, homework, recipes, movies/sports, stocks/crypto, election predictions, jokes/stories, weather/horoscope, medical diagnosis, hacking, general trivia), REFUSE politely with exactly this shape: one line saying you only help with Yojana Sathi schemes + MP CM Online grievances, then 3 example relevant questions. Do not answer the out-of-scope question even partially.
- Never invent schemes, benefits, amounts, portals or eligibility cutoffs. Use ONLY the scheme facts provided in context. When unsure, say what is needed to confirm and point to the official portal.
- Never claim approval/sanction. Always add: informational estimate only — verify on the official portal before applying.
- Never ask for or repeat full Aadhaar numbers, bank account numbers or passwords. Mask any personal IDs.
- Answer in the user's language: 'hi' -> clear Hindi (Devanagari), else English. Keep answers short, warm, step-by-step.
- If document-verification JSON is provided, explain the verdict (likely_acceptable / needs_review / likely_wrong_document) and concrete re-take tips.
- If a deterministic eligibility match list is provided, present it faithfully; do not add or remove schemes.
"""


def schemes_summary_block(dataset: Optional[Dict[str, Any]], limit: int = 13) -> str:
    if not dataset or not dataset.get("schemes"):
        return "(scheme dataset unavailable — ask the user to use the Eligibility form)"
    lines = []
    for s in dataset["schemes"][:limit]:
        elig = s.get("eligibility", {}) or {}
        lines.append(
            f"- {s.get('id')}: {s.get('name_en')} | benefits: {s.get('benefits')} | "
            f"docs: {', '.join(s.get('required_documents', [])[:6])} | portal: {s.get('official_portal')} | "
            f"eligibility keys: residency={elig.get('residency')}, category={elig.get('category')}, "
            f"max_income={elig.get('max_annual_family_income')}, education={elig.get('education_level')}"
        )
    return "\n".join(lines)


def build_system_prompt(dataset: Optional[Dict[str, Any]]) -> str:
    return SYSTEM_PROMPT.replace("{schemes_block}", schemes_summary_block(dataset))


async def call_openrouter(
    messages: List[Dict[str, str]],
    dataset: Optional[Dict[str, Any]] = None,
    api_key: str = "",
    model: str = "",
    timeout: float = TIMEOUT_SECONDS,
    system_text: str = "",
) -> Tuple[Optional[str], Optional[str]]:
    """Call OpenRouter chat completions. Returns (reply_text, error)."""
    key = api_key or os.getenv("OPENROUTER_API_KEY", "")
    mdl = model or os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL) or DEFAULT_MODEL
    if not key:
        return None, "OPENROUTER_API_KEY is not configured on the server."
    payload = {
        "model": mdl,
        "messages": [{"role": "system", "content": system_text or build_system_prompt(dataset)}] + messages,
        "temperature": 0.3,
        "max_tokens": 900,
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost:5173"),
        "X-Title": os.getenv("OPENROUTER_APP_NAME", "MPOnline Helpdesk"),
    }
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(OPENROUTER_URL, headers=headers, json=payload)
            if r.status_code != 200:
                return None, f"OpenRouter {r.status_code}: {r.text[:300]}"
            data = r.json()
            choices = data.get("choices") or []
            if not choices:
                return None, "OpenRouter returned no choices."
            content = ((choices[0].get("message") or {}).get("content")) or ""
            content = content.strip()
            if not content:
                return None, "OpenRouter returned an empty reply."
            return content, None
    except Exception as e:
        return None, f"OpenRouter call failed: {e}"


def local_fallback_answer(
    message: str, language: str, matches: Optional[List[Dict[str, Any]]] = None
) -> str:
    """Deterministic offline answer used when the LLM is unreachable."""
    if language == "hi":
        base = (
            "AI सेवा अभी उपलब्ध नहीं है, लेकिन मैं नियम-आधारित जानकारी दे सकता हूँ:\n"
            "• पात्रता जानने के लिए 'योजना साथी' फॉर्म भरें (उम्र, लिंग, आय, शिक्षा)।\n"
            "• दस्तावेज़ जांच के लिए चैट में फोटो अपलोड करें।\n"
            "• शिकायत दर्ज/ट्रैक करने के लिए 'CM Online' टैब या 181 हेल्पलाइन का उपयोग करें।"
        )
    else:
        base = (
            "The AI service is temporarily unreachable, but here is rule-based guidance:\n"
            "• Fill the Yojana Sathi form (age, gender, income, education) for eligibility.\n"
            "• Upload a document photo in this chat for a readiness pre-check.\n"
            "• Use the CM Online tab or call 181 to file/track a grievance."
        )
    if matches:
        names = [f"{m.get('name')} ({m.get('scheme_id')})" for m in matches[:5]]
        extra = "\n\n" + ("मिलान योजनाएं:\n- " if language == "hi" else "Matched schemes:\n- ")
        return base + extra + "\n- ".join(names)
    return base + "\n\n" + (f"आपका सवाल: {message[:200]}" if language == "hi" else f"Your question: {message[:200]}")


# ==================================================================
# Agent layer: slot-filling, free web-search tool, streaming.
# The assistant behaves as an agent: it gathers missing facts with
# ONE follow-up question at a time (with tappable options), verifies
# facts against the dataset + free web search BEFORE answering, and
# streams thinking + tokens to the chat UI.
# ==================================================================

AGENT_RULES = """
AGENT BEHAVIOUR (you are an agent, not a Q&A bot):
- Read KNOWN FACTS below (extracted from the conversation). If the user asks about
  scheme eligibility/availability and a critical fact is listed under STILL MISSING,
  ask EXACTLY ONE short follow-up question for the first missing item — do not answer yet.
- End every follow-up question with an options tag so the app renders tappable chips:
  [[OPTIONS: option1 | option2 | option3]] (max 4, each under 25 chars, in the user's language).
  Never emit the OPTIONS tag when giving a final answer. Never emit any other [[...]] tags.
- Use VERIFIED FACTS (dataset + web search) given in context. If web results conflict with
  the dataset, prefer official .gov.in / .mp.gov.in sources and say so explicitly.
- Never ask for full Aadhaar numbers, bank account numbers, OTPs or passwords.
  Age, income, category, gender, marital status are fine to ask.
- If the question is procedural (how to file/track a complaint, helpline, document list),
  answer directly — no interrogation.
- Keep replies short and formatted with simple markdown (short lists, **bold** key terms).
- If STILL MISSING says all key facts are known, answer directly and NEVER ask a question.
- Never ask about a slot already listed under KNOWN FACTS.
"""

SEARCH_TRIGGERS = [
    "latest", "update", "new scheme", "new yojana", "2025", "2026",
    "last date", "deadline", "official", "portal", "news", "revised",
    "circular", "announce", "verify online", "check online",
    "नवीनतम", "ताजा", "आधिकारिक", "अंतिम तिथि", "घोषणा", "नई योजना",
]


def needs_search(message: str) -> bool:
    """Heuristic: does this turn need fresh web verification before answering?"""
    low = (message or "").lower()
    if classify_scope(message) == "out_of_scope":
        return False
    return any(t in low for t in SEARCH_TRIGGERS)


def _clean_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


async def web_search(query: str, count: int = 5) -> Dict[str, Any]:
    """Free browser-search tool. No API key, no signup.

    Tries DuckDuckGo Instant Answer API first, then scrapes
    lite.duckduckgo.com results. Always returns a dict; never raises.
    """
    results: List[Dict[str, str]] = []

    def _push(title: str, url: str, snippet: str):
        title, url, snippet = (title or "").strip(), (url or "").strip(), (snippet or "").strip()
        if not title or not url:
            return
        if not url.startswith("http"):
            return
        if any(r["url"] == url for r in results):
            return
        results.append({"title": title[:160], "url": url[:300], "snippet": snippet[:300]})

    try:
        async with httpx.AsyncClient(timeout=SEARCH_TIMEOUT_SECONDS, headers=UA_HEADER,
                                     follow_redirects=True) as client:
            # 1) Instant Answer API (JSON, no key).
            try:
                r = await client.get(
                    "https://api.duckduckgo.com/",
                    params={"q": query, "format": "json", "no_html": 1, "skip_disambig": 1},
                )
                if r.status_code == 200:
                    d = r.json()
                    if d.get("AbstractText") and d.get("AbstractURL"):
                        _push(d.get("Heading") or query, d["AbstractURL"], d["AbstractText"])
                    for t in (d.get("RelatedTopics") or [])[:count]:
                        if isinstance(t, dict) and t.get("Text") and t.get("FirstURL"):
                            _push(t["Text"].split(" - ")[0][:80] if " - " in t["Text"] else t["Text"][:80],
                                  t["FirstURL"], t["Text"])
            except Exception as e:
                print(f"[web_search] instant-answer failed: {e}")

            # 2) lite.duckduckgo.com scrape for real result links.
            if len(results) < 3:
                try:
                    r = await client.get("https://lite.duckduckgo.com/lite/", params={"q": query})
                    if r.status_code == 200:
                        html_text = r.text
                        for m in re.finditer(
                            r'<a[^>]*rel="nofollow"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
                            html_text, re.I | re.S,
                        ):
                            href, title = m.group(1), _clean_html(m.group(2))
                            real = href
                            um = re.search(r"uddg=([^&]+)", href)
                            if um:
                                try:
                                    real = unquote(um.group(1))
                                except Exception:
                                    pass
                            tail = html_text[m.end(): m.end() + 2500]
                            sm = re.search(
                                r"class=['\"]?result-snippet['\"]?[^>]*>(.*?)</td>",
                                tail, re.I | re.S,
                            )
                            snippet = _clean_html(sm.group(1)) if sm else ""
                            _push(title, real, snippet)
                            if len(results) >= count:
                                break
                except Exception as e:
                    print(f"[web_search] lite scrape failed: {e}")
    except Exception as e:
        print(f"[web_search] failed: {e}")
    return {"query": query, "results": results[:count]}


def format_search_block(search: Dict[str, Any]) -> str:
    res = (search or {}).get("results") or []
    if not res:
        return ""
    lines = [f"WEB SEARCH RESULTS for '{(search or {}).get('query', '')}' (prefer official .gov.in links):"]
    for i, r in enumerate(res, 1):
        lines.append(f"{i}. {r['title']} — {r['snippet']} ({r['url']})")
    return "\n".join(lines)


# ---------------- Profile slot extraction (deterministic) ----------------

def extract_profile_slots(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """Scan USER turns only (last wins) for eligibility facts. No LLM needed.

    Assistant messages are deliberately ignored: they contain questions and
    option lists ("...MP domicile? SC/ST/OBC?") that would otherwise pollute
    the slots with facts the user never stated.
    """
    slots: Dict[str, Any] = {}
    for m in messages or []:
        if (m.get("role") or "").strip().lower() != "user":
            continue
        text = (m.get("content") or "")
        low = text.lower()
        # Nukta-folded copy for Hindi matching (़ U+093C breaks \b boundaries).
        fold = low.replace("़", "")
        # age
        for pat in [r"(?:age|umr|umar|उम्र)[^\d]{0,10}(\d{1,3})",
                    r"(\d{1,3})\s*(?:years?\s*old|yrs?\s*old|saal|y\.o\.)",
                    r"\bi\s*am\s+(\d{1,3})\b",
                    r"\bi[' ]?m\s+(\d{1,3})\b"]:
            mt = re.search(pat, low)
            if mt:
                try:
                    age = int(mt.group(1))
                    if 0 <= age <= 110:
                        slots["age"] = age
                except Exception:
                    pass
        # gender (Hindi patterns use the nukta-folded text)
        if re.search(r"\b(female|woman|women|girl|lady|mahila|beti)\b|महिला|लडकी|बेटी", fold):
            slots["gender"] = "female"
        elif re.search(r"\b(male|man|men|boy|ladka|purush)\b|पुरुष|लडका", fold):
            slots["gender"] = "male"
        # income -> annual INR
        im = re.search(r"(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(lakh|lac|l|thousand|k)\b", low)
        if im:
            try:
                val = float(im.group(1).replace(",", ""))
                unit = im.group(2)
                mult = 100000 if unit in ("lakh", "lac", "l") else 1000
                slots["annual_family_income"] = int(val * mult)
            except Exception:
                pass
        else:
            im2 = re.search(r"income[^\d]{0,25}₹?\s*([\d,]{4,})", low)
            if im2:
                try:
                    slots["annual_family_income"] = int(im2.group(1).replace(",", ""))
                except Exception:
                    pass
        # category
        cm = re.search(r"\b(sc|st|obc|ews|general)\b", low)
        if cm:
            slots["category"] = cm.group(1).upper()
        # marital status (Hindi-safe via folded text)
        if re.search(r"widow|विधवा", fold):
            slots["marital_status"] = "widowed"
        elif re.search(r"divorce|talaq|तलाक", fold):
            slots["marital_status"] = "divorced"
        elif re.search(r"abandon", fold):
            slots["marital_status"] = "abandoned"
        elif re.search(r"unmarried|single|kunwari|अविवाहित", fold):
            slots["marital_status"] = "unmarried"
        elif re.search(r"married|shaadi|vivahit|विवाहित", fold):
            slots["marital_status"] = "married"
        # residency
        if re.search(r"madhya\s*pradesh|from\s+mp\b|\bmp\s*(online|cmo|domicile|ka|kaa|se|mein)\b|मध्य\s*प्रदेश", fold):
            slots["residency"] = "Madhya Pradesh"
        elif re.search(r"other\s*state|dusre?\s*rajya|uttar\s*pradesh|\bbihar\b|rajasthan|chhattisgarh|maharashtra|gujarat", low):
            slots["residency"] = "Other State"
        # education
        if re.search(r"phd|doctorate", low):
            slots["education_level"] = "phd"
        elif re.search(r"post.?graduate|\bpg\b|master'?s|m\.?tech|m\.?sc|m\.?a\b", low):
            slots["education_level"] = "postgraduate"
        elif re.search(r"undergraduate|\bug\b|graduate|graduation|college|b\.?tech|b\.?sc|b\.?a\b|b\.?com", low):
            slots["education_level"] = "undergraduate"
        elif re.search(r"\biti\b|vocational", low):
            slots["education_level"] = "iti"
        elif re.search(r"diploma|polytechnic", low):
            slots["education_level"] = "diploma"
        elif re.search(r"class\s*12|12th|intermediate|higher\s*secondary", low):
            slots["education_level"] = "class_12"
        elif re.search(r"class\s*11|11th", low):
            slots["education_level"] = "class_11"
        elif re.search(r"class\s*10|10th|matric|high\s*school", low):
            slots["education_level"] = "class_1_10"
    return slots


SLOT_ORDER = ["residency", "age", "gender", "annual_family_income", "category", "education_or_marital"]

SLOT_QUESTIONS = {
    "residency": {"en": "Are you a domicile of Madhya Pradesh?", "hi": "क्या आप मध्य प्रदेश के मूल निवासी हैं?"},
    "age": {"en": "What is your age?", "hi": "आपकी उम्र क्या है?"},
    "gender": {"en": "What is your gender?", "hi": "आपका लिंग क्या है?"},
    "annual_family_income": {"en": "What is your annual family income?", "hi": "आपकी वार्षिक पारिवारिक आय कितनी है?"},
    "category": {"en": "Which social category do you belong to?", "hi": "आप किस सामाजिक श्रेणी से हैं?"},
    "education_or_marital": {"en": "What is your education level or marital status?", "hi": "आपकी शिक्षा या वैवाहिक स्थिति क्या है?"},
}


def missing_slots(slots: Dict[str, Any]) -> List[str]:
    miss = []
    for key in ["residency", "age", "gender", "annual_family_income", "category"]:
        if key not in slots:
            miss.append(key)
    if "education_level" not in slots and "marital_status" not in slots:
        miss.append("education_or_marital")
    return miss


def format_slots_block(slots: Dict[str, Any], miss: List[str]) -> str:
    known = ", ".join(f"{k}={v}" for k, v in slots.items()) or "none yet"
    need = ", ".join(miss) or "none — all key facts known"
    return f"KNOWN FACTS about the user (do not re-ask these): {known}\nSTILL MISSING: {need}"


# ---------------- Pending-question context (anti-loop) ----------------
# The generic extractor cannot interpret bare confirmations ("Yes" / "No")
# to a follow-up question. These helpers resolve them against the question
# the assistant just asked, and forbid asking the same thing twice.

AFFIRMATIVE = {"yes", "yeah", "yep", "yup", "sure", "ok", "okay", "haan", "han",
               "haa", "bilkul", "hanji", "haaji", "ya", "definitely", "correct"}
NEGATIVE = {"no", "nope", "nah", "nahi", "nahin", "naah", "never", "not really", "noo", "wrong"}

PENDING_KEYWORDS = [
    ("residency", ["domicile", "resident", "madhya pradesh", " mp ", "mool nivasi", "मूल निवासी", "मध्य प्रदेश"]),
    ("age", ["how old", "your age", "age?", "उम्र", "कितने साल", "kitne saal"]),
    ("gender", ["gender", "male or female", "man or woman", "लिंग", "mahila", "purush"]),
    ("annual_family_income", ["income", "earn", "salary", "आय", "कमाई", "lakh", "kitni", "pariwarik"]),
    ("category", ["category", "caste", " sc ", " st ", "obc", "ews", "general", "श्रेणी", "जाति"]),
    ("education_or_marital", ["education", "study", "qualification", "class 12", "graduate",
                              "marital", "married", "शिक्षा", "वैवाहिक", "padhai"]),
]

REPEAT_WARNING = (
    "You already asked about '{slot}' in your previous message and the user's reply "
    "did not give a usable answer. DO NOT ask about '{slot}' again this turn — this "
    "overrides the one-question rule. Give your best answer now, stating your assumption "
    "about '{slot}' explicitly (e.g. 'Assuming MP domicile…' plus one line for the other case)."
)


def _pending_from_text(text: str) -> Optional[str]:
    """Which slot does this single assistant message ask about? None if not a question."""
    if not text or len(text) > 400:
        return None
    if "?" not in text[-120:]:
        return None
    low = text.lower()
    best, best_n = None, 0
    for slot, kws in PENDING_KEYWORDS:
        n = sum(1 for k in kws if k in low)
        if n > best_n:
            best, best_n = slot, n
    return best


def detect_pending_slot(history: List[Dict[str, str]]) -> Optional[str]:
    """Which slot did the assistant's last message ask about? None if it wasn't a question."""
    for m in reversed(history or []):
        if m.get("role") == "assistant" and (m.get("content") or "").strip():
            return _pending_from_text(m["content"].strip())
    return None


def _first_word(s: str) -> str:
    s = (s or "").strip().lower()
    if not s:
        return ""
    return re.split(r"\s+", s, maxsplit=1)[0].strip(".,!?")


def resolve_conversation(history: List[Dict[str, str]], message: str,
                       slots: Dict[str, Any]) -> List[str]:
    """Walk the whole conversation so EVERY past answer is interpreted against
    the question that preceded it — not just the latest turn.

    Without this, a "Yes" that filled residency in turn 2 is forgotten in
    turn 3 (where it is no longer the current message) and the agent loops.
    Each assistant question is consumed by at most one following user message.
    """
    resolved_all: List[str] = []
    pending: Optional[str] = None
    seq = list(history or []) + [{"role": "user", "content": message}]
    for m in seq:
        role = (m.get("role") or "").strip().lower()
        content = m.get("content") or ""
        if role == "assistant":
            pending = _pending_from_text(content)
        elif role == "user":
            if pending and pending not in slots:
                resolved_all.extend(resolve_pending_answer(pending, content, slots))
            pending = None  # one question, one answer
    return resolved_all


def resolve_pending_answer(pending: Optional[str], message: str,
                           slots: Dict[str, Any]) -> List[str]:
    """Interpret a short confirmation against the pending question.

    Mutates `slots`; returns names of slots filled this way. Value-style
    answers ("34", "OBC", "1.5 lakh") are handled by the generic extractor —
    only bare confirmations need the question context.
    """
    if not pending or pending in slots:
        return []
    reply = (message or "").strip().lower()
    if not reply or len(reply) > 60:
        return []
    first = _first_word(reply)
    yes = reply in AFFIRMATIVE or first in AFFIRMATIVE
    no = reply in NEGATIVE or first in NEGATIVE
    if pending == "residency":
        if yes:
            slots["residency"] = "Madhya Pradesh"
            return ["residency"]
        if no:
            slots["residency"] = "Other State"
            return ["residency"]
    # Bare numeric answers to a numeric question ("34", "26-35", "150000").
    # The generic extractor needs contextual words, so short replies get a
    # question-aware numeric fallback (long replies already handled above).
    if pending == "age" and len(reply) <= 16:
        rg = re.search(r"(\d{1,3})\s*[–-]\s*(\d{1,3})", reply)
        if rg:
            slots["age"] = (int(rg.group(1)) + int(rg.group(2))) // 2
            return ["age"]
        m = re.fullmatch(r"\D{0,4}(\d{1,3})\D{0,4}", reply)
        if m and 0 <= int(m.group(1)) <= 110:
            slots["age"] = int(m.group(1))
            return ["age"]
    if pending == "annual_family_income" and len(reply) <= 24:
        im = re.search(r"([\d,]+(?:\.\d+)?)\s*(lakh|lac|l|thousand|k)\b", reply)
        if im:
            try:
                val = float(im.group(1).replace(",", ""))
                mult = 100000 if im.group(2) in ("lakh", "lac", "l") else 1000
                slots["annual_family_income"] = int(val * mult)
                return ["annual_family_income"]
            except Exception:
                pass
        m = re.fullmatch(r"[₹\s]*([\d,]{4,})", reply)
        if m:
            try:
                slots["annual_family_income"] = int(m.group(1).replace(",", ""))
                return ["annual_family_income"]
            except Exception:
                pass
    return []


# ---------------- Scheme grounding ----------------

def lookup_schemes(query: str, dataset: Optional[Dict[str, Any]], limit: int = 3) -> List[Dict[str, Any]]:
    """Keyword match against the dataset so the agent cites verified facts."""
    if not dataset or not dataset.get("schemes"):
        return []
    tokens = [t for t in re.findall(r"[a-zA-Z\u0900-\u097F]{3,}", (query or "").lower()) if len(t) > 2]
    scored = []
    for s in dataset["schemes"]:
        hay = f"{s.get('id', '')} {s.get('name_en', '')} {s.get('summary', '')}".lower()
        score = sum(1 for t in tokens if t in hay)
        # boost exact scheme-name hits
        for name_bit in re.findall(r"[a-z]{4,}", s.get("id", "")):
            if name_bit in (query or "").lower():
                score += 3
        if score > 0:
            scored.append((score, s))
    scored.sort(key=lambda x: -x[0])
    return [s for _, s in scored[:limit]]


def format_scheme_facts(schemes: List[Dict[str, Any]]) -> str:
    if not schemes:
        return ""
    lines = ["VERIFIED SCHEME FACTS (cite only these; never invent others):"]
    for s in schemes:
        elig = s.get("eligibility", {}) or {}
        lines.append(
            f"- {s.get('id')}: {s.get('name_en')} | benefits: {s.get('benefits')} | "
            f"docs: {', '.join(s.get('required_documents', [])[:6])} | portal: {s.get('official_portal')} | "
            f"residency={elig.get('residency')}, category={elig.get('category')}, "
            f"max_income={elig.get('max_annual_family_income')}, education={elig.get('education_level')}"
        )
    return "\n".join(lines)


# ---------------- Turn builder ----------------

async def build_turn(
    message: str,
    history: List[Dict[str, str]],
    language: str,
    dataset: Optional[Dict[str, Any]],
    match_block: str = "",
    doc_block: str = "",
) -> Tuple[str, str, Dict[str, Any]]:
    """Assemble (system_text, user_text, meta). Runs slot extraction,
    scheme lookup and (when needed) the free web-search tool."""
    convo = (history or []) + [{"role": "user", "content": message}]
    pending = detect_pending_slot(history or [])
    slots = extract_profile_slots(convo)
    # Resolve every answer against the question that preceded it — past turns
    # included — so earlier answers (e.g. turn-2 "Yes") are never forgotten.
    resolved = resolve_conversation(history or [], message, slots)
    miss = missing_slots(slots)
    # Loop-breaker: the pending question still unanswered -> forbid re-asking.
    repeat_slot = pending if (pending in miss) else None
    schemes = lookup_schemes(message, dataset)
    scheme_ids = [s.get("id", "") for s in schemes if s.get("id")]

    searched = False
    search_block = ""
    if needs_search(message):
        result = await web_search(message if len(message) < 120 else message[:120])
        search_block = format_search_block(result)
        searched = bool((result.get("results") or []))

    parts = [format_slots_block(slots, miss)]
    if resolved:
        rec = ", ".join(f"{r}={slots[r]}" for r in resolved if r in slots)
        parts.append(
            f"NOTE: the user answered your follow-up question(s) → recorded {rec}. "
            "Do not ask about these again."
        )
    if repeat_slot:
        parts.append(REPEAT_WARNING.format(slot=repeat_slot))
    facts = format_scheme_facts(schemes)
    facts = format_scheme_facts(schemes)
    if facts:
        parts.append(facts)
    if match_block:
        parts.append(match_block)
    if doc_block:
        parts.append(doc_block)
    if search_block:
        parts.append(search_block)
    if language == "hi":
        parts.append("(कृपया उत्तर स्पष्ट हिंदी (देवनागरी) में दें।)")

    user_text = message + "\n\n--- AGENT CONTEXT ---\n" + "\n\n".join(parts)
    system_text = build_system_prompt(dataset) + AGENT_RULES
    meta = {"slots": slots, "missing": miss, "schemes": scheme_ids, "searched": searched,
            "pending": pending, "resolved": resolved, "repeat_slot": repeat_slot}
    return system_text, user_text, meta


# ---------------- Streaming OpenRouter ----------------

async def stream_openrouter(
    system_text: str,
    messages: List[Dict[str, str]],
    api_key: str = "",
    model: str = "",
    timeout: float = STREAM_TIMEOUT_SECONDS,
) -> AsyncIterator[str]:
    """Yield raw text deltas from OpenRouter SSE stream. Raises on HTTP error."""
    key = api_key or os.getenv("OPENROUTER_API_KEY", "")
    mdl = model or os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL) or DEFAULT_MODEL
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured on the server.")
    payload = {
        "model": mdl,
        "messages": [{"role": "system", "content": system_text}] + messages,
        "temperature": 0.3,
        "max_tokens": 900,
        "stream": True,
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost:5173"),
        "X-Title": os.getenv("OPENROUTER_APP_NAME", "MPOnline Helpdesk"),
    }
    async with httpx.AsyncClient(timeout=timeout, headers=headers) as client:
        async with client.stream("POST", OPENROUTER_URL, json=payload) as r:
            if r.status_code != 200:
                body = (await r.aread()).decode(errors="replace")[:300]
                raise RuntimeError(f"OpenRouter {r.status_code}: {body}")
            async for line in r.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                    delta = ((chunk.get("choices") or [{}])[0].get("delta") or {}).get("content")
                    if delta:
                        yield delta
                except Exception:
                    continue
