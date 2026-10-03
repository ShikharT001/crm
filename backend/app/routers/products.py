import json
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models, schemas
from app.database import get_db
from app.routers.auth import require_feature, require_permission, TenantContext

router = APIRouter(prefix="/api/products", tags=["Products"])

# ─── Helper: Format Product Response ──────────────────────────────────────────

def _build_product_response(product: models.Product, db: Session) -> schemas.ProductResponse:
    # 1. Fetch Field Values
    f_values = db.query(models.ProductFieldValue).filter(
        models.ProductFieldValue.product_id == product.id
    ).all()

    formatted_values = []
    for fv in f_values:
        field = db.query(models.OrgProductField).filter(models.OrgProductField.id == fv.field_id).first()
        val = None
        if fv.value_text is not None:
            val = fv.value_text
        elif fv.value_number is not None:
            val = str(fv.value_number)
        elif fv.value_boolean is not None:
            val = str(fv.value_boolean)
        elif fv.value_json is not None:
            val = fv.value_json

        formatted_values.append(schemas.ProductFieldValueResponse(
            id=fv.id,
            field_id=fv.field_id,
            field_name=field.name if field else None,
            field_label=field.label if field else None,
            field_type=field.field_type if field else None,
            value=val
        ))

    # 2. Fetch Variants
    variants = db.query(models.ProductVariant).filter(
        models.ProductVariant.product_id == product.id
    ).all()

    # 3. Fetch Category Name
    cat_name = None
    if product.category_id:
        cat = db.query(models.OrgCategory).filter(models.OrgCategory.id == product.category_id).first()
        if cat:
            cat_name = cat.name

    return schemas.ProductResponse(
        id=product.id,
        company_id=product.company_id,
        name=product.name,
        code=product.code,
        price=product.price,
        cost_price=product.cost_price,
        product_type=product.product_type,
        status=product.status,
        stock_quantity=product.stock_quantity,
        track_inventory=product.track_inventory,
        category_id=product.category_id,
        category_name=cat_name,
        description=product.description,
        images_json=product.images_json,
        created_at=product.created_at,
        updated_at=product.updated_at,
        field_values=formatted_values,
        variants=[schemas.ProductVariantResponse.model_validate(v) for v in variants]
    )

def _save_field_values(db: Session, product_id: int, field_values_input: List[schemas.ProductFieldValueInput], company_id: int):
    for item in field_values_input:
        field = db.query(models.OrgProductField).filter(
            models.OrgProductField.id == item.field_id,
            models.OrgProductField.company_id == company_id
        ).first()
        if not field:
            continue

        existing_val = db.query(models.ProductFieldValue).filter(
            models.ProductFieldValue.product_id == product_id,
            models.ProductFieldValue.field_id == item.field_id
        ).first()

        val_text = None
        val_number = None
        val_boolean = None
        val_json = None

        raw_val = item.value
        if raw_val is not None and raw_val != "":
            if field.field_type in ("NUMBER", "CURRENCY"):
                try:
                    val_number = Decimal(str(raw_val))
                except Exception:
                    val_text = str(raw_val)
            elif field.field_type == "BOOLEAN":
                val_boolean = str(raw_val).lower() in ("true", "1", "yes")
            elif field.field_type == "MULTI_SELECT" and isinstance(raw_val, (list, dict)):
                val_json = json.dumps(raw_val)
                val_text = ", ".join(raw_val) if isinstance(raw_val, list) else str(raw_val)
            else:
                val_text = str(raw_val)

        if existing_val:
            existing_val.value_text = val_text
            existing_val.value_number = val_number
            existing_val.value_boolean = val_boolean
            existing_val.value_json = val_json
        else:
            new_val = models.ProductFieldValue(
                product_id=product_id,
                field_id=item.field_id,
                value_text=val_text,
                value_number=val_number,
                value_boolean=val_boolean,
                value_json=val_json
            )
            db.add(new_val)

# ─── Module 4: Tenant Custom Product Fields ───────────────────────────────────

@router.get("/fields/", response_model=List[schemas.OrgProductFieldResponse])
def list_org_product_fields(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("products"))
):
    fields = db.query(models.OrgProductField).filter(
        models.OrgProductField.company_id == tenant.organization_id
    ).order_by(models.OrgProductField.display_order).all()
    return fields

@router.post("/fields/", response_model=schemas.OrgProductFieldResponse, status_code=201)
def create_org_product_field(
    payload: schemas.OrgProductFieldCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("products"))
):
    options_data = payload.options or []
    field_data = payload.model_dump(exclude={"options"})
    field_data["company_id"] = tenant.organization_id

    # Check duplicate field name for organization
    existing = db.query(models.OrgProductField).filter(
        models.OrgProductField.company_id == tenant.organization_id,
        models.OrgProductField.name == payload.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Field with code name '{payload.name}' already exists.")

    field = models.OrgProductField(**field_data)
    db.add(field)
    db.flush()

    for opt_input in options_data:
        opt = models.OrgProductFieldOption(
            field_id=field.id,
            label=opt_input.label,
            value=opt_input.value,
            display_order=opt_input.display_order,
            is_active=opt_input.is_active
        )
        db.add(opt)

    db.commit()
    db.refresh(field)
    return field

@router.put("/fields/{field_id}", response_model=schemas.OrgProductFieldResponse)
def update_org_product_field(
    field_id: int,
    payload: schemas.OrgProductFieldUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("products"))
):
    field = db.query(models.OrgProductField).filter(
        models.OrgProductField.id == field_id,
        models.OrgProductField.company_id == tenant.organization_id
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Product field not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(field, key, value)

    db.commit()
    db.refresh(field)
    return field

@router.delete("/fields/{field_id}", status_code=204)
def delete_org_product_field(
    field_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("products"))
):
    field = db.query(models.OrgProductField).filter(
        models.OrgProductField.id == field_id,
        models.OrgProductField.company_id == tenant.organization_id
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Product field not found")

    db.query(models.ProductFieldValue).filter(models.ProductFieldValue.field_id == field_id).delete(synchronize_session=False)
    db.query(models.OrgProductFieldOption).filter(models.OrgProductFieldOption.field_id == field_id).delete(synchronize_session=False)
    db.delete(field)
    db.commit()
    return None

# ─── Module 4: Tenant Categories ──────────────────────────────────────────────

@router.get("/categories/", response_model=List[schemas.OrgCategoryResponse])
def list_org_categories(
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("products"))
):
    cats = db.query(models.OrgCategory).filter(
        models.OrgCategory.company_id == tenant.organization_id
    ).order_by(models.OrgCategory.display_order).all()
    
    # Return top-level categories with children populated
    top_cats = [c for c in cats if c.parent_id is None]
    return top_cats

@router.post("/categories/", response_model=schemas.OrgCategoryResponse, status_code=201)
def create_org_category(
    payload: schemas.OrgCategoryCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("products"))
):
    cat_data = payload.model_dump()
    cat_data["company_id"] = tenant.organization_id

    category = models.OrgCategory(**cat_data)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.put("/categories/{category_id}", response_model=schemas.OrgCategoryResponse)
def update_org_category(
    category_id: int,
    payload: schemas.OrgCategoryCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("products"))
):
    category = db.query(models.OrgCategory).filter(
        models.OrgCategory.id == category_id,
        models.OrgCategory.company_id == tenant.organization_id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(category, key, val)

    db.commit()
    db.refresh(category)
    return category

@router.delete("/categories/{category_id}", status_code=204)
def delete_org_category(
    category_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("products"))
):
    category = db.query(models.OrgCategory).filter(
        models.OrgCategory.id == category_id,
        models.OrgCategory.company_id == tenant.organization_id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Unlink products assigned to this category
    db.query(models.Product).filter(models.Product.category_id == category_id).update({"category_id": None})
    db.delete(category)
    db.commit()
    return None

# ─── Module 5: Dynamic Product Engine CRUD ────────────────────────────────────

@router.get("/", response_model=List[schemas.ProductResponse])
def read_products(
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    product_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("products")),
    user: models.User = Depends(require_permission("products.view"))
):
    query = db.query(models.Product)
    if not tenant.is_super_admin:
        query = query.filter(models.Product.company_id == tenant.organization_id)

    if category_id:
        query = query.filter(models.Product.category_id == category_id)
    if product_type:
        query = query.filter(models.Product.product_type == product_type)
    if status:
        query = query.filter(models.Product.status == status)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (models.Product.name.ilike(search_fmt)) |
            (models.Product.code.ilike(search_fmt)) |
            (models.Product.description.ilike(search_fmt))
        )

    products = query.order_by(models.Product.id.desc()).offset(skip).limit(limit).all()
    return [_build_product_response(p, db) for p in products]

@router.get("/{product_id}", response_model=schemas.ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("products")),
    user: models.User = Depends(require_permission("products.view"))
):
    query = db.query(models.Product).filter(models.Product.id == product_id)
    if not tenant.is_super_admin:
        query = query.filter(models.Product.company_id == tenant.organization_id)
    product = query.first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _build_product_response(product, db)

@router.post("/", response_model=schemas.ProductResponse, status_code=201)
def create_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("products")),
    user: models.User = Depends(require_permission("products.create"))
):
    field_values_input = payload.field_values or []
    variants_input = payload.variants or []

    prod_data = payload.model_dump(exclude={"field_values", "variants"})
    prod_data["company_id"] = tenant.organization_id

    # Check code uniqueness per company
    existing = db.query(models.Product).filter(
        models.Product.company_id == tenant.organization_id,
        models.Product.code == payload.code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product with code '{payload.code}' already exists.")

    product = models.Product(**prod_data)
    db.add(product)
    db.flush()

    # Save Dynamic Field Values
    if field_values_input:
        _save_field_values(db, product.id, field_values_input, tenant.organization_id)

    # Save Variants
    for var_input in variants_input:
        variant = models.ProductVariant(
            product_id=product.id,
            sku=var_input.sku,
            name=var_input.name,
            price=var_input.price or product.price,
            cost_price=var_input.cost_price or product.cost_price,
            stock_quantity=var_input.stock_quantity,
            attributes_json=var_input.attributes_json,
            is_active=var_input.is_active
        )
        db.add(variant)

    db.commit()
    db.refresh(product)
    return _build_product_response(product, db)

@router.put("/{product_id}", response_model=schemas.ProductResponse)
def update_product(
    product_id: int,
    payload: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("products")),
    user: models.User = Depends(require_permission("products.edit"))
):
    query = db.query(models.Product).filter(models.Product.id == product_id)
    if not tenant.is_super_admin:
        query = query.filter(models.Product.company_id == tenant.organization_id)
    product = query.first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    field_values_input = payload.field_values
    variants_input = payload.variants

    prod_data = payload.model_dump(exclude={"field_values", "variants"}, exclude_unset=True)
    for key, val in prod_data.items():
        setattr(product, key, val)

    if field_values_input is not None:
        _save_field_values(db, product.id, field_values_input, product.company_id)

    if variants_input is not None:
        # Re-sync variants
        db.query(models.ProductVariant).filter(models.ProductVariant.product_id == product.id).delete(synchronize_session=False)
        for var_input in variants_input:
            variant = models.ProductVariant(
                product_id=product.id,
                sku=var_input.sku,
                name=var_input.name,
                price=var_input.price or product.price,
                cost_price=var_input.cost_price or product.cost_price,
                stock_quantity=var_input.stock_quantity,
                attributes_json=var_input.attributes_json,
                is_active=var_input.is_active
            )
            db.add(variant)

    db.commit()
    db.refresh(product)
    return _build_product_response(product, db)

@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    tenant: TenantContext = Depends(require_feature("products")),
    user: models.User = Depends(require_permission("products.delete"))
):
    query = db.query(models.Product).filter(models.Product.id == product_id)
    if not tenant.is_super_admin:
        query = query.filter(models.Product.company_id == tenant.organization_id)
    product = query.first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.query(models.ProductFieldValue).filter(models.ProductFieldValue.product_id == product_id).delete(synchronize_session=False)
    db.query(models.ProductVariant).filter(models.ProductVariant.product_id == product_id).delete(synchronize_session=False)
    db.query(models.OpportunityProduct).filter(models.OpportunityProduct.product_id == product_id).delete(synchronize_session=False)
    db.delete(product)
    db.commit()
    return None
