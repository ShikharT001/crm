# ADR 002: Dynamic EAV Custom Fields for Multi-Industry Products

## Status
Accepted

## Context
Different industries require vastly different product attributes. A fashion retailer needs "Size", "Fabric", and "Color Options", while a SaaS company requires "Software Version", "Supported Platforms", and "Billing Frequency". We evaluated:
1. **Fixed Generic Columns**: Storing arbitrary JSON strings or adding 20 generic columns (`custom_col_1`, `custom_col_2`) to the `products` table.
2. **PostgreSQL JSONB / Document Store**: Storing attributes in an unstructured JSON column.
3. **Structured Entity-Attribute-Value (EAV) with Typed Columns**: Defining custom fields in `org_product_fields` and saving concrete values in `product_field_values` across dedicated typed columns (`value_text`, `value_number`, `value_boolean`, `value_json`).

## Decision
We chose **Structured Entity-Attribute-Value (EAV) with Typed Columns**.

## Rationale
- **Database Engine Agnostic**: Works seamlessly in SQLite during local development as well as PostgreSQL in production, without requiring vendor-specific JSONB indexing operators.
- **Data Validation & UI Rendering**: Storing `field_type`, `unit`, `required`, and option lists in `org_product_fields` allows the frontend to automatically generate appropriate UI controls (text inputs, number fields, dropdowns, multi-select tags) with validation rules.
- **Numeric Range Filtering**: Storing numbers in `value_number` allows standard SQL numeric indexing and range queries (`WHERE value_number BETWEEN ? AND ?`).

## Consequences
- **Positive**: 12 pre-configured industry templates can be instantiated cleanly, and tenants can add unlimited custom fields dynamically.
- **Negative / Trade-off**: Retrieving full product details requires joining `product_field_values`, which is mitigated by our query formatters.
