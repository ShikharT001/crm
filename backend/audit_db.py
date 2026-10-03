from app.database import SessionLocal
from app import models

db = SessionLocal()
orgs = db.query(models.Company).all()
print("=== All Organizations ===")
for o in orgs:
    owner = db.query(models.User).filter(models.User.id == o.owner_id).first() if o.owner_id else None
    admin = db.query(models.User).filter(models.User.company_id == o.id, models.User.role == models.UserRole.ADMIN).first()
    owner_email = owner.email if owner else "NONE"
    admin_email = admin.email if admin else "NONE"
    print(f"  ID={o.id} | {o.name} | domain={o.domain} | owner_id={o.owner_id} | owner_email={owner_email} | admin_fallback={admin_email}")

print()
print("=== All Users ===")
users = db.query(models.User).all()
for u in users:
    print(f"  ID={u.id} | {u.name} | {u.email} | role={u.role.value} | company_id={u.company_id} | active={u.is_active}")

# Clean up orphaned orgs (no owner + no admin user)
print()
print("=== Checking for orphaned orgs to clean ===")
for o in orgs:
    owner = db.query(models.User).filter(models.User.id == o.owner_id).first() if o.owner_id else None
    admin = db.query(models.User).filter(models.User.company_id == o.id, models.User.role == models.UserRole.ADMIN).first()
    if not owner and not admin:
        print(f"  ORPHANED: ID={o.id} name={o.name} - no owner, no admin user")

db.close()
