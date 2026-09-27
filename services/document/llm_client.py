import os
import json
import base64
import httpx
from typing import Optional, Dict, Any

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "claude-3-5-sonnet-20241022")
LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT_SECONDS", "10.0"))

async def call_llm_vision(
    image_bytes: bytes,
    media_type: str,
    prompt: str,
    system_prompt: Optional[str] = None,
    max_tokens: int = 800
) -> Optional[str]:
    api_key = os.getenv("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY)
    if not api_key:
        return None

    model = os.getenv("LLM_MODEL", LLM_MODEL)
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    payload: Dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": b64_image
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ]
    }
    if system_prompt:
        payload["system"] = system_prompt

    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=payload
            )
            if response.status_code == 200:
                data = response.json()
                content_blocks = data.get("content", [])
                if content_blocks and "text" in content_blocks[0]:
                    return content_blocks[0]["text"]
            else:
                print(f"[LLM Vision] Non-200 status {response.status_code}: {response.text}")
                return None
    except Exception as e:
        print(f"[LLM Vision] Error calling vision LLM: {e}")
        return None
