"""
Module 1 Migration Script: Creates dynamic product tables and upgrades products schema.
Run with: python migrate_module1.py
"""
import os
import sys
import sqlite3

sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, Base
from app import models

def run_migration():
    print("--- Executing Module 1 Database Migration ---")
    
    # 1. Create all new tables (industry_templates, org_product_fields, etc.)
    Base.metadata.create_all(bind=engine)
    print("  [OK] New tables initialized.")

    # 2. Alter existing products table to add new columns if missing
    db_path = os.path.join(os.path.dirname(__file__), "crm.db")
    if os.path.exists(db_path):
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        
        # Get existing columns in products table
        cur.execute("PRAGMA table_info(products)")
        existing_cols = {row[1] for row in cur.fetchall()}

        new_cols = [
            ("category_id", "INTEGER"),
            ("cost_price", "NUMERIC DEFAULT 0.0"),
            ("product_type", "TEXT DEFAULT 'PHYSICAL'"),
            ("status", "TEXT DEFAULT 'ACTIVE'"),
            ("stock_quantity", "INTEGER DEFAULT 0"),
            ("track_inventory", "BOOLEAN DEFAULT 1"),
            ("images_json", "TEXT"),
        ]

        for col_name, col_type in new_cols:
            if col_name not in existing_cols:
                try:
                    cur.execute(f"ALTER TABLE products ADD COLUMN {col_name} {col_type}")
                    print(f"  [OK] Added column '{col_name}' to products table.")
                except Exception as e:
                    print(f"  [SKIP] Column '{col_name}': {e}")

        con.commit()
        con.close()

    print("  [OK] Module 1 database migration completed successfully.")

if __name__ == "__main__":
    run_migration()
