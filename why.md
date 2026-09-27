What it does: Yojana Sathi helps an MP citizen figure out which government welfare/scholarship schemes they actually qualify for, and checks whether their documents are likely to pass before they go apply in person — so people stop missing benefits they're already entitled to, and stop getting bounced for paperwork mistakes.

How it works, in three steps:

Answer 8 simple questions — age, income, category, education, etc. (a structured form, not open chat, so there's nothing to misunderstand).
Get matched schemes — a rule engine checks the answers against a dataset of 13 real MP + Central government schemes, and an LLM turns the raw match into a plain-language "here's why you qualify" for each one.
Check your documents — upload a photo of each required document; OCR + a vision-capable LLM flags whether it looks like the right document and is legible, before the citizen submits it for real.
Under the hood: three small backend services (a gateway, an eligibility engine, a document checker) plus a React frontend, talking over simple REST calls — no custom-trained AI, no fake government integration, nothing stored after the session ends. Every scheme fact comes from a real, sourced dataset, not something the AI made up.

The honest bit: it's a decision-support tool, not an approval system — it always says "likely acceptable" or "needs review," never "approved," and always points back to the scheme's official portal for the citizen to actually confirm and apply.