"""
ocr.py - OCR extraction module using pytesseract with graceful fallback.
"""

import io
from typing import Dict, Any, Tuple
from PIL import Image

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

def extract_text_from_image(image_bytes: bytes) -> Tuple[str, Dict[str, Any]]:
    """
    Extracts text from an image using pytesseract if available.
    Returns:
        (extracted_text, metadata)
    """
    metadata = {
        "ocr_engine": "tesseract",
        "tesseract_available": False,
        "width": 0,
        "height": 0,
        "format": "UNKNOWN"
    }

    try:
        img = Image.open(io.BytesIO(image_bytes))
        metadata["width"] = img.width
        metadata["height"] = img.height
        metadata["format"] = img.format or "JPEG"

        # Check image legibility heuristic based on resolution
        if img.width < 300 or img.height < 300:
            metadata["low_resolution"] = True
        else:
            metadata["low_resolution"] = False

        if not PYTESSERACT_AVAILABLE:
            return "", metadata

        try:
            # Try running OCR (English + Hindi if installed)
            text = pytesseract.image_to_string(img, timeout=5)
            metadata["tesseract_available"] = True
            return text.strip(), metadata
        except pytesseract.TesseractNotFoundError:
            # Tesseract binary not in system PATH
            metadata["note"] = "Tesseract OCR binary not installed in environment; vision model will be primary reader."
            return "", metadata
        except Exception as ocr_err:
            metadata["ocr_error"] = str(ocr_err)
            return "", metadata

    except Exception as e:
        metadata["error"] = f"Failed to process image: {e}"
        return "", metadata
