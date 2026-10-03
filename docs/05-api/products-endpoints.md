# API: Dynamic Products & Catalog Endpoints (`/api/products`)

Access requires the `products` feature to be enabled for the organization.

---

## 1. List Products

Returns catalog products with dynamic field values, variants, and category names.

- **URL**: `/api/products/`
- **Method**: `GET`
- **Authentication**: Bearer Token
- **Query Parameters**:
  - `category_id` *(integer, optional)*
  - `search` *(string, optional)*: Matches name, code, or description.
  - `product_type` *(string, optional)*: `PHYSICAL`, `SUBSCRIPTION`, `SERVICE`.
  - `status` *(string, optional)*: `ACTIVE`, `INACTIVE`, `DISCONTINUED`.
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "company_id": 1,
      "name": "Enterprise CRM Suite",
      "code": "PROD-CRM-ENT",
      "price": "12000.00",
      "cost_price": "4000.00",
      "product_type": "SUBSCRIPTION",
      "status": "ACTIVE",
      "stock_quantity": 100,
      "track_inventory": true,
      "category_id": 1,
      "category_name": "Software & CRM",
      "description": "Annual license with unlimited seats",
      "field_values": [
        {
          "id": 1,
          "field_id": 1,
          "field_name": "version",
          "field_label": "Software Version",
          "field_type": "TEXT",
          "value": "2.0.0"
        }
      ],
      "variants": []
    }
  ]
  ```

---

## 2. Create Product

- **URL**: `/api/products/`
- **Method**: `POST`
- **Authentication**: Bearer Token
- **Request Body**:
  ```json
  {
    "name": "Performance Running Shoes",
    "code": "SHOE-RUN-01",
    "price": 120.00,
    "cost_price": 45.00,
    "product_type": "PHYSICAL",
    "stock_quantity": 50,
    "category_id": 2,
    "field_values": [
      { "field_id": 4, "value": "Nike" },
      { "field_id": 5, "value": "Men" }
    ],
    "variants": [
      { "sku": "SHOE-RUN-01-BL-10", "name": "Size 10 - Blue", "price": 120.00, "stock_quantity": 20 },
      { "sku": "SHOE-RUN-01-BK-11", "name": "Size 11 - Black", "price": 125.00, "stock_quantity": 30 }
    ]
  }
  ```
- **Success Response (201 Created)**: Returns created `ProductResponse`.

---

## 3. Update Product

- **URL**: `/api/products/{product_id}`
- **Method**: `PUT`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**: Returns updated `ProductResponse`.

---

## 4. Delete Product

- **URL**: `/api/products/{product_id}`
- **Method**: `DELETE`
- **Authentication**: Bearer Token
- **Success Response (204 No Content)**

---

## 5. Tenant Custom Fields CRUD

- **`GET /api/products/fields/`**: Returns all custom product fields for the company with option lists.
- **`POST /api/products/fields/`**: Creates a custom product field (e.g. `TEXT`, `SELECT`, `CURRENCY`).
- **`PUT /api/products/fields/{id}`**: Updates field label, order, or validation.
- **`DELETE /api/products/fields/{id}`**: Deletes field and removes associated product values.

---

## 6. Tenant Category Tree CRUD

- **`GET /api/products/categories/`**: Returns hierarchical category tree (parent categories with nested children).
- **`POST /api/products/categories/`**: Creates category or subcategory with `parent_id`.
- **`DELETE /api/products/categories/{id}`**: Deletes category and unlinks affected products.
