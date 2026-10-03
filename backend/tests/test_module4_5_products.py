import os
import sys
from decimal import Decimal

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app import models, schemas
from app.services.template_service import seed_org_product_template
from app.routers.products import create_product, read_products, update_product, delete_product, create_org_product_field

class MockTenantContext:
    def __init__(self, company_id, user_id=1, role="ADMIN"):
        self.organization_id = company_id
        self.company_id = company_id
        self.user_id = user_id
        self.role = role
        self.is_super_admin = (role == "SUPER_ADMIN")

def test_module4_5_dynamic_products():
    db = SessionLocal()
    try:
        # 1. Create a Test Organization (e.g. Software / SaaS)
        company = models.Company(
            name="SaaS Metrics Inc",
            domain="saasmetrics.com",
            industry="Software / SaaS",
            status="ACTIVE"
        )
        db.add(company)
        db.commit()
        db.refresh(company)

        tenant = MockTenantContext(company.id)

        # 2. Auto-seed Industry Template for SaaS Metrics Inc
        seed_org_product_template(db, company.id, company.industry)
        db.commit()

        # Verify fields & categories were seeded
        fields = db.query(models.OrgProductField).filter(models.OrgProductField.company_id == company.id).all()
        assert len(fields) > 0, "Fields should be seeded"
        print(f"Seeded {len(fields)} fields for SaaS company")

        # 3. Add a custom field to tenant via Module 4 API
        custom_field_payload = schemas.OrgProductFieldCreate(
            name="cloud_region",
            label="Default Cloud Region",
            field_type="SELECT",
            description="AWS/GCP Region",
            required=False,
            filterable=True,
            options=[
                schemas.OrgProductFieldOptionCreate(label="us-east-1", value="us-east-1"),
                schemas.OrgProductFieldOptionCreate(label="eu-central-1", value="eu-central-1"),
                schemas.OrgProductFieldOptionCreate(label="ap-south-1", value="ap-south-1")
            ]
        )
        new_field = create_org_product_field(custom_field_payload, db=db, tenant=tenant)
        print(f"Created tenant custom field: {new_field.label} with ID {new_field.id}")

        # Find field IDs for seeding product values
        version_field = next((f for f in fields if f.name == "version"), None)
        ram_field = next((f for f in fields if f.name == "ram_requirement"), None)
        api_field = next((f for f in fields if f.name == "api_available"), None)

        field_values = []
        if version_field:
            field_values.append(schemas.ProductFieldValueInput(field_id=version_field.id, value="v2.4.0"))
        if ram_field:
            field_values.append(schemas.ProductFieldValueInput(field_id=ram_field.id, value="16"))
        if api_field:
            field_values.append(schemas.ProductFieldValueInput(field_id=api_field.id, value="true"))
        field_values.append(schemas.ProductFieldValueInput(field_id=new_field.id, value="us-east-1"))

        # 4. Create Product with Dynamic Field Values & Variants via Module 5 API
        prod_payload = schemas.ProductCreate(
            name="Enterprise CRM Cloud Suite",
            code="CRM-ENT-001",
            price=Decimal("499.00"),
            cost_price=Decimal("120.00"),
            product_type="SUBSCRIPTION",
            status="ACTIVE",
            description="Full cloud CRM subscription package with unlimited API access",
            field_values=field_values,
            variants=[
                schemas.ProductVariantCreate(
                    sku="CRM-ENT-MONTHLY",
                    name="Monthly Billing Plan",
                    price=Decimal("499.00"),
                    stock_quantity=999
                ),
                schemas.ProductVariantCreate(
                    sku="CRM-ENT-YEARLY",
                    name="Yearly Billing Plan (Discounted)",
                    price=Decimal("4990.00"),
                    stock_quantity=999
                )
            ]
        )

        created_prod = create_product(prod_payload, db=db, tenant=tenant)
        print(f"\nCreated Product: {created_prod.name} (Code: {created_prod.code})")
        print(f"  Field Values count: {len(created_prod.field_values)}")
        for fv in created_prod.field_values:
            print(f"    - {fv.field_label} ({fv.field_name}): {fv.value}")

        print(f"  Variants count: {len(created_prod.variants)}")
        for v in created_prod.variants:
            print(f"    - Variant {v.sku}: {v.name} @ ${v.price}")

        assert len(created_prod.field_values) >= 3
        assert len(created_prod.variants) == 2

        # 5. Read Products
        prods = read_products(db=db, tenant=tenant)
        assert len(prods) == 1

        # 6. Cleanup
        delete_product(created_prod.id, db=db, tenant=tenant)
        db.query(models.OrgProductFieldOption).filter(
            models.OrgProductFieldOption.field_id.in_(
                db.query(models.OrgProductField.id).filter(models.OrgProductField.company_id == company.id)
            )
        ).delete(synchronize_session=False)
        db.query(models.OrgProductField).filter(models.OrgProductField.company_id == company.id).delete(synchronize_session=False)
        db.query(models.OrgCategory).filter(models.OrgCategory.company_id == company.id).delete(synchronize_session=False)
        db.delete(company)
        db.commit()

        print("\nModule 4 & 5 Dynamic Product Engine Test PASSED!")
    finally:
        db.close()

if __name__ == "__main__":
    test_module4_5_dynamic_products()
