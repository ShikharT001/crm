"""
Module 2 Verification Test: Predefined Industry Templates & Seed Data
Verifies that all 12 predefined system templates, fields, categories, and field configurations exist.
Run with: python tests/test_module2_templates.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models import IndustryTemplate, TemplateField, TemplateCategory

def run_tests():
    print("--- Running Module 2 Seed & Template Verification Tests ---")
    db = SessionLocal()

    # TEST 1: Count system templates
    templates = db.query(IndustryTemplate).filter(IndustryTemplate.is_system == True).all()
    assert len(templates) >= 12, f"Expected at least 12 industry templates, found {len(templates)}"
    print(f"  [OK] Found {len(templates)} active industry templates.")

    # TEST 2: Inspect Clothing template
    clothing = db.query(IndustryTemplate).filter(IndustryTemplate.code == "clothing").first()
    assert clothing is not None, "Clothing template missing!"
    assert len(clothing.fields) == 12, f"Expected 12 fields for Clothing, got {len(clothing.fields)}"
    assert len(clothing.categories) >= 4, f"Expected at least 4 parent categories for Clothing"
    print("  [OK] Clothing template & hierarchy verified.")

    # TEST 3: Inspect Software template
    software = db.query(IndustryTemplate).filter(IndustryTemplate.code == "software").first()
    assert software is not None, "Software template missing!"
    assert software.product_type_default == "SUBSCRIPTION"
    ram_field = next((f for f in software.fields if f.name == "ram_requirement"), None)
    assert ram_field is not None and ram_field.unit == "GB"
    print("  [OK] Software template & field units verified.")

    # TEST 4: Inspect Real Estate template
    real_estate = db.query(IndustryTemplate).filter(IndustryTemplate.code == "real_estate").first()
    assert real_estate is not None, "Real Estate template missing!"
    assert real_estate.product_type_default == "SERVICE"
    print("  [OK] Real Estate template verified.")

    db.close()
    print("\n=======================================================")
    print("ALL MODULE 2 SEED & TEMPLATE VERIFICATION TESTS PASSED!")
    print("=======================================================\n")

if __name__ == "__main__":
    run_tests()
