"""Real outbound email for grievance workflow.

Free, no-credit-card providers supported (auto-selected):
  1. Brevo API (300 emails/day free, no card) when BREVO_API_KEY is set.
  2. Gmail SMTP (smtp.gmail.com:587, ~500/day free, no card) when
     SMTP_USER + SMTP_PASSWORD (Gmail App Password) are set.

If neither is configured, sending is disabled and callers get a
truthful disabled status instead of a faked success.
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, List, Optional

try:
    from dotenv import load_dotenv
    _here = os.path.dirname(os.path.abspath(__file__))
    load_dotenv(os.path.join(_here, ".env"))
    load_dotenv(os.path.join(_here, "..", ".env"))
except Exception:
    pass


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name, default) or "").strip()


def active_provider() -> str:
    """Return 'brevo', 'smtp', or 'none'."""
    if _env("BREVO_API_KEY"):
        return "brevo"
    if _env("SMTP_USER") and _env("SMTP_PASSWORD"):
        return "smtp"
    return "none"


def is_configured() -> bool:
    return active_provider() != "none"


def get_status() -> Dict:
    provider = active_provider()
    if provider == "brevo":
        return {
            "configured": True,
            "provider": "brevo",
            "from": _env("BREVO_SENDER") or _env("SMTP_FROM") or _env("SMTP_USER"),
            "free_tier": "300 emails/day, no credit card",
        }
    if provider == "smtp":
        return {
            "configured": True,
            "provider": "smtp",
            "host": _env("SMTP_HOST", "smtp.gmail.com"),
            "port": int(_env("SMTP_PORT", "587") or 587),
            "from": _env("SMTP_FROM") or _env("SMTP_USER"),
            "free_tier": "Gmail SMTP free, no credit card (App Password required)",
        }
    return {
        "configured": False,
        "provider": "none",
        "hint": "Set BREVO_API_KEY or SMTP_USER+SMTP_PASSWORD to enable real delivery.",
    }


def _send_via_brevo(to: List[str], subject: str, text: str, html: Optional[str] = None) -> Dict:
    import httpx

    api_key = _env("BREVO_API_KEY")
    sender = _env("BREVO_SENDER") or _env("SMTP_FROM") or _env("SMTP_USER", "noreply@mp.gov.in")
    sender_name = _env("BREVO_SENDER_NAME", "MP CM Online")
    payload = {
        "sender": {"email": sender, "name": sender_name},
        "to": [{"email": addr} for addr in to],
        "subject": subject,
        "textContent": text,
    }
    if html:
        payload["htmlContent"] = html
    try:
        r = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"api-key": api_key, "Content-Type": "application/json"},
            json=payload,
            timeout=15,
        )
        if r.status_code in (200, 201):
            body = r.json()
            return {"ok": True, "provider": "brevo", "message_id": body.get("messageId", "")}
        return {"ok": False, "provider": "brevo", "error": f"Brevo {r.status_code}: {r.text[:300]}"}
    except Exception as e:
        return {"ok": False, "provider": "brevo", "error": str(e)[:300]}


def _send_via_smtp(to: List[str], subject: str, text: str, html: Optional[str] = None) -> Dict:
    host = _env("SMTP_HOST", "smtp.gmail.com")
    port = int(_env("SMTP_PORT", "587") or 587)
    user = _env("SMTP_USER")
    password = _env("SMTP_PASSWORD")
    sender = _env("SMTP_FROM") or user
    msg = MIMEMultipart("alternative")
    msg["From"] = sender
    msg["To"] = ", ".join(to)
    msg["Subject"] = subject
    msg.attach(MIMEText(text, "plain", "utf-8"))
    if html:
        msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        with smtplib.SMTP(host, port, timeout=20) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(sender, to, msg.as_string())
        return {"ok": True, "provider": "smtp", "message_id": ""}
    except Exception as e:
        return {"ok": False, "provider": "smtp", "error": str(e)[:400]}


def send_email(to_addrs, subject: str, text: str, html: Optional[str] = None) -> Dict:
    if isinstance(to_addrs, str):
        to_addrs = [to_addrs]
    to_addrs = [a.strip() for a in (to_addrs or []) if a and "@" in a]
    if not to_addrs:
        return {"ok": False, "provider": active_provider(), "error": "No valid recipient address."}
    provider = active_provider()
    if provider == "brevo":
        return _send_via_brevo(to_addrs, subject, text, html)
    if provider == "smtp":
        return _send_via_smtp(to_addrs, subject, text, html)
    return {"ok": False, "provider": "none", "error": "Email not configured."}


def ticket_subject(prefix: str, ticket_id: str, title: str) -> str:
    short = (title or "")[:70]
    return f"{prefix} {ticket_id} - {short}"


def ticket_body(ticket: Dict, action_line: str, actor: str = "") -> str:
    lines = [
        "MP CM Online - Grievance update",
        "",
        f"Ticket: {ticket.get('ticket_id')}",
        f"Title: {ticket.get('title')}",
        f"Department: {ticket.get('department')} ({ticket.get('dept_id')})",
        f"District: {ticket.get('district')} - {ticket.get('block_or_ward')}",
        f"Citizen: {ticket.get('citizen_name')} ({ticket.get('mobile_masked')})",
        f"Tier: Level {ticket.get('escalation_level')} | Workflow: {ticket.get('workflow_status')} | Priority: {ticket.get('priority')}",
        f"SLA: {ticket.get('sla_days_remaining')} days remaining (deadline {ticket.get('sla_deadline')})",
        "",
        action_line,
    ]
    if actor:
        lines += ["", f"By: {actor}"]
    lines += ["", f"Description: {(ticket.get('description') or '')[:800]}"]
    if ticket.get("photo_evidence_url"):
        lines += ["", f"Photo proof attached in portal dossier for {ticket.get('ticket_id')}."]
    return "\n".join(lines)
