import os
import sys
import io
import pytest
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ocr import extract_text_from_image
from vision_check import heuristic_document_check, check_document_readiness

def create_sample_image(width=400, height=300, color="white"):
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def test_ocr_extract_low_res():
    low_res_bytes = create_sample_image(width=100, height=100)
    text, meta = extract_text_from_image(low_res_bytes)
    assert meta["low_resolution"] is True

def test_adversarial_wrong_document():
    """Test adversarial image where document does not match expected criteria"""
    bytes_data = create_sample_image(width=600, height=400, color="blue")
    _, meta = extract_text_from_image(bytes_data)
    
    # Check with no valid text extracted
    res = heuristic_document_check(
        document_type="income_certificate",
        extracted_text="Random photo of laptop keyboard 12345",
        metadata=meta
    )
    # Must NOT claim likely_acceptable for wrong/unrecognized content
    assert res["verdict"] in ["needs_review", "likely_wrong_document"]
    assert res["matches_expected_type"] is False
    assert res["verdict"] != "likely_acceptable"

def test_valid_income_certificate_keywords():
    bytes_data = create_sample_image(width=600, height=400)
    _, meta = extract_text_from_image(bytes_data)
    res = heuristic_document_check(
        document_type="income_certificate",
        extracted_text="GOVERNMENT OF MADHYA PRADESH REVENUE DEPARTMENT ANNUAL INCOME CERTIFICATE AAY PRAMAN PATRA",
        metadata=meta
    )
    assert res["matches_expected_type"] is True
    assert res["verdict"] == "likely_acceptable"
