# Database: Migrations & Schema Evolution

## Overview

Database schema evolutions are managed through a hybrid workflow consisting of **Alembic** (for versioned declarative schema tracking) and **Custom SQLite Migration Scripts** (to accommodate SQLite's constraints regarding table modifications).

---

## 1. Alembic Workflow

The repository includes an Alembic environment located in `backend/alembic/` configured via `backend/alembic.ini`.

### Key Files:
- **`backend/alembic.ini`**: Configures database URL (`sqlite:///./crm.db`) and migration template paths.
- **`backend/alembic/env.py`**: Connects Alembic to SQLAlchemy metadata (`app.models.Base.metadata`) for automated revision diff generation.
- **`backend/alembic/versions/`**: Holds versioned migration history.

### Standard Alembic Commands:
```powershell
cd d:\Projects\CRM\backend
.\.venv\Scripts\Activate.ps1

# Generate a new migration script based on models.py changes
alembic revision --autogenerate -m "Add new column to opportunities"

# Apply all pending migrations to crm.db
alembic upgrade head

# Inspect current revision version
alembic current
```

---

## 2. SQLite ALTER TABLE Limitations & Table Rebuilds

Because SQLite has historical limitations regarding `ALTER TABLE` (such as adding composite unique constraints or altering foreign key definitions on existing tables), the project includes specialized migration scripts:

### Why Table Rebuilding is Required in SQLite:
When introducing the composite unique constraint `(code, company_id)` to replace a global `UNIQUE(code)` on the `products` table, standard `ALTER TABLE` cannot alter existing constraints.

The solution implemented in [`backend/migrate.py`](file:///d:/Projects/CRM/backend/migrate.py) uses the **Table Rebuild Pattern**:
```sql
-- 1. Rename existing table
ALTER TABLE products RENAME TO products_old;

-- 2. Create new table with updated constraints
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    price NUMERIC DEFAULT 0.0,
    description TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT uq_product_code_company UNIQUE (code, company_id),
    FOREIGN KEY(company_id) REFERENCES companies(id)
);

-- 3. Copy data from temporary table
INSERT INTO products (id, company_id, name, code, price, description, created_at, updated_at)
SELECT id, company_id, name, code, price, description, created_at, updated_at FROM products_old;

-- 4. Drop temporary table
DROP TABLE products_old;
```

---

## 3. Dedicated Migration Scripts

| Script | Purpose | Execution Command |
| :--- | :--- | :--- |
| [`migrate.py`](file:///d:/Projects/CRM/backend/migrate.py) | Adds tenant `company_id` columns and rebuilds products with composite tenant constraints. | `python migrate.py` |
| [`migrate_module1.py`](file:///d:/Projects/CRM/backend/migrate_module1.py) | Safely alters `products` table to add `category_id`, `cost_price`, `product_type`, `stock_quantity`, and `images_json` if missing. | `python migrate_module1.py` |
| [`audit_db.py`](file:///d:/Projects/CRM/backend/audit_db.py) | Diagnostic script that inspects companies, admin users, and cleans orphaned organizations. | `python audit_db.py` |

---

## 4. Circular Foreign Keys & Table Drop Handling

A cyclic foreign key relationship exists between:
- `companies.owner_id` &rarr; `users.id`
- `users.company_id` &rarr; `companies.id`

When dropping or clearing database tables during test teardown or tenant deletion, `companies.owner_id` must first be cleared to `NULL` to prevent SQLite constraint locks:
```python
# Clear owner_id FK before deleting organization
org.owner_id = None
db.commit()
```
