"""Persistence for grievance tickets.

Two layers:
  1. Local JSON file (always active) - backend/data/grievances.json.
     Survives backend restarts with zero configuration.
  2. Supabase (active when SUPABASE_URL + SUPABASE_KEY are set) -
     table `grievances`, one row per ticket. Uses the Supabase REST API
     over httpx, so no extra dependency is needed. All calls are
     best-effort with short timeouts and never break the main flow.
"""

import json
import os
from typing import Dict, Any, List, Optional

try:
    from dotenv import load_dotenv
    _here = os.path.dirname(os.path.abspath(__file__))
    load_dotenv(os.path.join(_here, ".env"))
    load_dotenv(os.path.join(_here, "..", ".env"))
except Exception:
    pass

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
LOCAL_FILE = os.path.join(DATA_DIR, "grievances.json")

TABLE = os.getenv("SUPABASE_TABLE", "grievances") or "grievances"


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name, default) or "").strip()


def supabase_configured() -> bool:
    return bool(_env("SUPABASE_URL") and _env("SUPABASE_KEY"))


def db_status() -> Dict[str, Any]:
    return {
        "local_file": True,
        "local_path": "backend/data/grievances.json",
        "supabase": supabase_configured(),
        "supabase_url": _env("SUPABASE_URL"),
        "table": TABLE,
    }


# ---------------- Local file ----------------

def load_local() -> Dict[str, Dict[str, Any]]:
    try:
        if not os.path.exists(LOCAL_FILE):
            return {}
        with open(LOCAL_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return data
        return {}
    except Exception as e:
        print(f"[db] local load failed: {e}")
        return {}


def save_local(store: Dict[str, Dict[str, Any]]) -> None:
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        tmp = LOCAL_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(store, f, ensure_ascii=False, indent=1)
        os.replace(tmp, LOCAL_FILE)
    except Exception as e:
        print(f"[db] local save failed: {e}")


# ---------------- Supabase REST ----------------

def _sb_headers() -> Dict[str, str]:
    key = _env("SUPABASE_KEY")
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def sb_load_all() -> Dict[str, Dict[str, Any]]:
    """Fetch every ticket row. Returns {} on any failure."""
    import httpx

    url = _env("SUPABASE_URL").rstrip("/")
    try:
        r = httpx.get(
            f"{url}/rest/v1/{TABLE}?select=ticket_id,data",
            headers=_sb_headers(),
            timeout=12,
        )
        if r.status_code != 200:
            print(f"[db] supabase load {r.status_code}: {r.text[:200]}")
            return {}
        out: Dict[str, Dict[str, Any]] = {}
        for row in r.json():
            tid = row.get("ticket_id")
            if tid and isinstance(row.get("data"), dict):
                out[tid] = row["data"]
        return out
    except Exception as e:
        print(f"[db] supabase load failed: {e}")
        return {}


def sb_upsert(record: Dict[str, Any]) -> bool:
    """Insert or update one ticket row. Returns True on success."""
    import httpx

    url = _env("SUPABASE_URL").rstrip("/")
    row = {
        "ticket_id": record.get("ticket_id"),
        "dept_id": record.get("dept_id", ""),
        "district": record.get("district", ""),
        "escalation_level": record.get("escalation_level", 1),
        "workflow_status": record.get("workflow_status", "open"),
        "mobile": record.get("mobile", ""),
        "citizen_email": (record.get("citizen_email") or ""),
        "data": record,
        "updated_at": record.get("updated_at", ""),
    }
    try:
        r = httpx.post(
            f"{url}/rest/v1/{TABLE}?on_conflict=ticket_id",
            headers={**_sb_headers(), "Prefer": "resolution=merge-duplicates"},
            json=row,
            timeout=12,
        )
        if r.status_code not in (200, 201):
            print(f"[db] supabase upsert {r.status_code}: {r.text[:200]}")
            return False
        return True
    except Exception as e:
        print(f"[db] supabase upsert failed: {e}")
        return False


# ---------------- Combined ----------------

def load_store() -> Dict[str, Dict[str, Any]]:
    """Startup load: local file first, Supabase rows merged on top."""
    merged = load_local()
    if supabase_configured():
        remote = sb_load_all()
        merged.update(remote)
    return merged


def persist_record(record: Dict[str, Any], store: Dict[str, Dict[str, Any]]) -> None:
    """Save one ticket locally and remotely (remote is best-effort)."""
    store[record["ticket_id"]] = record
    save_local(store)
    if supabase_configured():
        sb_upsert(record)


def persist_all(store: Dict[str, Dict[str, Any]]) -> None:
    save_local(store)
    if supabase_configured():
        for record in store.values():
            sb_upsert(record)


def fetch_by_mobile_remote(mobile: str) -> List[Dict[str, Any]]:
    """Direct Supabase lookup by mobile (used only as extra source)."""
    import httpx

    if not supabase_configured():
        return []
    url = _env("SUPABASE_URL").rstrip("/")
    try:
        r = httpx.get(
            f"{url}/rest/v1/{TABLE}?mobile=eq.{mobile}&select=data",
            headers=_sb_headers(),
            timeout=12,
        )
        if r.status_code != 200:
            return []
        return [row["data"] for row in r.json() if isinstance(row.get("data"), dict)]
    except Exception:
        return []
