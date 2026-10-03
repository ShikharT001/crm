import sys
from pathlib import Path

# Ensure backend root is in sys.path
sys.path.append(str(Path(__file__).parent))

from app.database import engine, SessionLocal, Base
from app import models

def seed_database():
    print("Initializing SQLite database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # Check if data already exists
    if db.query(models.Company).first():
        print("Database already contains data. Skipping seed.")
        db.close()
        return

    print("Seeding initial CRM demo data...")

    # 1. Companies
    comp1 = models.Company(name="Acme Tech Solutions", domain="acmetech.com", industry="Software & SaaS")
    comp2 = models.Company(name="Global Logistics Corp", domain="globallogistics.io", industry="Logistics")
    comp3 = models.Company(name="Apex Financial Group", domain="apexfin.com", industry="Finance")
    db.add_all([comp1, comp2, comp3])
    db.commit()

    # 2. Employees (Sales reps)
    emp1 = models.Employee(name="Sarah Jenkins", email="sarah.j@crmcompany.com", role="Senior Sales Rep", company_id=comp1.id)
    emp2 = models.Employee(name="Michael Vance", email="michael.v@crmcompany.com", role="Account Executive", company_id=comp1.id)
    emp3 = models.Employee(name="Elena Rostova", email="elena.r@crmcompany.com", role="Sales Manager", company_id=comp2.id)
    db.add_all([emp1, emp2, emp3])
    db.commit()

    # 3. Products
    prod1 = models.Product(name="Enterprise CRM Suite", code="PROD-CRM-ENT", price=12000.0, description="Annual license for enterprise CRM suite with unlimited seats")
    prod2 = models.Product(name="Cloud Storage 10TB", code="PROD-CLOUD-10T", price=3600.0, description="10TB secure cloud storage add-on per year")
    prod3 = models.Product(name="Priority 24/7 Support", code="PROD-SUPP-247", price=2400.0, description="Dedicated technical account manager & 24/7 priority SLA")
    prod4 = models.Product(name="Custom Integration Service", code="PROD-SRV-INT", price=5000.0, description="One-time API integration & migration package")
    db.add_all([prod1, prod2, prod3, prod4])
    db.commit()

    # 4. Leads
    lead1 = models.Lead(
        title="CRM Upgrade Inquiry",
        company_name="Starlight Media",
        contact_name="David Miller",
        contact_email="dmiller@starlight.com",
        phone="+1 (555) 234-5678",
        status="New",
        value=15000.0,
        assigned_salesperson_id=emp1.id,
        notes="Interested in switching from legacy CRM solution."
    )
    lead2 = models.Lead(
        title="Cloud Storage Licensing",
        company_name="BioHealth Labs",
        contact_name="Dr. Karen White",
        contact_email="k.white@biohealth.org",
        phone="+1 (555) 876-5432",
        status="Qualified",
        value=8600.0,
        assigned_salesperson_id=emp2.id,
        notes="Requires HIPAA compliant cloud storage integration."
    )
    lead3 = models.Lead(
        title="Full Stack Software & Support",
        company_name="Apex Financial Group",
        contact_name="Robert Vance",
        contact_email="rvance@apexfin.com",
        phone="+1 (555) 999-1122",
        status="Converted",
        value=24400.0,
        assigned_salesperson_id=emp1.id,
        notes="Converted into key customer account."
    )
    db.add_all([lead1, lead2, lead3])
    db.commit()

    # 5. Customers
    cust1 = models.Customer(
        name="Apex Financial Group",
        company_id=comp3.id,
        lead_id=lead3.id,
        industry="Finance",
        status="Active"
    )
    cust2 = models.Customer(
        name="Global Logistics Corp",
        company_id=comp2.id,
        industry="Logistics",
        status="Active"
    )
    db.add_all([cust1, cust2])
    db.commit()

    # 6. Contacts
    cont1 = models.Contact(
        customer_id=cust1.id,
        name="Robert Vance",
        email="rvance@apexfin.com",
        phone="+1 (555) 999-1122",
        position="Chief Technology Officer",
        is_primary=True
    )
    cont2 = models.Contact(
        customer_id=cust2.id,
        name="Samantha Brooks",
        email="sbrooks@globallogistics.io",
        phone="+1 (555) 444-3311",
        position="Head of Operations",
        is_primary=True
    )
    db.add_all([cont1, cont2])
    db.commit()

    # 7. Opportunities
    opp1 = models.Opportunity(
        customer_id=cust1.id,
        title="Apex Financial CRM Expansion",
        value=24400.0,
        stage="Proposal",
        close_date="2026-10-30"
    )
    opp2 = models.Opportunity(
        customer_id=cust2.id,
        title="Global Logistics Integration Deal",
        value=17000.0,
        stage="Negotiation",
        close_date="2026-11-15"
    )
    opp3 = models.Opportunity(
        customer_id=cust1.id,
        title="Apex 24/7 SLA Renewal",
        value=2400.0,
        stage="Closed Won",
        close_date="2026-08-01"
    )
    db.add_all([opp1, opp2, opp3])
    db.commit()

    # 8. Opportunity Products Junction
    opp_prod1 = models.OpportunityProduct(opportunity_id=opp1.id, product_id=prod1.id, quantity=1, unit_price=12000.0)
    opp_prod2 = models.OpportunityProduct(opportunity_id=opp1.id, product_id=prod4.id, quantity=2, unit_price=5000.0)
    opp_prod3 = models.OpportunityProduct(opportunity_id=opp1.id, product_id=prod3.id, quantity=1, unit_price=2400.0)
    db.add_all([opp_prod1, opp_prod2, opp_prod3])
    db.commit()

    # 9. Demo Users
    from app.routers.auth import hash_password
    sam_corp = db.query(models.Company).filter(models.Company.name == "Sam Inc").first()
    if not sam_corp:
        sam_corp = models.Company(name="Sam Inc", domain="saminc.local", industry="Technology")
        db.add(sam_corp)
        db.commit()

    super_admin = models.User(
        name="Super Admin",
        email="superadmin@crm.local",
        password_hash=hash_password("Admin@123"),
        role=models.UserRole.SUPER_ADMIN,
        is_active=True
    )
    admin_user = models.User(
        name="Sam Admin",
        email="admin@saminc.local",
        password_hash=hash_password("Admin@123"),
        role=models.UserRole.ADMIN,
        company_id=sam_corp.id,
        is_active=True
    )
    db.add_all([super_admin, admin_user])
    db.commit()

    manager_user = models.User(
        name="Sam Manager",
        email="manager@saminc.local",
        password_hash=hash_password("Manager@123"),
        role=models.UserRole.MANAGER,
        company_id=sam_corp.id,
        manager_id=admin_user.id,
        is_active=True
    )
    db.add(manager_user)
    db.commit()

    emp_user = models.User(
        name="Sam Employee",
        email="emp1@saminc.local",
        password_hash=hash_password("Emp@12345"),
        role=models.UserRole.EMPLOYEE,
        company_id=sam_corp.id,
        manager_id=manager_user.id,
        is_active=True
    )
    db.add(emp_user)
    db.commit()

    print("Database seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    seed_database()
