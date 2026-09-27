import os
import sys
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

from ocr import extract_text_from_image
from vision_check import check_document_readiness

app = FastAPI(title="Yojana Sathi Document Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 5 * 1024 * 1024 # 5 MB

@app.get("/health")
async def health():
    return {"status": "ok", "service": "document"}

@app.post("/check-document")
async def check_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    scheme_id: str = Form(default="")
):
    # Validate content type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {file.content_type}. Please upload a JPG, PNG, or WebP image."
        )

    # Read image into memory
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds the 5MB limit. Please upload a smaller or compressed photo."
        )

    try:
        # Step 1: Run OCR
        extracted_text, metadata = extract_text_from_image(contents)

        # Step 2: Run Document Readiness Vision Evaluation
        result = await check_document_readiness(
            image_bytes=contents,
            document_type=document_type,
            scheme_context=scheme_id,
            extracted_text=extracted_text,
            metadata=metadata
        )

        # DPDP Act 2023 compliance: image is processed transiently in memory and never persisted
        del contents

        # Add brief text snippet for transparency if available
        if extracted_text:
            result["extracted_text_snippet"] = extracted_text[:200] + ("..." if len(extracted_text) > 200 else "")
        else:
            result["extracted_text_snippet"] = None

        return result

    except Exception as e:
        print(f"[Document Service] Error processing document: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while inspecting the document: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
