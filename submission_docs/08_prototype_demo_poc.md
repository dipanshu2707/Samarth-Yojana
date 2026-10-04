# Document 8 — Prototype / Demo / Proof of Concept

> Note for upload: this .md is the text companion. For Document 8 PDF, export this + add 4–5 screenshots (Home + health dot, Aarti result EN/HI, Document verdict, Grievance dossier + heatmap) + live links. Keep final PDF <1MB (compress images).

## 1. Live Links (Verify Before Upload)

- Web: [YOUR-VERCEL-URL] (local: http://localhost:5173)
- API: https://yojana-sathi-api-orro.onrender.com — `/health`, `/health/all`, `/api/db/status`, `/api/email/status`, `/docs`
- Code paths: `backend/main.py`, `backend/matcher.py`, `backend/grievance_engine.py`, `frontend/src/`, `mobile/lib`, `schemes_dataset.json`

## 2. What Exists (Not Mockups)

- Eligibility end-to-end with 13 schemes, EN/HI toggle, MMVY 65% honest rejection.
- Document check with OCR snippet + flags + conservative verdict.
- Grievance filing with photo/voice, mobile tracking, officer desks (RAM/Shyam/Jay), real emails, heatmap, seeds SD001–SD006.
- Wake button + status dot survive Render sleep; LLM-off fallback works.

## 3. 90-Second Demo Script

| Time | Click | Say |
|---|---|---|
| 0:00–0:15 | Open site, health dot, HI/EN toggle | Millions miss benefits or get bounced for paperwork — we solve both. |
| 0:15–0:35 | Preset Aarti OBC student, 4 steps | Structured form, no hallucinating chat. Rural OBC UG 65%. |
| 0:35–0:55 | Find schemes, switch HI/EN | Deterministic: Post-Matric + Gaon Ki Beti + NSP; MMVY correctly out. AI only explains. |
| 0:55–1:15 | Check Readiness → upload doc photo | Pre-screen flags wrong/blurry/expired as Likely Acceptable / Needs Review — never approved. |
| 1:15–1:30 | File Ramesh road complaint → track by mobile → RAM→Shyam forward → email + heatmap | ID + clock + owner + proof. DPDP zero-storage. Official portal to apply. Thank you! |

## 4. Test Proof (Paste Outputs)

```
pytest backend/tests/test_unified.py -v → PASSED
pytest services/eligibility/tests/test_matcher.py → 4 personas PASS
Adversarial doc (laptop photo) → likely_wrong_document PASS
POST /api/email/test → delivered:true + messageId
```

### LLM Prompt to Polish Demo Diagram

> Create a Mermaid flowchart LR 7-node demo path: Home→Form→Results→Doc check→File grievance→Track→Officer+Heatmap. Compact, numbered, saffron accents, PDF-safe. Return only code.

## 6. Screenshot Checklist (Add Before PDF Export)

1. Home with green dot + bilingual toggle
2. Aarti matches (EN) + same in Hindi
3. Document verdict with flags
4. Ticket dossier (timeline + email log) + heatmap
Compress to <200KB each.
