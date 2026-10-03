import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "crm.db")
con = sqlite3.connect(db_path)
cur = con.cursor()

def add_col(table, col, col_type):
    try:
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        print(f"Added {col} to {table}")
    except Exception as e:
        print(f"{col} on {table}: {e}")

add_col("companies", "status", "TEXT DEFAULT 'ACTIVE'")
add_col("companies", "owner_id", "INTEGER")
add_col("companies", "max_users", "INTEGER DEFAULT 25")

add_col("leads", "assigned_user_id", "INTEGER")
add_col("contacts", "company_id", "INTEGER")
add_col("opportunities", "company_id", "INTEGER")
add_col("products", "company_id", "INTEGER")

# Re-create products table without global UNIQUE on code
cur.execute("DROP TABLE IF EXISTS products_old")
try:
    cur.execute("ALTER TABLE products RENAME TO products_old")
    cur.execute("""
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
        )
    """)
    cur.execute("""
        INSERT INTO products (id, company_id, name, code, price, description, created_at, updated_at)
        SELECT id, company_id, name, code, price, description, created_at, updated_at FROM products_old
    """)
    cur.execute("DROP TABLE products_old")
    print("Rebuilt products table with composite unique constraint (code, company_id).")
except Exception as e:
    print(f"Products rebuild: {e}")

con.commit()
con.close()
print("Migration completed.")
