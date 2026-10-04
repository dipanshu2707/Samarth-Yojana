# Document 1 — Solution Synopsis / Executive Summary
### Samarth Yojana (Yojana Sathi) — MPOnline | MPOnline Idea & Innovation Hackathon 2026, Challenge 5

**Team:** [TEAM NAME] | **Tagline:** Every complaint tracked. Every scheme within reach.

---

## 1. One-Line Solution

A bilingual citizen portal for Madhya Pradesh that (a) finds eligible welfare schemes with zero AI hallucination and pre-screens document photos before kiosk visits, and (b) files civic grievances with photo/voice proof with guaranteed 3-tier escalation and real email audit trail.

## 2. What It Does (3 Pillars)

**Pillar 1 — Zero-Hallucination Eligibility Engine:**
Structured 8-question form (age, gender, income, category, education, district, occupation, marital status) checked by a pure-Python rule engine against 13 verified MP + Central schemes in `schemes_dataset.json`. LLM only explains matches, never decides.

Example: Aarti, 19F rural OBC UG 65% → correctly matches Post-Matric Scholarship, Gaon Ki Beti, Central NSP; correctly rejects MMVY (needs ~70%+) and Vikramaditya (General only).

**Pillar 2 — Pre-Screening Document Readiness:**
Tesseract OCR + vision LLM returns `likely_acceptable / needs_review / likely_wrong_document`. Never says approved. Images processed transiently in-memory and discarded — DPDP Act 2023 compliant.

**Pillar 3 — Accountable Grievance Redressal:**
File via text / Hindi-English voice / photo → auto-triaged to 1 of 5 departments (PWD, PHE Water, DISCOM Power, Urban Sanitation, Health) → 7-day L1 desk clock → auto-escalate L2 Collector (3-day) → L3 CM Office (1-day). Every hop sends real email + immutable timeline. Track by ticket ID or mobile number, zero login. Live Leaflet heatmap of MP districts.

## 3. System At A Glance

```
Frontend (React 18 + Vite + Tailwind) on Vercel + Flutter mobile
  → Vercel rewrites /api, /health, /uploads
  → ONE unified FastAPI backend on Render (backend/main.py)
    → matcher.py + explainer.py + ocr.py + vision_check.py (in-process)
    → grievance_engine.py + auth.py + email_service.py + db.py + object_store.py
  → Supabase Postgres (grievances) + Storage (evidence bucket) + Brevo (300 mails/day)
```

Live API: `https://yojana-sathi-api-orro.onrender.com` — `/health`, `/api/db/status`, `/api/email/status`.

## 4. Why It Wins

- Deterministic, auditable, honest — no fake government integration, no invented schemes.
- ₹0/month: Render + Vercel + Supabase + Brevo free tiers. Rate-limited 60 req/min.
- Bilingual EN/HI, mobile-responsive, voice-first, works with LLM offline fallback.
- Every result links to official portal + permanent disclaimer: informational estimate only, verify before applying.

## 5. Status

Working MVP. Seeds SD001–SD006. Tests: `pytest backend/tests/test_unified.py`. Demo <90 seconds.
