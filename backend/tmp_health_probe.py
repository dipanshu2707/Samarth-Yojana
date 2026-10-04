import httpx

checks = [
    ("backend /health", "http://127.0.0.1:8000/health"),
    ("frontend /", "http://127.0.0.1:5173/"),
    ("helpdesk status", "http://127.0.0.1:8000/api/helpdesk/status"),
]
for name, url in checks:
    try:
        r = httpx.get(url, timeout=30)
        extra = ""
        if "helpdesk" in url and r.status_code == 200:
            d = r.json()
            extra = " v=%s stream=%s" % (d.get("helpdesk_version"), d.get("stream"))
        print("%s: %s%s" % (name, r.status_code, extra))
    except Exception as e:
        print("%s: FAILED %s" % (name, str(e)[:100]))
