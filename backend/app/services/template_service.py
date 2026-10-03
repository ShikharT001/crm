import json
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models

def seed_org_product_template(db: Session, company_id: int, industry_name_or_code: Optional[str]) -> bool:
    """
    Auto-seeds custom product fields, options, and categories for an organization
    based on the specified industry template.
    If org already has custom fields, seeding is skipped unless forced.
    """
    if not industry_name_or_code:
        industry_name_or_code = "General"

    query_str = industry_name_or_code.strip().lower()

    # 1. Find template by exact code or name
    template = db.query(models.IndustryTemplate).filter(
        (func.lower(models.IndustryTemplate.code) == query_str) |
        (func.lower(models.IndustryTemplate.name) == query_str)
    ).first()

    # Partial match fallback (e.g. "Clothing / Fashion" matches "clothing")
    if not template:
        template = db.query(models.IndustryTemplate).filter(
            (func.lower(models.IndustryTemplate.name).contains(query_str)) |
            (func.lower(models.IndustryTemplate.code).contains(query_str))
        ).first()

    # Default to "general" if not matched
    if not template:
        template = db.query(models.IndustryTemplate).filter(
            models.IndustryTemplate.code == "general"
        ).first()

    if not template:
        return False

    # Check if org already has fields
    existing_fields = db.query(models.OrgProductField).filter(models.OrgProductField.company_id == company_id).count()
    if existing_fields > 0:
        return True # Already seeded

    # 2. Copy Fields & Options
    field_id_map = {}
    for tf in template.fields:
        org_field = models.OrgProductField(
            company_id=company_id,
            name=tf.name,
            label=tf.label,
            field_type=tf.field_type,
            description=tf.description,
            unit=tf.unit,
            required=tf.required,
            filterable=tf.filterable,
            searchable=tf.searchable,
            sortable=tf.sortable,
            show_in_list=True,
            show_in_detail=True,
            is_active=True,
            display_order=tf.display_order,
            validation_json=tf.validation_json
        )
        db.add(org_field)
        db.flush()
        field_id_map[tf.id] = org_field.id

        # Parse options if provided
        if tf.options_json:
            try:
                opts = json.loads(tf.options_json)
                if isinstance(opts, list):
                    for idx, opt in enumerate(opts):
                        val = str(opt)
                        label = str(opt)
                        if isinstance(opt, dict):
                            val = str(opt.get("value", opt.get("label", "")))
                            label = str(opt.get("label", val))
                        
                        field_opt = models.OrgProductFieldOption(
                            field_id=org_field.id,
                            label=label,
                            value=val,
                            display_order=idx + 1,
                            is_active=True
                        )
                        db.add(field_opt)
            except Exception:
                pass

    # 3. Copy Categories (Top-level first, then children)
    cat_id_map = {}
    
    top_cats = [c for c in template.categories if c.parent_id is None]
    for tc in top_cats:
        org_cat = models.OrgCategory(
            company_id=company_id,
            parent_id=None,
            name=tc.name,
            display_order=tc.display_order,
            is_active=True
        )
        db.add(org_cat)
        db.flush()
        cat_id_map[tc.id] = org_cat.id

    child_cats = [c for c in template.categories if c.parent_id is not None]
    for cc in child_cats:
        parent_org_cat_id = cat_id_map.get(cc.parent_id)
        org_cat = models.OrgCategory(
            company_id=company_id,
            parent_id=parent_org_cat_id,
            name=cc.name,
            display_order=cc.display_order,
            is_active=True
        )
        db.add(org_cat)
        db.flush()
        cat_id_map[cc.id] = org_cat.id

    return True
