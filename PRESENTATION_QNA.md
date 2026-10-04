# Presentation & Evaluation Q&A — Samarth Yojana (MPOnline)

30 questions judges typically ask on this build, with crisp answers.
Scope: web frontend + unified backend. Mobile app excluded.

---

## A. Architecture & Deployment (Q1–Q6)

### Q1. Give the 30-second architecture overview.
A React 18 + Vite + Tailwind frontend on **Vercel** talks only to one **FastAPI** unified backend on **Render**. The backend owns scheme matching, document checks, the grievance workflow, auth, email dispatch, and Supabase persistence. Browser → Vercel rewrites (`frontend/vercel.json`) → Render. Secrets live only on Render.

### Q2. Why one backend instead of microservices?
The first layout had three services (gateway/eligibility/document). We merged them into `backend/` so the whole API fits Render's **free single-service** tier, kills inter-service network hops (matching + OCR now run in-process), and keeps one deploy pipeline. External REST contract never changed.

### Q3. How does the frontend reach the backend in production?
It calls relative paths (`/api/...`, `/health`, `/uploads/...`). `frontend/vercel.json` rewrites each to `https://yojana-sathi-api-orro.onrender.com/...`. So the browser never hardcodes a host and no API key is exposed. No `VITE_*` secrets needed.

### Q4. How do you stay 100% on free tiers?
Render free (API) + Vercel free (web) + Supabase free (500 MB DB, 1 GB storage) + Brevo free (300 mails/day). No credit card on any of them. Trade-off accepted: Render sleeps after ~15 min idle, so we added wake-up controls (Q30).

### Q5. What happens when Render redeploys — is data lost?
No. Tickets live in Supabase (`grievances` table) plus a local JSON mirror; evidence photos live in the Supabase `evidence` bucket. Render's ephemeral disk only holds throwaway copies. Seeds use fixed IDs (`SD001`–`SD006`) so restarts never duplicate.

### Q6. Walk us through `render.yaml`.
One free Python service, `rootDir: backend`, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`, health check `/health`. Non-secret env baked in; secrets (`SUPABASE_*`, `BREVO_*`) entered as `sync: false` in the dashboard, never committed (`backend/.env` is gitignored).

---

## B. Backend & API Design (Q7–Q11)

### Q7. List the API surface.
Eligibility `POST /api/match`; documents `POST /api/check-document`; grievances `POST /api/grievance/submit`, `GET /list`, `GET /track/{id}`, `GET /by-mobile/{n}`, `POST /{id}/escalate|status|request-approval|approval-decision|resolve`; `POST /api/grievance/upload-photo`; auth `POST /api/auth/login`; meta `GET /api/departments`, `/api/authority-levels`, `/api/email/status|test`, `/api/db/status`; health `/health`, `/health/all`. See `backend/main.py`.

### Q8. How is abuse/overload handled?
Per-IP rate limiting middleware: 60 req/min on `/api/*`, HTTP 429 beyond that (`backend/main.py`). Uploads capped at 4 MB with JPG/PNG/WebP allow-listing, validated before anything is stored.

### Q9. How do Pydantic schemas protect the API?
Every request/response is a schema in `backend/schemas.py` — e.g. `GrievanceSubmitRequest` requires title/description/mobile, `GrievanceResponse` fixes the ticket shape. Bonus lesson: a `NameError` once broke the Render deploy because `EmailLogItem` was defined after use — Python 3.14 (local) lazily evaluates annotations, 3.12 (Render) does not. Fixed by ordering + audit.

### Q10. Why does `/api/match` also exist as `/match`?
Back-compat alias: early clients called the old eligibility service directly. The alias preserves them while everything new uses `/api/*`.

### Q11. How is the scheme dataset loaded safely?
`find_and_load_dataset()` probes six candidate paths (covers local, Docker, Render `rootDir`), validates the `schemes` list, and fails fast with a clear error. `/health` reports `schemes_count` (13).

---

## C. Grievance Engine & AI Triage (Q12–Q16)

### Q12. Is the department routing "AI"? How does it work?
Deterministic keyword triage in `backend/grievance_engine.py:classify_grievance` over 5 departments (PWD, Water/PHE, DISCOM Power, Urban Sanitation, Health), with rural/urban boost and critical-trigger escalation (fire, sewage burst, sparking wires…). Citizens can also **override** by picking the desk — selection wins with 0.97 confidence and `dept_selected_by_user=true`.

### Q13. What happens below 75% confidence?
`needs_human_review=true`: ticket parks at the L0 triage desk as `in_review` ("Flagged for Human Review") instead of auto-routing — human-in-the-loop fallback, never a silent misroute.

### Q14. Explain the 3-tier escalation and SLAs.
L1 department desk (7-day SLA) → L2 District Collector (3 days) → L3 CM Office apex (1 day). `escalate_grievance()` moves the tier, rewrites the responsible authority, appends an immutable timeline stage (`L2_COLLECTOR`/`L3_CMO`), and fires a real email to the next tier. `workflow_status` (`open/in_review/in_progress/resolved`) tracks field reality separately from tier.

### Q15. What are deduplication and hotspots?
`check_deduplication()` merges same-district/same-dept repeats (≥3 keyword overlap) into a parent ticket with a co-complainant counter. `get_hotspot_analytics()` aggregates per-district volume, criticals, rural/urban split, and live L2/L3 load — feeding both the heatmap and district cards.

### Q16. Can a resolved ticket be tampered with?
Records are append-only by design (`immutable: true`); updates only append timeline stages. Resolved tickets cannot be reopened from a desk (`update_workflow_status` rejects it). Full audit trail per ticket, including email delivery entries.

---

## D. Auth, Roles & Data Isolation (Q17–Q20)

### Q17. Who are the authority users?
Three seeded tiers (`backend/auth.py`): L1 Nodal **RAM** (`kumardp2707@gmail.com`), L2 Collector **Shyam**, L3 CM Office **Jay** — all five department desks share the L1 mail. Passwords are env-overridable; login returns a token + level + department scope.

### Q18. How is department isolation enforced?
Server-side, not just UI: `GET /api/grievance/list` accepts the login token, and a Level-1 caller **without an explicit desk gets zero rows**. L1 then filters to its selected desk; L2/L3 bypass the filter for state-wide monitoring. Frontend mirrors it with per-desk queues.

### Q19. What can each tier do?
L1: review/progress/forward-to-L2/request-approval-from-L2/resolve within its desk. L2: same across all desks + forward-to-L3 + approve/return L1 requests. L3: everything + status-count overview. Approval flow is two-step (`request-approval` → `approval-decision` with index + comment), all logged.

### Q20. How does a citizen track without an account?
Two zero-login paths: ticket ID (`/track/{id}`) and mobile number (`/by-mobile/{n}`, last-10-digit normalized match). Both return full dossiers — status pills, evidence, timeline, email log.

---

## E. Persistence, Email & Storage (Q21–Q25)

### Q21. Where is data actually stored?
Supabase `grievances` table (one row per ticket: indexed `dept_id/district/level/status/mobile` + full JSONB `data`), mirrored to `backend/data/grievances.json` for zero-config local runs. Every mutation upserts both; Supabase failures log but never break the request. Schema: `backend/supabase_schema.sql`.

### Q22. Where do evidence photos live?
Supabase Storage bucket `evidence` (public read) via `backend/object_store.py` — the ticket stores a permanent https URL keyed by ticket ID. Local `backend/uploads/` + `/uploads` static serving is the automatic fallback. This was a deliberate fix: Render's free disk is ephemeral.

### Q23. How are real emails sent for free?
`backend/email_service.py` auto-selects: Brevo API (300/day) if `BREVO_API_KEY` set, else Gmail SMTP (~500/day, App Password). Filing mails the desk + citizen receipt; forwards/approvals mail the target tier; resolutions mail the citizen. Every send (or failure) is appended as `EMAIL_SENT`/`EMAIL_FAILED` with provider — verifiable in the dossier and via `POST /api/email/test`.

### Q24. What is the verified sender?
`singhdp2707@gmail.com` — the only Brevo-verified sender (see Brevo dashboard screenshot in docs). Gmail freemail senders carry a deliverability warning, so presentation mail may land in spam; a custom authenticated domain would fix that in production.

### Q25. How do you prove an email really went out?
Three ways: the ticket's `email_log` array, the timeline's mail stages, and the `/api/email/test` endpoint returning the provider's message ID (verified live during build).

---

## F. Frontend, Map, Voice & Language (Q26–Q30)

### Q26. How is the React app structured?
`frontend/src/`: `App.jsx` (service switch grievance/schemes + health dot + Authority Login entry), `GrievancePortal.jsx` (5 tabs), `grievance/` modules (`FileGrievanceForm`, `FindByMobile`, `TicketDossier`, `OfficerDesk`, `AuthorityLogin`, `MpHeatmap`, `VoiceComplaintInput`, `ServerWakeButton`), one API client, Tailwind styling. No mock data — every failure surfaces the real backend error.

### Q27. How does the live MP heatmap work?
`MpHeatmap.jsx` (Leaflet + heat layer, free CARTO/OSM tiles, no key): each complaint becomes a severity-weighted glow point jittered around its district centroid (`mpDistricts.js`, 50+ MP districts), bubbles sized by volume and colored Severe/Elevated/Moderate, permanent name labels, click popups with live tickets, dept/rural/urban/critical filters, layer toggles, zoom 5–12 bounded to MP. Data refetches on tab open, every 15 s while open, and right after filing.

### Q28. How does voice filing work?
`VoiceComplaintInput.jsx` uses the browser SpeechRecognition API (`hi-IN`/`en-IN` by UI language) for live transcription into the description, plus MediaRecorder audio clips. Unsupported browsers degrade to typed text — filing never blocks.

### Q29. How is bilingual support done?
No i18n library: a central `t`/`S` pattern — every label has EN + Hindi (e.g. workflow states खुला/समीक्षाधीन/कार्रवाई जारी/निराकृत), voice locale follows the toggle, and backend explanations re-run in the chosen language.

### Q30. What is the wake-up button and why does it exist?
Render free sleeps after ~15 min idle (first request then takes ~50 s). `ServerWakeButton.jsx` (web header) polls same-origin `/health` up to 12× every 8 s with live attempt feedback; the mobile app has the same control plus an auto-detecting status strip. It turns a platform limitation into a visible, user-controlled recovery.
