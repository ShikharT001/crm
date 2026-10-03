"""
Module 1 Verification Test: Dynamic Product System Foundation & Models
Tests database creation, relationships, and constraints for dynamic templates, fields, categories, field values, and variants.
Run with: python tests/test_module1_models.py
"""
import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import SessionLocal, Base, engine
from app.models import (
    Company, IndustryTemplate, TemplateField, TemplateCategory,
    OrgProductField, OrgProductFieldOption, OrgCategory,
    Product, ProductFieldValue, ProductVariant
)

def run_tests():
    print("--- Running Module 1 Model & Schema Verification Tests ---")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    run_id = int(time.time())

    # Clean up previous test runs if any
    old_tmpls = db.query(IndustryTemplate).filter(IndustryTemplate.code.like("clothing_test%")).all()
    for t in old_tmpls:
        db.delete(t)
    db.commit()

    # TEST 1: Create Industry Template with Fields & Categories
    print("[Test 1] Creating Industry Template ('Clothing')...")
    tmpl = IndustryTemplate(
        name=f"Clothing / Fashion Test {run_id}",
        code=f"clothing_test_{run_id}",
        description="Template for fashion & apparel",
        product_type_default="PHYSICAL"
    )
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)

    field1 = TemplateField(
        template_id=tmpl.id,
        name="size",
        label="Size",
        field_type="MULTI_SELECT",
        filterable=True,
        options_json='["XS", "S", "M", "L", "XL"]'
    )
    field2 = TemplateField(
        template_id=tmpl.id,
        name="fabric",
        label="Fabric",
        field_type="SELECT",
        filterable=True,
        options_json='["Cotton", "Denim", "Linen"]'
    )
    db.add_all([field1, field2])

    cat1 = TemplateCategory(template_id=tmpl.id, name="Men")
    db.add(cat1)
    db.commit()

    db.refresh(tmpl)
    assert len(tmpl.fields) == 2, f"Expected 2 fields, got {len(tmpl.fields)}"
    assert len(tmpl.categories) == 1, f"Expected 1 category, got {len(tmpl.categories)}"
    print("  [OK] IndustryTemplate relationships verified.")

    # TEST 2: Create Org Product Configuration
    print("[Test 2] Creating Organization Product Field & Category...")
    company = db.query(Company).first()
    assert company is not None, "Expected at least 1 company in DB"

    org_cat = OrgCategory(
        company_id=company.id,
        name=f"Shirts {run_id}",
        slug=f"shirts_{run_id}"
    )
    db.add(org_cat)
    db.commit()

    org_field = OrgProductField(
        company_id=company.id,
        name=f"fabric_type_{run_id}",
        label="Fabric Type",
        field_type="SELECT",
        filterable=True
    )
    db.add(org_field)
    db.commit()

    opt1 = OrgProductFieldOption(field_id=org_field.id, label="100% Cotton", value="cotton")
    opt2 = OrgProductFieldOption(field_id=org_field.id, label="Denim", value="denim")
    db.add_all([opt1, opt2])
    db.commit()

    db.refresh(org_field)
    assert len(org_field.options) == 2, f"Expected 2 field options, got {len(org_field.options)}"
    print("  [OK] OrgProductField & options created successfully.")

    # TEST 3: Create Product with Dynamic Field Value & Variant
    print("[Test 3] Creating Product with Dynamic Field Value & Variant...")
    product = Product(
        company_id=company.id,
        category_id=org_cat.id,
        name="Classic Cotton Shirt",
        code=f"SHIRT-{run_id}",
        price=49.99,
        cost_price=20.00,
        product_type="PHYSICAL",
        status="ACTIVE"
    )
    db.add(product)
    db.commit()

    val = ProductFieldValue(
        product_id=product.id,
        field_id=org_field.id,
        value_text="cotton"
    )
    variant = ProductVariant(
        product_id=product.id,
        sku=f"SHIRT-{run_id}-M-BLU",
        name="Classic Cotton Shirt - Medium / Blue",
        price=49.99,
        stock_quantity=50,
        attributes_json='{"Size": "M", "Color": "Blue"}'
    )
    db.add_all([val, variant])
    db.commit()

    db.refresh(product)
    assert len(product.field_values) == 1
    assert len(product.variants) == 1
    assert product.variants[0].sku == f"SHIRT-{run_id}-M-BLU"
    print("  [OK] Product with field values and variants verified.")

    # Clean up test records
    db.delete(product)
    db.delete(tmpl)
    db.delete(org_field)
    db.delete(org_cat)
    db.commit()
    db.close()

    print("\n=======================================================")
    print("ALL MODULE 1 MODEL VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    run_tests()
