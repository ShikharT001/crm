# Feature: Dynamic Product Catalog & Multi-Industry Engine

## Overview

The **Dynamic Product Catalog & Multi-Industry Engine** allows organizations to manage physical goods, software SaaS subscriptions, or billable services. Rather than forcing all businesses into a static SKU/price schema, the engine provides an Entity-Attribute-Value (EAV) dynamic field model, 12 rich industry templates, hierarchical category trees, product variants, and inventory tracking.

---

## 12 Pre-Configured Industry Templates

When a new organization registers or changes its industry, the CRM can automatically seed pre-configured categories, fields, and options:

| Industry Code | Industry Name | Sample Pre-Configured Custom Fields | Default Product Type |
| :--- | :--- | :--- | :--- |
| `clothing` | Clothing / Fashion | Brand, Clothing Type, Gender, Size Options, Color Options, Fabric, Fit, Pattern | `PHYSICAL` |
| `software` | Software / SaaS | Software Version, Supported Platforms, License Model, Billing Frequency, User Tier | `SUBSCRIPTION` |
| `sports` | Sports & Apparel | Sport Type, Target Audience, Skill Level, Material, Weight / Dimensions | `PHYSICAL` |
| `jewellery` | Jewellery & Luxury | Metal Type, Purity / Karat, Gemstone, Certification, Weight in Grams | `PHYSICAL` |
| `electronics` | Electronics & Hardware | Processor, RAM, Storage Capacity, Screen Size, Warranty Period, Power Consumption | `PHYSICAL` |
| `furniture` | Furniture & Home Decor | Material Type, Dimensions (L x W x H), Color / Finish, Room Type, Assembly Required | `PHYSICAL` |
| `cosmetics` | Cosmetics & Beauty | Skin Type, Organic / Vegan, Volume / Weight, Expiry Period, Ingredients | `PHYSICAL` |
| `food` | Food & Beverage | Dietary Preferences, Package Weight, Shelf Life, Storage Temperature | `PHYSICAL` |
| `manufacturing` | Industrial & Manufacturing | Part Number, Material Grade, Tolerance Specs, Minimum Order Qty | `PHYSICAL` |
| `real_estate` | Real Estate & Property | Property Type, Square Footage, Bedrooms, Furnishing, RERA Registration | `SERVICE` |
| `automobile` | Automobile & Spare Parts | Vehicle Make & Model, OEM Part Number, Year Compatibility, Engine Type | `PHYSICAL` |
| `general` | General / Multi-Purpose | Brand, Manufacturer, Warranty, Weight | `PHYSICAL` |

---

## Dynamic Fields Architecture (EAV Model)

Tenant custom product attributes are defined in `org_product_fields`:
- **Supported Field Types**: `TEXT`, `NUMBER`, `CURRENCY`, `BOOLEAN`, `SELECT`, `MULTI_SELECT`, `DATE`.
- **Options Management**: Dropdown and multi-select choices are stored in `org_product_field_options`.
- **Values Storage**: Product-specific values are written to `product_field_values`:
  - `value_text`: Plain strings, select values.
  - `value_number`: Decimal values for indexing, range filtering, and calculations.
  - `value_boolean`: Boolean flags (`true`/`false`).
  - `value_json`: Array of selected multi-select values.

---

## Hierarchical Categories

Categories are organized hierarchically via self-referencing foreign keys on `org_categories`:
- `parent_id = NULL` defines top-level categories (e.g. "Men", "Women").
- `parent_id = <top_cat_id>` defines subcategories (e.g. "Men &rarr; Shirts", "Men &rarr; Jeans").
- Deleting a category safely nullifies `products.category_id` without deleting the underlying catalog items.

---

## Product Variants & SKUs

Products with multiple specifications (e.g. T-Shirt available in Red-M, Red-L, Blue-M) use `product_variants`:
- Each variant has an independent `sku`, variant name, override `price`, override `cost_price`, `stock_quantity`, and JSON attributes dictionary (`attributes_json`).
- Enables fine-grained warehouse stock tracking and pricing adjustments.

---

## Code & Router Mapping

- **Router**: [`backend/app/routers/products.py`](file:///d:/Projects/CRM/backend/app/routers/products.py)
  - `GET /api/products/`: Lists products with filters for category, product type, status, and search string.
  - `POST /api/products/`: Creates product, saves dynamic field values, and creates variants.
  - `PUT /api/products/{id}`: Full update of product details, dynamic fields, and re-sync of variants.
  - `GET /api/products/fields/`: Lists tenant custom product fields.
  - `POST /api/products/fields/`: Creates custom product field with option values.
  - `GET /api/products/categories/`: Returns hierarchical category tree.
  - `POST /api/products/categories/`: Creates a category or subcategory.
- **Frontend Page**: [`frontend/src/app/products/page.js`](file:///d:/Projects/CRM/frontend/src/app/products/page.js)
  - Full catalog manager with category filters, dynamic custom field forms, variant manager, stock badge warnings, and modal editor.
