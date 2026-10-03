from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app import models, schemas
from decimal import Decimal

# Companies / Organizations CRUD
def get_companies(db: Session, tenant=None, skip: int = 0, limit: int = 100):
    query = db.query(models.Company)
    if tenant and not tenant.is_super_admin:
        query = query.filter(models.Company.id == tenant.organization_id)
    return query.offset(skip).limit(limit).all()

def create_company(db: Session, company: schemas.CompanyCreate):
    if company.domain:
        existing = db.query(models.Company).filter(models.Company.domain == company.domain).first()
        if existing:
            return existing
    db_company = models.Company(**company.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

# Employees CRUD
def get_employees(db: Session, tenant=None, skip: int = 0, limit: int = 100):
    query = db.query(models.Employee)
    if tenant and not tenant.is_super_admin:
        query = query.filter(models.Employee.company_id == tenant.organization_id)
    return query.offset(skip).limit(limit).all()

def create_employee(db: Session, employee: schemas.EmployeeCreate, tenant=None):
    emp_data = employee.model_dump()
    if tenant and not tenant.is_super_admin:
        emp_data["company_id"] = tenant.organization_id
    db_employee = models.Employee(**emp_data)
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

# Leads CRUD
def get_leads(db: Session, tenant=None, skip: int = 0, limit: int = 100, status: str = None):
    query = db.query(models.Lead)
    if tenant and not tenant.is_super_admin:
        query = query.filter(models.Lead.company_id == tenant.organization_id)
        if tenant.is_employee:
            query = query.filter(
                (models.Lead.assigned_user_id == tenant.user_id) |
                (models.Lead.assigned_salesperson_id == tenant.user_id)
            )
    if status:
        query = query.filter(models.Lead.status == status)
    return query.order_by(models.Lead.id.desc()).offset(skip).limit(limit).all()

def get_lead(db: Session, lead_id: int, tenant=None):
    query = db.query(models.Lead).filter(models.Lead.id == lead_id)
    if tenant and not tenant.is_super_admin:
        query = query.filter(models.Lead.company_id == tenant.organization_id)
    return query.first()

def create_lead(db: Session, lead: schemas.LeadCreate, tenant=None):
    lead_data = lead.model_dump()
    if tenant and not tenant.is_super_admin:
        lead_data["company_id"] = tenant.organization_id
    db_lead = models.Lead(**lead_data)
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead

def update_lead(db: Session, lead_id: int, lead_data: schemas.LeadUpdate, tenant=None):
    db_lead = get_lead(db, lead_id, tenant=tenant)
    if not db_lead:
        return None
    for key, value in lead_data.model_dump(exclude_unset=True).items():
        setattr(db_lead, key, value)
    db.commit()
    db.refresh(db_lead)
    return db_lead

def convert_lead_to_customer(db: Session, lead_id: int, tenant=None):
    lead = get_lead(db, lead_id, tenant=tenant)
    if not lead or lead.status == models.LeadStatus.CONVERTED:
        return None, "Lead not found or already converted"
    
    # Mark lead converted
    lead.status = models.LeadStatus.CONVERTED
    
    # Check if customer already exists for this lead
    existing_customer = db.query(models.Customer).filter(models.Customer.lead_id == lead.id).first()
    if existing_customer:
        return existing_customer, None

    org_id = lead.company_id or (tenant.organization_id if tenant else None)

    # Create Customer entity
    customer = models.Customer(
        name=lead.company_name or lead.contact_name,
        company_id=org_id,
        lead_id=lead.id,
        status=models.CustomerStatus.ACTIVE
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    # Add Contact entity for customer
    contact = models.Contact(
        company_id=org_id,
        customer_id=customer.id,
        name=lead.contact_name,
        email=lead.contact_email,
        phone=lead.phone,
        is_primary=True
    )
    db.add(contact)

    # Optionally create an initial Opportunity
    if lead.value and lead.value > 0:
        opp = models.Opportunity(
            company_id=org_id,
            customer_id=customer.id,
            title=f"Deal for {customer.name}",
            value=lead.value,
            stage=models.OpportunityStage.PROPOSAL
        )
        db.add(opp)

    db.commit()
    db.refresh(customer)
    return customer, None

# Customers CRUD
def get_customers(db: Session, tenant=None, skip: int = 0, limit: int = 100):
    query = db.query(models.Customer)
    if tenant and not tenant.is_super_admin:
        query = query.filter(models.Customer.company_id == tenant.organization_id)
    return query.order_by(models.Customer.id.desc()).offset(skip).limit(limit).all()

def get_customer(db: Session, customer_id: int, tenant=None):
    query = db.query(models.Customer).filter(models.Customer.id == customer_id)
    if tenant and not tenant.is_super_admin:
        query = query.filter(models.Customer.company_id == tenant.organization_id)
    return query.first()

def create_customer(db: Session, customer: schemas.CustomerCreate, tenant=None):
    cust_data = customer.model_dump()
    if tenant and not tenant.is_super_admin:
        cust_data["company_id"] = tenant.organization_id
    existing = db.query(models.Customer).filter(
        models.Customer.name == cust_data["name"],
        models.Customer.company_id == cust_data.get("company_id")
    ).first()
    if existing:
        return existing
    db_customer = models.Customer(**cust_data)
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def create_contact(db: Session, contact: schemas.ContactCreate, tenant=None):
    contact_data = contact.model_dump()
    if tenant and not tenant.is_super_admin:
        contact_data["company_id"] = tenant.organization_id
    existing = db.query(models.Contact).filter(
        models.Contact.email == contact_data["email"],
        models.Contact.customer_id == contact_data["customer_id"]
    ).first()
    if existing:
        return existing
    db_contact = models.Contact(**contact_data)
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

# Opportunities CRUD
def get_opportunities(db: Session, tenant=None, skip: int = 0, limit: int = 2000, stage: str = None):
    query = db.query(models.Opportunity)
    if tenant and not tenant.is_super_admin:
        query = query.filter(models.Opportunity.company_id == tenant.organization_id)
    if stage:
        query = query.filter(models.Opportunity.stage == stage)
    return query.order_by(models.Opportunity.id.desc()).offset(skip).limit(limit).all()

def get_opportunity(db: Session, opportunity_id: int, tenant=None):
    query = db.query(models.Opportunity).filter(models.Opportunity.id == opportunity_id)
    if tenant and not tenant.is_super_admin:
        query = query.filter(models.Opportunity.company_id == tenant.organization_id)
    return query.first()

def create_opportunity(db: Session, opportunity: schemas.OpportunityCreate, tenant=None):
    opp_data = opportunity.model_dump()
    product_ids = opp_data.pop("product_ids", [])
    if tenant and not tenant.is_super_admin:
        opp_data["company_id"] = tenant.organization_id
    
    db_opp = models.Opportunity(**opp_data)
    db.add(db_opp)
    db.commit()
    db.refresh(db_opp)

    # Link products if supplied
    for prod_id in product_ids:
        prod = db.query(models.Product).filter(models.Product.id == prod_id).first()
        if prod:
            opp_prod = models.OpportunityProduct(
                opportunity_id=db_opp.id,
                product_id=prod.id,
                quantity=1,
                unit_price=prod.price
            )
            db.add(opp_prod)
    db.commit()
    db.refresh(db_opp)
    return db_opp

def update_opportunity(db: Session, opp_id: int, opp_data: schemas.OpportunityUpdate, tenant=None):
    db_opp = get_opportunity(db, opp_id, tenant=tenant)
    if not db_opp:
        return None
    for key, value in opp_data.model_dump(exclude_unset=True).items():
        setattr(db_opp, key, value)
    db.commit()
    db.refresh(db_opp)
    return db_opp

# Products CRUD
def get_products(db: Session, tenant=None, skip: int = 0, limit: int = 100):
    query = db.query(models.Product)
    if tenant and not tenant.is_super_admin:
        query = query.filter(models.Product.company_id == tenant.organization_id)
    return query.order_by(models.Product.id.desc()).offset(skip).limit(limit).all()

def create_product(db: Session, product: schemas.ProductCreate, tenant=None):
    prod_data = product.model_dump()
    if tenant and not tenant.is_super_admin:
        prod_data["company_id"] = tenant.organization_id
    db_product = models.Product(**prod_data)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

# Contacts with Full Details
def get_contacts_with_full_details(db: Session, tenant=None):
    query = db.query(models.Contact).options(
        joinedload(models.Contact.customer).joinedload(models.Customer.company),
        joinedload(models.Contact.customer).joinedload(models.Customer.opportunities)
    )
    if tenant and not tenant.is_super_admin:
        query = query.filter(
            (models.Contact.company_id == tenant.organization_id) |
            (models.Contact.customer.has(models.Customer.company_id == tenant.organization_id))
        )
    contacts = query.all()
    result = []
    
    for c in contacts:
        customer = c.customer
        company_info = None
        deals_list = []

        if customer:
            if customer.company:
                company_info = {
                    "id": customer.company.id,
                    "name": customer.company.name,
                    "domain": customer.company.domain,
                    "industry": customer.company.industry
                }
            else:
                company_info = {
                    "name": customer.name,
                    "industry": customer.industry or "General Industry"
                }

            for opp in customer.opportunities:
                deals_list.append({
                    "id": opp.id,
                    "title": opp.title,
                    "value": float(opp.value) if opp.value else 0.0,
                    "stage": opp.stage,
                    "close_date": str(opp.close_date) if opp.close_date else None
                })

        result.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "position": c.position,
            "is_primary": c.is_primary,
            "customer_id": c.customer_id,
            "customer_name": customer.name if customer else "N/A",
            "company": company_info,
            "deals": deals_list
        })
        
    return result

# Dashboard Aggregate Metrics
def get_dashboard_stats(db: Session, tenant=None) -> schemas.DashboardStats:
    leads_q = db.query(models.Lead)
    cust_q = db.query(models.Customer)
    opp_q = db.query(models.Opportunity)
    prod_q = db.query(models.Product)

    if tenant and not tenant.is_super_admin:
        org_id = tenant.organization_id
        leads_q = leads_q.filter(models.Lead.company_id == org_id)
        cust_q = cust_q.filter(models.Customer.company_id == org_id)
        opp_q = opp_q.filter(models.Opportunity.company_id == org_id)
        prod_q = prod_q.filter(models.Product.company_id == org_id)

    total_leads = leads_q.count()
    active_leads = leads_q.filter(models.Lead.status.in_([
        models.LeadStatus.NEW, models.LeadStatus.CONTACTED, models.LeadStatus.QUALIFIED
    ])).count()
    converted_leads = leads_q.filter(models.Lead.status == models.LeadStatus.CONVERTED).count()
    
    total_customers = cust_q.count()
    total_opportunities = opp_q.count()
    
    open_pipeline_val = opp_q.filter(
        models.Opportunity.stage.notin_([models.OpportunityStage.CLOSED_WON, models.OpportunityStage.CLOSED_LOST])
    ).with_entities(func.sum(models.Opportunity.value)).scalar() or Decimal("0.0")

    closed_won_val = opp_q.filter(
        models.Opportunity.stage == models.OpportunityStage.CLOSED_WON
    ).with_entities(func.sum(models.Opportunity.value)).scalar() or Decimal("0.0")

    total_products = prod_q.count()

    return schemas.DashboardStats(
        total_leads=total_leads,
        active_leads=active_leads,
        converted_leads=converted_leads,
        total_customers=total_customers,
        total_opportunities=total_opportunities,
        open_pipeline_value=open_pipeline_val,
        closed_won_value=closed_won_val,
        total_products=total_products
    )
