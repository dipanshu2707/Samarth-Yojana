import os
import json
import pytest
import sys

# Ensure parent directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from matcher import evaluate_all, match_scheme

def load_dataset():
    paths = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "schemes_dataset.json")),
        os.path.abspath("schemes_dataset.json"),
        os.getenv("DATASET_PATH", "/app/schemes_dataset.json")
    ]
    for p in paths:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
    raise FileNotFoundError("schemes_dataset.json not found in test search paths")

def test_dataset_loaded_properly():
    dataset = load_dataset()
    assert "schemes" in dataset
    assert len(dataset["schemes"]) >= 13
    assert "test_personas" in dataset
    assert len(dataset["test_personas"]) == 4

def test_persona_1_aarti():
    dataset = load_dataset()
    aarti = dataset["test_personas"][0]
    result = evaluate_all(aarti["profile"], dataset)
    matched_ids = [m["scheme_id"] for m in result["matches"]]
    possible_ids = [m["scheme_id"] for m in result["possible_but_unconfirmed"]]

    for expected in aarti["expect_eligible_for"]:
        assert expected in matched_ids, f"Expected Aarti to be eligible for {expected}, got matches: {matched_ids}"

    for not_expected in aarti["expect_not_eligible_for"]:
        assert not_expected not in matched_ids, f"Expected Aarti to NOT be eligible for {not_expected}"

def test_persona_2_ramesh():
    dataset = load_dataset()
    ramesh = dataset["test_personas"][1]
    result = evaluate_all(ramesh["profile"], dataset)
    matched_ids = [m["scheme_id"] for m in result["matches"]]

    for expected in ramesh["expect_eligible_for"]:
        assert expected in matched_ids, f"Expected Ramesh to be eligible for {expected}, got matches: {matched_ids}"

    for not_expected in ramesh["expect_not_eligible_for"]:
        assert not_expected not in matched_ids, f"Expected Ramesh to NOT be eligible for {not_expected}"

def test_persona_3_sunita():
    dataset = load_dataset()
    sunita = dataset["test_personas"][2]
    result = evaluate_all(sunita["profile"], dataset)
    matched_ids = [m["scheme_id"] for m in result["matches"]]
    possible_ids = [m["scheme_id"] for m in result["possible_but_unconfirmed"]]

    for expected in sunita["expect_eligible_for"]:
        assert expected in matched_ids, f"Expected Sunita to be eligible for {expected}, got matches: {matched_ids}"

    for not_expected in sunita["expect_not_eligible_for"]:
        assert not_expected not in matched_ids, f"Expected Sunita to NOT be eligible for {not_expected}"
    
    # Awas should be in possible_but_unconfirmed because prerequisite info is missing
    assert "mp_ladli_behna_awas" in possible_ids, "Expected Ladli Behna Awas to be in possible_but_unconfirmed"

def test_persona_4_neha():
    dataset = load_dataset()
    neha = dataset["test_personas"][3]
    result = evaluate_all(neha["profile"], dataset)
    matched_ids = [m["scheme_id"] for m in result["matches"]]

    for expected in neha["expect_eligible_for"]:
        assert expected in matched_ids, f"Expected Neha to be eligible for {expected}, got matches: {matched_ids}"

def test_ladli_laxmi_older_unregistered_disqualified():
    dataset = load_dataset()
    older_girl_profile = {
        "age": 14,
        "gender": "female",
        "residency": "Madhya Pradesh",
        "birth_year": 2012,
        "registered_at_anganwadi": False,
        "parents_income_tax_payer": False
    }
    result = evaluate_all(older_girl_profile, dataset)
    matched_ids = [m["scheme_id"] for m in result["matches"]]
    assert "mp_ladli_laxmi" not in matched_ids, "Older girl who was never registered as an infant should NOT qualify for Ladli Laxmi"

def test_ladli_behna_awas_full_qualification():
    dataset = load_dataset()
    sunita_with_housing = {
        "age": 34,
        "gender": "female",
        "residency": "Madhya Pradesh",
        "category": "General",
        "annual_family_income": 150000,
        "marital_status": "married",
        "occupation": "homemaker",
        "owns_agricultural_land_acres": 1,
        "owns_four_wheeler": false if 'false' in globals() else False,
        "income_tax_payer": False,
        "is_ladli_behna_beneficiary": True,
        "is_homeless_or_kutcha_house": True,
        "excluded_from_pmay": True
    }
    result = evaluate_all(sunita_with_housing, dataset)
    matched_ids = [m["scheme_id"] for m in result["matches"]]
    assert "mp_ladli_behna_awas" in matched_ids, "Should qualify for Ladli Behna Awas when prerequisites are confirmed"
