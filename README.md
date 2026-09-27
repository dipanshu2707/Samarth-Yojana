# Yojana Sathi (योजना साथी)
### AI Scheme Eligibility & Pre-Screening Document-Readiness Assistant
**MPOnline Idea & Innovation Hackathon 2026** — *Challenge 5: AI Innovation for Public Services & Citizen-Centric Governance*

---

## 1. What It Does

Yojana Sathi helps citizens of Madhya Pradesh find government welfare and scholarship schemes they qualify for, explains *why* in plain language (English & Hindi), and pre-screens photos of their documents for legibility and type mismatches **before** they visit a government kiosk or stand in long queues.

### The 3 Core Pillars:
1. **Zero Hallucination Eligibility Engine:** 100% rule-based matching evaluated directly against verified scheme datasets (`schemes_dataset.json`). The LLM only explains matches determined by the rule engine—it never invents eligibility rules or schemes.
2. **Pre-Screening Document Readiness:** Combines OCR and Vision AI to flag incorrect document types, illegible photos, or expired validity windows. Never over-claims "approved" or "accepted"—it provides honest decision support (`likely_acceptable`, `needs_review`, `likely_wrong_document`).
3. **DPDP Act 2023 Compliant & Zero-Storage:** No citizen account required, no tracking, and uploaded document photos are processed transiently in-memory and permanently discarded immediately after response.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────┐
│        Frontend (React 18 + Vite + Tailwind)  │  Port 5173
│  • Bilingual UI (English & हिन्दी)           │  Talks ONLY to Gateway
│  • Multi-step guided questionnaire           │
│  • 1-Click Demo Persona Presets              │
└──────────────────────┬───────────────────────┘
                       │ HTTPS / REST (JSON)
┌──────────────────────▼───────────────────────┐
│              gateway-service                 │  Port 8000 (FastAPI)
│  • Backend-For-Frontend (BFF) aggregator     │
│  • Per-IP rate limiting (demo safety)        │
│  • Structured error handling & fallbacks     │
└───┬──────────────────────────────────────┬───┘
    │                                      │
┌───▼─────────────────────┐  ┌─────────────▼─────────────────────────┐
│   eligibility-service   │  │           document-service            │
│   Port 8001 (FastAPI)   │  │           Port 8002 (FastAPI)         │
│  • Pure-Python Matcher  │  │  • Tesseract OCR engine               │
│  • Source of truth:     │  │  • Vision LLM inspection              │
│    schemes_dataset.json │  │  • Format & size validation (<5MB)    │
│  • Bilingual Explainer  │  │  • Immediate memory disposal (DPDP)   │
└─────────────────────────┘  └───────────────────────────────────────┘
```

---

## 3. Quickstart & How to Run

### Option A: One-Command Local Runner (Recommended for Venue Networks)

No Docker required. Run the automated script from PowerShell:

```powershell
.\run_local.ps1
```
*(On Linux/macOS, run `./run_local.sh`)*

This launches:
- **Frontend:** http://localhost:5173
- **Gateway Service:** http://localhost:8000
- **Eligibility Service:** http://localhost:8001
- **Document Service:** http://localhost:8002

---

### Option B: Docker Compose

```bash
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY if testing live LLM features (optional, full fallback included)

docker compose up --build
```

---

### Running Individual Services Manually

1. **Eligibility Service:**
   ```bash
   cd services/eligibility
   pip install -r requirements.txt
   uvicorn main:app --host 127.0.0.1 --port 8001
   ```

2. **Document Service:**
   ```bash
   cd services/document
   pip install -r requirements.txt
   uvicorn main:app --host 127.0.0.1 --port 8002
   ```

3. **Gateway Service:**
   ```bash
   cd services/gateway
   pip install -r requirements.txt
   uvicorn main:app --host 127.0.0.1 --port 8000
   ```

4. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 4. Running Automated Tests

All core matching rules and persona cases are covered by automated tests:

```bash
# Run eligibility engine unit tests (100% pass on all 4 personas + edge cases)
pytest services/eligibility/tests/test_matcher.py

# Run document inspection and adversarial tests
pytest services/document/tests/test_document.py

# Run gateway service tests
pytest services/gateway/tests/test_gateway.py
```

---

## 5. Live 90-Second Demo Script for Presenters

Use this exact walkthrough during the hackathon pitch:

| Time | Action | What to Say Out Loud | Judging Criteria Mapped |
|---|---|---|---|
| **00:00 - 00:15** | Open `http://localhost:5173/`. Point to the green status dot and the bilingual toggle. | *"Judges, millions of MP citizens miss welfare benefits because of confusing eligibility rules or getting bounced for simple paperwork mistakes. Yojana Sathi solves both."* | **Problem Understanding (15%)** |
| **00:15 - 00:35** | Click **"Aarti (OBC Student)"** preset button. Walk through the 4 questionnaire steps. | *"Instead of a hallucinating chatbot, we use a structured 8-question flow. Notice Aarti is a rural OBC undergraduate student with 65% in Class 12."* | **Prototype Completeness & Usability (20%)** |
| **00:35 - 00:55** | Click **"Find Matching Schemes"**. Toggle language between **English** and **हिन्दी**. | *"Our deterministic rule engine matches her to MP Post-Matric, Gaon Ki Beti, and Central NSP. The AI explains *why* in conversational Hindi or English without changing the facts. Notice MMVY is correctly disqualified because 65% doesn't clear the merit cutoff."* | **Technical Feasibility & Innovation (35%)** |
| **00:55 - 01:15** | On the Post-Matric card, click **"Check Readiness"** next to Income Certificate. Upload a sample document photo. | *"Before Aarti goes to the tehsil office, she can pre-screen her documents. Our OCR and Vision layer flags illegibility or expired certificates with an honest verdict of 'Likely Acceptable' or 'Needs Review'—never claiming fake official approval."* | **Innovation & Governance Impact (35%)** |
| **01:15 - 01:30** | Point out the official portal link and the DPDP Act 2023 compliance badge at the bottom. | *"Under the DPDP Act 2023, we store zero citizen data or document images—everything is discarded after the session. Every result directs the citizen to the real government portal to apply. Thank you!"* | **Scalability & Sustainability (10%)** |

---

## 6. Environment Variables (`.env`)

| Variable | Description | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API key for live bilingual explanations & vision checks *(optional: robust offline fallbacks built-in)* | `""` |
| `LLM_MODEL` | Claude model identifier | `claude-3-5-sonnet-20241022` |
| `GATEWAY_PORT` | Port for BFF Gateway service | `8000` |
| `ELIGIBILITY_SERVICE_URL` | Eligibility service endpoint | `http://localhost:8001` |
| `DOCUMENT_SERVICE_URL` | Document readiness service endpoint | `http://localhost:8002` |
| `LLM_TIMEOUT_SECONDS` | Network timeout for LLM calls before falling back | `8` |

---

## 7. Honest Governance & Ethical Non-Goals
- **Decision Support, Not Sanction:** Yojana Sathi provides pre-screening and informational estimates. Only designated government officials make actual approval decisions.
- **No Private Data Storage:** Designed to be citizen-first and privacy-respecting in strict accordance with the Digital Personal Data Protection (DPDP) Act 2023.
