import os
import json
import sys
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

from matcher import evaluate_all
from explainer import explain_matches

app = FastAPI(title="Yojana Sathi Eligibility Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATASET = None

def find_and_load_dataset():
    paths = [
        os.getenv("DATASET_PATH", ""),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "schemes_dataset.json")),
        os.path.abspath("schemes_dataset.json"),
        "/app/schemes_dataset.json"
    ]
    for p in paths:
        if p and os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if "schemes" not in data or not isinstance(data["schemes"], list):
                        raise ValueError(f"Dataset at {p} is missing 'schemes' list")
                    print(f"[Eligibility] Successfully loaded {len(data['schemes'])} schemes from {p}")
                    return data
            except Exception as e:
                raise RuntimeError(f"FATAL: schemes_dataset.json at {p} failed validation: {e}")

    raise RuntimeError("FATAL: schemes_dataset.json could not be found in any expected location.")

# Load dataset at service startup and hard-fail if invalid
DATASET = find_and_load_dataset()

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "eligibility",
        "schemes_count": len(DATASET["schemes"]) if DATASET else 0
    }

@app.post("/match")
async def match_endpoint(profile: dict = Body(...)):
    if not DATASET:
        raise HTTPException(status_code=500, detail="Schemes dataset not loaded")
    
    # 1. Pure-Python rule-based evaluation
    raw_result = evaluate_all(profile, DATASET)

    # 2. Plain-language explanation layer (LLM or fallback)
    language = profile.get("language", "en")
    
    if raw_result.get("matches"):
        raw_result["matches"] = await explain_matches(
            raw_result["matches"], profile, language=language
        )
        
    if raw_result.get("possible_but_unconfirmed"):
        raw_result["possible_but_unconfirmed"] = await explain_matches(
            raw_result["possible_but_unconfirmed"], profile, language=language
        )

    return raw_result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
