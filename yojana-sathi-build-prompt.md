# Build Prompt: "Yojana Sathi" — AI Scheme Eligibility & Document-Readiness Assistant

Paste this entire document as your first message to Claude (Claude Code, in an empty project folder). It is self-contained. A file called `schemes_dataset.json` will be placed in the project root alongside it — read it before writing any matching logic.

---

## 0. Context (read this first, don't skip it)

This is a hackathon prototype for the **MPOnline Idea & Innovation Hackathon 2026**, Challenge 5: *AI Innovation for Public Services & Citizen-Centric Governance*. It will be built by a team of 2-4 people with roughly **2 days of actual coding time**, demoed live, and judged mostly on:

- Prototype/MVP completeness and usability (20%)
- Innovation & originality (20%)
- Problem understanding (15%)
- Technical feasibility (15%)
- Impact on governance (15%)
- Scalability & sustainability (10%)

**What this optimizes for:** a small number of features that work reliably end-to-end in a live demo, not a large number of features that half-work. If you (Claude) ever have to choose between adding a new feature and hardening an existing one, harden the existing one.

### The product, in one paragraph

A citizen answers a short set of plain-language questions (age, gender, income, category, education, district, occupation, marital status). The system matches them against a curated dataset of real MP state + central government welfare/scholarship/skill schemes, returns a ranked list of schemes they likely qualify for with a plain-language explanation of *why*, and then lets them upload photos of the documents each scheme requires so the system can flag obviously wrong or unreadable documents **before** they go stand in a queue at a government office.

### Hard non-goals — do not do these even if it seems like an improvement

1. **Do not train any machine learning model.** Use hosted LLM APIs and/or a pretrained OCR library. There is no time or data for training.
2. **Do not claim or attempt integration with any real government database or API** (Samagra, e-KYC, DigiLocker, etc.). None of that access exists for this team. Everything runs on the bundled `schemes_dataset.json` plus whatever the citizen types/uploads in the session.
3. **Do not invent additional schemes.** `schemes_dataset.json` is the only source of truth for scheme data. If asked to "add more schemes," add them to that JSON file with the same schema and a note on where the data came from — never hardcode scheme facts inside prompts or code.
4. **Do not build user accounts, persistent citizen profile storage, or anything that stores uploaded document images beyond the current session.** Process uploads in memory/temp storage and discard them after the response. This matters for the "Problem Understanding" judging criterion (DPDP Act 2023 awareness) — say so in the UI.
5. **Do not build this as free-text open-domain chat.** Eligibility questions must be a structured form/guided flow (dropdowns, radio buttons, sliders), not a chatbot trying to parse arbitrary sentences. This avoids an entire class of NLU bugs and demo failure modes.

---

## 1. Architecture

Build this as **three small backend services plus one frontend**, run together via Docker Compose, but architected so each service is independently understandable and testable. Keep every service small — this is "microservices-flavored," not enterprise microservices. If Docker isn't available in your build environment, also provide a plain `docker compose`-free way to run all three services locally (separate terminal commands / a single script), because hackathon venue networks are unreliable and you need a fallback.

```
┌─────────────────┐
│   Frontend       │  React + Vite + Tailwind, talks ONLY to gateway-service
│  (port 5173)     │
└────────┬─────────┘
         │ HTTPS/REST (JSON)
┌────────▼─────────┐
│  gateway-service  │  FastAPI — BFF layer: session/conversation state,
│   (port 8000)     │  language routing (en/hi), aggregates calls to the
│                   │  other two services, the ONLY service the frontend
│                   │  talks to
└───┬───────────┬───┘
    │           │
┌───▼────────┐ ┌▼─────────────────┐
│ eligibility │ │ document-service  │
│  -service   │ │  (port 8002)      │
│ (port 8001) │ │  OCR + vision-LLM │
│             │ │  document check   │
│ loads       │ └───────────────────┘
│ schemes_    │
│ dataset.json│
└─────────────┘
```

**Tech stack (do not substitute without a strong reason):**

- Backend: **Python 3.11, FastAPI**, `uvicorn`. Pydantic v2 for all request/response models.
- Frontend: **React 18 + Vite + TailwindCSS**. No heavyweight state library — `useState`/`useReducer` is enough.
- LLM: Anthropic Claude API (`claude-sonnet` family) via a **single thin wrapper module** (`llm_client.py`) so the provider can be swapped by changing one file if the API key runs out mid-hackathon. Read the API key from an environment variable, never hardcode it.
- OCR/vision: use `pytesseract` (Tesseract OCR) for text extraction, **and** a vision-capable LLM call for the higher-level "does this look like the right document" judgment. Don't try to build a custom document classifier.
- Containerization: Docker Compose with one `Dockerfile` per service, plus a `docker-compose.yml` at the repo root.
- No database required for the MVP. Scheme data is a static JSON file loaded into memory at service startup. If a database feels necessary for a stretch goal, use SQLite — never provision or assume access to a hosted DB.

---

## 2. Repository layout

```
yojana-sathi/
├── schemes_dataset.json          # provided — do not modify structure, may extend content
├── docker-compose.yml
├── README.md                     # setup + demo script, written LAST
├── .env.example
├── services/
│   ├── gateway/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   ├── main.py
│   │   ├── schemas.py            # Pydantic models shared with frontend contract
│   │   ├── llm_client.py
│   │   └── tests/
│   ├── eligibility/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   ├── main.py
│   │   ├── matcher.py            # pure-Python rule engine, NO LLM calls in here
│   │   ├── explainer.py          # LLM call that turns matches into plain language
│   │   └── tests/
│   │       └── test_matcher.py   # must run the 4 test_personas from schemes_dataset.json
│   └── document/
│       ├── Dockerfile
│       ├── requirements.txt
│       ├── main.py
│       ├── ocr.py
│       ├── vision_check.py
│       └── tests/
└── frontend/
    ├── package.json
    ├── index.html
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── EligibilityForm.jsx
    │   │   ├── ResultsList.jsx
    │   │   ├── SchemeCard.jsx
    │   │   ├── DocumentUpload.jsx
    │   │   └── LanguageToggle.jsx
    │   └── api/
    │       └── client.js         # ALL calls go through gateway-service only
    └── tailwind.config.js
```

---

## 3. API contracts

Define these exactly — the frontend and services are built against this contract, so get it right before writing implementation code.

### `POST /match` (gateway → eligibility-service, and exposed by gateway to frontend as `POST /api/match`)

Request:
```json
{
  "age": 19,
  "gender": "female",
  "residency": "Madhya Pradesh",
  "district": "Bhopal",
  "rural_or_urban": "rural",
  "category": "OBC",
  "annual_family_income": 200000,
  "education_level": "undergraduate",
  "class12_percentage": 65,
  "occupation": "student",
  "marital_status": "unmarried",
  "language": "en"
}
```
All fields except `language` are optional — the matcher must degrade gracefully (treat missing fields as "unknown," never as "fails this criterion," and the response must say which extra fields would sharpen the result).

Response:
```json
{
  "matches": [
    {
      "scheme_id": "mp_post_matric_scst_obc",
      "name": "Post-Matric Scholarship for SC/ST/OBC Students",
      "confidence": "high",
      "plain_language_reason": "You're an OBC student from Madhya Pradesh with family income under the ₹2.5 lakh limit for this scheme, currently in an undergraduate course.",
      "benefits": "...",
      "required_documents": ["..."],
      "official_portal": "https://hescholarship.mp.gov.in",
      "missing_info_that_would_help": ["exact caste certificate status"]
    }
  ],
  "possible_but_unconfirmed": [ /* same shape, for schemes where a key field was missing */ ],
  "disclaimer": "This tool gives an informational estimate only. Confirm eligibility and apply on the scheme's official portal."
}
```

### `POST /api/check-document` (gateway → document-service)

Request: multipart form — `scheme_id`, `document_type` (e.g. `"income_certificate"`), `file` (image).

Response:
```json
{
  "document_type_detected": "income_certificate",
  "matches_expected_type": true,
  "legibility": "good",
  "flags": ["date field may be older than 1 year — check validity window"],
  "verdict": "likely_acceptable",
  "confidence": "medium"
}
```
`verdict` is one of `likely_acceptable | needs_review | likely_wrong_document`. **Never say "accepted" or "approved"** — that overclaims what an OCR check can guarantee, and an official will make the real decision. This wording matters for the demo pitch and for honesty.

### Health checks

Every service exposes `GET /health` returning `{"status": "ok", "service": "<name>"}`. The frontend should show a small "system status" indicator that pings the gateway on load — if the LLM-dependent explainer is down, the app must still show rule-based matches without the plain-language text, not crash.

---

## 4. Phased build plan

Work through these phases **in order**, and after each phase, run whatever you built and confirm it actually works before moving on — don't write Phase 3 code on top of an unverified Phase 2. If you hit a genuinely blocking decision (e.g., no LLM API key set), stop and ask rather than silently mocking it and moving on.

### Phase 0 — Scaffolding (target: ~30-45 min of build time)
- Create the full repo layout above with placeholder files.
- `docker-compose.yml` bringing up all three services + frontend, each with a working `/health` endpoint.
- Frontend shell that pings gateway `/health` on load and shows a green/red status dot.
- **Definition of done:** `docker compose up` (or the fallback scripts) results in 4 running processes, and opening the frontend shows a green status dot.

### Phase 1 — Eligibility rule engine (no LLM yet)
- Load `schemes_dataset.json` once at eligibility-service startup, validate its schema, and hard-fail with a clear error message if it doesn't parse (never silently ignore a broken dataset).
- Implement `matcher.py`: pure-Python function `match(profile: dict) -> MatchResult` that checks a citizen profile against each scheme's `eligibility` block field by field. Treat every eligibility field as a soft filter that can be `pass / fail / unknown`; a scheme goes into `matches` only if nothing is `fail` and the "hard disqualifier" fields (see `mp_ladli_laxmi`'s registration-timing note in the dataset) are explicitly satisfied, not just "unknown."
- Write `test_matcher.py` using the four `test_personas` embedded in `schemes_dataset.json` — assert the matcher's output lines up with each persona's `expect_eligible_for` / `expect_not_eligible_for`. Do not consider this phase done until these tests pass.
- **Definition of done:** `POST /match` (eligibility-service only, gateway not wired yet) returns correct results for all four personas, verified by the automated tests.

### Phase 2 — Plain-language explanation layer
- `explainer.py`: one LLM call per `/match` request that takes the rule-engine's raw matches + the citizen's profile and returns the `plain_language_reason` text per match, in the requested language (English or Hindi — pass `language` straight into the prompt).
- The LLM must be given the matched scheme's `summary`/`eligibility`/`benefits` fields as context and instructed **not to state anything about eligibility that the rule engine didn't already establish** — it explains, it doesn't re-decide. Include an explicit instruction in the system prompt: "Only explain the match already determined below; do not introduce new eligibility claims."
- Add a timeout (e.g. 8 seconds) and a fallback: if the LLM call fails or times out, return the matches with a generic templated reason instead of the personalized one, and don't break the response.
- **Definition of done:** same test personas, now hit through the full eligibility-service with LLM explanations attached, in both `en` and `hi`; killing the LLM API key still returns a valid (if less friendly) response.

### Phase 3 — Gateway integration
- Implement `gateway-service` as the only entry point for the frontend: `POST /api/match` proxies to eligibility-service, handling its own timeouts/retries and returning a clean error shape the frontend can render (never leak a raw 500/stack trace to the UI).
- Add basic per-IP rate limiting (a simple in-memory counter is fine — this is a demo, not production) so nobody can accidentally hammer the LLM API and blow the demo budget.
- **Definition of done:** frontend's placeholder "Get my schemes" button, wired to `/api/match` via the gateway, returns real results in the browser.

### Phase 4 — Frontend eligibility flow
- Build `EligibilityForm.jsx` as a multi-step structured form (not free text) matching the `/match` request schema. Sensible input types: numeric sliders/inputs for age and income, radio/select for gender/category/education level, a district dropdown (MP districts list — hardcode the 55 MP districts, this is safe static data).
- Build `ResultsList.jsx` / `SchemeCard.jsx` to render `matches` and `possible_but_unconfirmed` as visually distinct sections, each scheme card showing: name, plain-language reason, benefit, document checklist, and a link to `official_portal` (opens in new tab).
- Add `LanguageToggle.jsx` (EN/HI) that re-triggers the match call with the new `language` value.
- Put the disclaimer text ("informational tool, not an official portal — verify before applying") permanently visible, not just in a tooltip.
- **Definition of done:** a person with no context can fill the form and get a legible, correctly-labelled results screen in under 60 seconds.

### Phase 5 — Document-readiness checker
- `document-service`: `POST /check-document` — run OCR (pytesseract) to extract raw text, then a single vision-LLM call that receives the image + `document_type` + a short description of what that document type should contain (pull this from the matched scheme's context, passed in by the gateway) and returns the structured verdict described in Section 3.
- Explicitly prompt the vision-LLM to be conservative: it should say `needs_review` rather than `likely_acceptable` whenever it's not confident, and it must never fabricate a specific certificate number, name, or date it can't actually read.
- Wire `DocumentUpload.jsx` into the frontend as a per-scheme "Check my documents" action available on each `SchemeCard` once a citizen has selected schemes they want to pursue.
- Cap upload size (e.g. 5MB) and file types (jpg/png/pdf-first-page) client-side and server-side.
- **Definition of done:** uploading a photo of an unrelated document (e.g. a photo of a laptop) returns `likely_wrong_document`, and uploading a plausible income-certificate-like image returns `likely_acceptable` or `needs_review` with a sensible flag.

### Phase 6 — Hardening and demo prep
- Add a **recorded fallback path**: if the venue Wi-Fi or the LLM API is down during the live demo, the app should still be able to show the Phase 1 rule-based-only results (no personalization text) rather than an error page. Test this explicitly by killing network access to the LLM and confirming the UI still works.
- Add loading states for every async action (no blank screens during the ~1-3s LLM round trip).
- Finalize `README.md`: one-command startup instructions, environment variables needed, and a 90-second demo script (which persona to type in, what to click, what to say out loud) mapped to the six judging criteria so the presenting teammate has a script to follow.
- Do a final pass confirming nothing in the codebase claims real government data integration — check UI copy, not just backend logic.

---

## 5. Environment & configuration

Create `.env.example` at the repo root with (values blank, to be filled locally, never committed):
```
ANTHROPIC_API_KEY=
LLM_MODEL=claude-sonnet-4-6
GATEWAY_PORT=8000
ELIGIBILITY_SERVICE_URL=http://eligibility:8001
DOCUMENT_SERVICE_URL=http://document:8002
LLM_TIMEOUT_SECONDS=8
```

---

## 6. UI/UX requirements (non-negotiable for the demo)

- Bilingual minimum: English and Hindi, toggle always visible, no page reload required.
- Mobile-responsive layout (judges may view the demo on a phone as well as a laptop).
- Every scheme result visibly shows its `official_portal` link and the standing disclaimer — this is your Problem Understanding score, don't bury it.
- Never show a raw error, stack trace, or "undefined" in the UI. Every failure state has a plain-language message and a way to retry.
- Use the design system already established by any existing frontend-design conventions in this project if one is set up; otherwise keep it simple, high-contrast, and readable at a glance rather than decorative.

---

## 7. Testing expectations

- The four `test_personas` in `schemes_dataset.json` are the minimum bar — expand this set yourselves as you find edge cases, particularly around the `mp_ladli_laxmi` registration-timing disqualifier and the `mp_ladli_behna_awas` "must already be a beneficiary" dependency, since those are the two trickiest rules in the dataset.
- Add at least one adversarial test to the document-service tests: an image that is clearly the wrong type, to confirm the verdict logic doesn't default to "acceptable."

---

## 8. How to work through this prompt

Build phases 0 through 6 in order. After each phase, show a short summary of what was built and the result of running its "definition of done" check, then continue to the next phase without waiting for confirmation, unless something is ambiguous enough that guessing wrong would waste significant time — in that case, ask one specific question and wait. Keep every phase's code actually runnable; don't leave phase N broken while starting phase N+1. If you run low on remaining build time before finishing all phases, stop after completing Phase 4 (the eligibility flow end-to-end) at a minimum — that alone is a legitimate, demoable prototype — and clearly say which phases were skipped, rather than half-finishing Phase 5 or 6.
