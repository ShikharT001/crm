import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app import models
from app.services.template_service import seed_org_product_template

def test_module3_templates_and_org_seeding():
    db = SessionLocal()
    try:
        # Check that templates exist
        templates_count = db.query(models.IndustryTemplate).count()
        print(f"Total Industry Templates in DB: {templates_count}")
        assert templates_count >= 12, f"Expected at least 12 templates, found {templates_count}"

        # Create a mock company
        test_comp = models.Company(
            name="Test Clothing Store",
            domain="testclothing.com",
            industry="Clothing / Fashion",
            status="ACTIVE",
            max_users=10
        )
        db.add(test_comp)
        db.flush()

        # Seed template for company
        res = seed_org_product_template(db, test_comp.id, test_comp.industry)
        db.commit()
        assert res is True, "Expected seed_org_product_template to return True"

        # Check fields and categories created
        org_fields = db.query(models.OrgProductField).filter(models.OrgProductField.company_id == test_comp.id).all()
        print(f"Created OrgProductFields for company {test_comp.id}: {len(org_fields)}")
        for f in org_fields:
            print(f"  - Field: {f.label} ({f.field_type}) Options count: {len(f.options)}")

        assert len(org_fields) >= 10, "Expected at least 10 custom fields for Clothing template"

        org_categories = db.query(models.OrgCategory).filter(models.OrgCategory.company_id == test_comp.id).all()
        print(f"Created OrgCategories for company {test_comp.id}: {len(org_categories)}")
        assert len(org_categories) >= 10, "Expected at least 10 custom categories for Clothing template"

        # Cleanup test company
        db.query(models.OrgProductFieldOption).filter(
            models.OrgProductFieldOption.field_id.in_(
                db.query(models.OrgProductField.id).filter(models.OrgProductField.company_id == test_comp.id)
            )
        ).delete(synchronize_session=False)
        db.query(models.OrgProductField).filter(models.OrgProductField.company_id == test_comp.id).delete(synchronize_session=False)
        db.query(models.OrgCategory).filter(models.OrgCategory.company_id == test_comp.id).delete(synchronize_session=False)
        db.delete(test_comp)
        db.commit()

        print("\nModule 3 Template Seeding & Org Integration Test PASSED!")
    finally:
        db.close()

if __name__ == "__main__":
    test_module3_templates_and_org_seeding()
