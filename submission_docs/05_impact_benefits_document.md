# Document 5 — Impact & Benefits Document

## 1. Social Impact

- **Reach:** Covers students (Post-Matric ~₹500×10/mo, Gaon Ki Beti, MMVY up to ₹1.5L/yr, NSP), women (Ladli Behna ₹1250/mo, 1.29Cr+ beneficiaries; Ladli Laxmi staged + ₹1L at 21), youth (Seekho Kamao ₹8000–10000 stipend + SCVT), families (PM-JAY ₹5L cashless).
- **Saving:** One pre-screen avoids one tehsil trip (₹200–500 + daily wage). At pilot scale (10k users) ≈ ₹20–50L citizen savings.
- **Equity:** Hindi-first, voice-first, phone-responsive; rural boost (e.g. Gaon Ki Beti rural-only correctly enforced).

## 2. Governance Impact

- Every grievance gets ID, SLA clock, owner, evidence URL, email log — RTI-verifiable.
- Duplicates become community weight (co-complainant counter) + hotspot signal for Collector/CMO.
- 5-dept load + criticals + rural/urban split visible on heatmap + district cards.
- L1→L2→L3 escalation with show-cause creates accountability without new staff.

## 3. Economic & Sustainability

- **Cost:** ₹0/month — Render $0 + Vercel $0 + Supabase $0 (500MB DB + 1GB storage) + Brevo $0 (300/day). No credit card.
- **Ops:** One pipeline, one health check, wake-button self-heals sleep. Local JSON mirror prevents data loss.
- **Scale:** Stateless API + indexed Postgres (`dept_id/district/level/status/mobile` + JSONB dossier) scales to all 55 MP districts.

## 4. Educational Impact

Plain-language why per scheme, exact document checklist, official portal link + permanent disclaimer on every card. Citizens learn cutoffs (e.g. 65% ≠ MMVY) instead of facing rejection.

## 5. Measured Benefits (MVP)

- Form → result <60s, bilingual toggle no reload.
- 4 personas + adversarial doc test pass (`pytest backend/tests/test_unified.py`).
- Grievance file → email <10s; doc check <5s; 60 req/min abuse guard; 4–5MB upload caps.
- Offline fallback: rule-only results when LLM down; typed fallback when voice unsupported.

## 6. Safeguards

Decision support only. No approved/accepted claims. No private data storage (docs transient). Only consented grievance dossiers persist. Links always to official portals.
