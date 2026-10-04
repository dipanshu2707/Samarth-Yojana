# Presentation Builder Prompt — Samarth Yojana (MPOnline)

Copy everything between the bars into your slide builder
(Gamma / Beautiful.ai / Canva AI / ChatGPT + Designer). 16:9, 6 slides.
Replace `[TEAM …]` placeholders before generating.

---

## ★ COPY-PASTE PROMPT ★

Build a 6-slide, 16:9 hackathon pitch deck for **"Samarth Yojana — MPOnline"**,
a citizen grievance-redressal + welfare-scheme portal for Madhya Pradesh
(MPOnline Idea & Innovation Hackathon 2026, Challenge 5). Team: [TEAM NAMES].

DESIGN LANGUAGE (strict): deep-ink navy background `#0B1026` → indigo `#1E1B4B`
gradients, saffron `#F59E0B` accents, white cards with 20px radius and soft
shadows, Inter/Outfit-style bold headings, max 5 bullets per slide, one hero
visual per slide. Tone: confident, civic, demo-driven. No clip-art, no
generic box-and-arrow clip diagrams — draw the structured diagrams specified
below with labeled lanes, stages, and data annotations.

SLIDE 1 — Title. Hero: "Samarth Yojana • MPOnline" + tagline "Every complaint
tracked. Every scheme within reach." + badges row: "CM Helpline 181" /
"3-Tier SLA Redressal" / "13+ Schemes" / "100% Free-Tier Cloud". Footer:
Hackathon 2026 • Challenge 5 • [TEAM NAMES]. Background: dark gradient with
a faint MP map outline watermark.

SLIDE 2 — Problem → Solution (ONE slide, split layout). LEFT (pain, red
accents): citizens lose benefits to confusing eligibility; civic complaints
die in registers — no tracking, no proof, no accountability; officials drown
in duplicate paper reports. RIGHT (solution, emerald accents): (1) multimodal
grievance filing — text, Hindi/English voice transcription, photo proof —
auto-triaged to 1 of 5 departments; (2) guaranteed 3-tier escalation L1 Dept
(7-day SLA) → L2 Collector (3-day) → L3 CM Office (1-day) with immutable
audit timeline + real email at every hop; (3) mobile-number tracking, zero
login; (4) rule-based scheme matcher (zero hallucination) + OCR document
pre-screen. Running example thread (reuse on later slides): *Ramesh's
soybean-mandi road in Sehore, filed with a pothole photo.*

SLIDE 3 — Grievance workflow: full structural swimlane diagram (the
centerpiece — NOT generic boxes). Three horizontal lanes: CITIZEN / SYSTEM
(AI + rules) / AUTHORITY TIERS. Nodes and flows: Citizen files (dept picked
or AI-triaged with confidence %, human-review fallback below 75%) → System
deduplicates (≥3-keyword overlap merges + co-complainant counter), scores
hotspot, opens 7-day SLA clock → L1 desk acts (In-Review / In-Progress /
request-approval-up / Resolve) → on SLA breach auto-escalates to L2 Collector
(with show-cause), then L3 CM Office apex → Resolved with officer note +
evidence. Side annotations: every transition sends a REAL email (Brevo) and
appends an immutable timeline stage; citizen watches everything via mobile
number. Lane colors: citizen sky, system violet, L1 blue / L2 amber / L3
rose. Title: "A complaint can never die quietly."

SLIDE 4 — System architecture: layered deployment diagram, top to bottom:
CLIENTS (React 18 + Vite + Tailwind web on Vercel; Flutter mobile app, same
REST contract) → EDGE (Vercel rewrites proxy /api, /health, /uploads to the
API origin) → ONE unified FastAPI service on Render (free tier): eligibility
rule engine (in-process), OCR + vision document check (transient memory,
DPDP-compliant), grievance + 3-tier SLA engine, role auth, Brevo mail
dispatcher → DATA & SERVICES: Supabase Postgres (grievances table, indexed
dept/district/level/status/mobile + JSONB dossier), Supabase Storage
`evidence` bucket (permanent photo proofs), Brevo (300 mails/day). Annotate
flows with real endpoint names: POST /api/grievance/submit, /{id}/escalate,
/{id}/status, GET /by-mobile/{n}, POST /api/match, POST /api/check-document.
Callout box: "Why one service: fits a free tier, zero inter-service hops,
one pipeline — contract unchanged." Side note: local disk is only a fallback
because Render's disk is ephemeral.

SLIDE 5 — Technical stack + why (table layout, 2 columns: choice → reason).
Frontend: React 18 + Vite 6 + Tailwind 3 (fast, bilingual in days), Leaflet +
heat layer (keyless MP map), Web Speech API (free Hindi/English voice).
Backend: FastAPI + Pydantic v2 (typed contracts caught a real py3.12-only
NameError pre-deploy), rule-based matcher (deterministic, zero hallucination
— LLM only explains), Tesseract OCR + vision heuristics (honest verdicts:
likely_acceptable / needs_review / likely_wrong_document). Data/mail: Supabase
(free 500 MB + 1 GB storage), Brevo (free 300/day, verified sender). Mobile:
Flutter (one codebase, same REST). Ops math strip at bottom: "₹0/month —
Render $0 + Vercel $0 + Supabase $0 + Brevo $0. Only limit: Render sleeps
after 15 min idle → in-app Wake button polls /health back to life."

SLIDE 6 — Live proof + impact + ask. Left: 60-second demo script —
(0:00) file Ramesh's road complaint with photo on the site; (0:20) track it
by mobile number; (0:35) sign in as RAM (L1), forward to Shyam (L2), show the
email + timeline + MP heatmap lighting up. Right: impact bullets — every
complaint gets an ID, a clock, and an owner; duplicates merge into community
weight; Collector/CMO see live district load. Roadmap line: GPS-tagged pins,
SMS/IVR updates, analytics for collectors. Closing line: "Justice delayed is
justice denied — we put a clock on it." + QR placeholder to the live site.

Also generate speaker notes (30–45 sec per slide) in the same voice.

---

## Content pack (facts the builder must not invent)

- Event: MPOnline Idea & Innovation Hackathon 2026, Challenge 5 (AI for public services).
- 13 schemes (MP + Central); MMVY correctly rejects 65% (needs 70%+) — the honest-engineering anecdote.
- 5 departments, one shared L1 desk mail; roles: RAM (L1 Nodal), Shyam (L2 Collector), Jay (L3 CMO Apex).
- Helpline 181; DPDP Act 2023: documents processed transiently, never stored; only grievance dossiers persist.
- Live backend: https://yojana-sathi-api-orro.onrender.com (/health, /api/db/status, /api/email/status for on-stage proof).
- Seed demo data: 6 tickets SD001–SD006 spanning L1/L2/L3 + mobile 9826011223 (2 linked complaints).
- Repos paths (if asked): backend/main.py, grievance_engine.py, auth.py, db.py, email_service.py, object_store.py; frontend/src + mobile/lib.
