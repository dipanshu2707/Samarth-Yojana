"""Evidence image storage: Supabase Storage (persistent) with local disk fallback.

On Render's free tier the local filesystem is ephemeral, so when
SUPABASE_URL + SUPABASE_KEY are set, uploads go to a public Supabase
bucket (free 1 GB) and the ticket stores a permanent https URL.
Without Supabase configured, files land in backend/uploads/ and are
served at /uploads/... as before.
"""

import os
from typing import Optional

try:
    from dotenv import load_dotenv
    _here = os.path.dirname(os.path.abspath(__file__))
    load_dotenv(os.path.join(_here, ".env"))
    load_dotenv(os.path.join(_here, "..", ".env"))
except Exception:
    pass


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name, default) or "").strip()


def bucket_name() -> str:
    return _env("SUPABASE_STORAGE_BUCKET", "evidence") or "evidence"


def storage_configured() -> bool:
    return bool(_env("SUPABASE_URL") and _env("SUPABASE_KEY"))


def storage_status() -> dict:
    return {
        "supabase_storage": storage_configured(),
        "bucket": bucket_name(),
        "local_fallback": True,
    }


def _sb_headers(extra: Optional[dict] = None) -> dict:
    key = _env("SUPABASE_KEY")
    h = {"apikey": key, "Authorization": f"Bearer {key}"}
    if extra:
        h.update(extra)
    return h


def ensure_bucket() -> bool:
    """Create the public bucket if missing. Best-effort, returns success."""
    import httpx

    if not storage_configured():
        return False
    url = _env("SUPABASE_URL").rstrip("/")
    name = bucket_name()
    try:
        r = httpx.post(
            f"{url}/storage/v1/bucket",
            headers=_sb_headers({"Content-Type": "application/json"}),
            json={"id": name, "name": name, "public": True},
            timeout=15,
        )
        if r.status_code in (200, 201):
            print(f"[storage] bucket '{name}' ready")
            return True
        # 400/409 usually means it already exists - verify with a listing.
        check = httpx.get(f"{url}/storage/v1/bucket/{name}", headers=_sb_headers(), timeout=15)
        ok = check.status_code == 200
        print(f"[storage] bucket '{name}' exists: {ok}")
        return ok
    except Exception as e:
        print(f"[storage] bucket ensure failed: {e}")
        return False


def upload_bytes(filename: str, data: bytes, content_type: str) -> Optional[str]:
    """Upload to Supabase Storage, return the public https URL or None."""
    import httpx

    if not storage_configured():
        return None
    url = _env("SUPABASE_URL").rstrip("/")
    name = bucket_name()
    safe = "".join(c for c in filename if c.isalnum() or c in ("-", "_", "."))
    try:
        r = httpx.post(
            f"{url}/storage/v1/object/{name}/{safe}",
            headers=_sb_headers({"Content-Type": content_type or "image/jpeg", "x-upsert": "true"}),
            content=data,
            timeout=30,
        )
        if r.status_code not in (200, 201):
            print(f"[storage] upload {r.status_code}: {r.text[:200]}")
            return None
        return f"{url}/storage/v1/object/public/{name}/{safe}"
    except Exception as e:
        print(f"[storage] upload failed: {e}")
        return None
