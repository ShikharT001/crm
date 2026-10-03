import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Boolean, Text, Enum, UniqueConstraint, Date
from sqlalchemy.orm import relationship
from app.database import Base

class LeadStatus(str, enum.Enum):
    NEW = "New"
    CONTACTED = "Contacted"
    QUALIFIED = "Qualified"
    CONVERTED = "Converted"
    LOST = "Lost"

class CustomerStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"

class OpportunityStage(str, enum.Enum):
    PROSPECTING = "Prospecting"
    QUALIFICATION = "Qualification"
    PROPOSAL = "Proposal"
    NEGOTIATION = "Negotiation"
    CLOSED_WON = "Closed Won"
    CLOSED_LOST = "Closed Lost"

class EmployeeRole(str, enum.Enum):
    SALESPERSON = "Salesperson"
    ACCOUNT_MANAGER = "Account Manager"
    ADMIN = "Admin"

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"

class OrganizationStatus(str, enum.Enum):
    TRIAL = "TRIAL"
    ACTIVE = "ACTIVE"
    PAID = "PAID"
    UNPAID = "UNPAID"
    EXPIRED = "EXPIRED"
    SUSPENDED = "SUSPENDED"
    CANCELLED = "CANCELLED"

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    domain = Column(String, unique=True, index=True, nullable=True)
    industry = Column(String, nullable=True)
    status = Column(Enum(OrganizationStatus, values_callable=lambda obj: [e.value for e in obj]), default=OrganizationStatus.ACTIVE, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    max_users = Column(Integer, default=25)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    employees = relationship("Employee", back_populates="company", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="company")
    leads = relationship("Lead", back_populates="company")
    products = relationship("Product", back_populates="company")
    users = relationship("User", back_populates="company", foreign_keys="User.company_id")

Organization = Company

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(
        Enum(UserRole, values_callable=lambda obj: [e.value for e in obj]),
        default=UserRole.EMPLOYEE,
        nullable=False
    )
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="users", foreign_keys=[company_id])
    manager = relationship("User", remote_side=[id], foreign_keys=[manager_id], backref="subordinates")

    @property
    def organization_id(self):
        return self.company_id

    @organization_id.setter
    def organization_id(self, value):
        self.company_id = value

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(Enum(EmployeeRole, values_callable=lambda obj: [e.value for e in obj]), default=EmployeeRole.SALESPERSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="employees")
    assigned_leads = relationship("Lead", back_populates="assigned_salesperson")

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    company_name = Column(String, nullable=True)
    contact_name = Column(String, nullable=False)
    contact_email = Column(String, index=True, nullable=False)
    phone = Column(String, nullable=True)
    status = Column(Enum(LeadStatus, values_callable=lambda obj: [e.value for e in obj]), default=LeadStatus.NEW, index=True)
    value = Column(Numeric(10, 2), default=0.0)
    assigned_salesperson_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="leads")
    assigned_salesperson = relationship("Employee", back_populates="assigned_leads")
    customer = relationship("Customer", back_populates="source_lead", uselist=False)

    @property
    def organization_id(self):
        return self.company_id

class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (UniqueConstraint('name', 'company_id', name='uq_customer_name_company'),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    industry = Column(String, nullable=True)
    status = Column(Enum(CustomerStatus, values_callable=lambda obj: [e.value for e in obj]), default=CustomerStatus.ACTIVE, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="customers")
    source_lead = relationship("Lead", back_populates="customer")
    contacts = relationship("Contact", back_populates="customer", cascade="all, delete-orphan")
    opportunities = relationship("Opportunity", back_populates="customer", cascade="all, delete-orphan")

    @property
    def organization_id(self):
        return self.company_id

class Contact(Base):
    __tablename__ = "contacts"
    __table_args__ = (UniqueConstraint('email', 'customer_id', name='uq_contact_email_customer'),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True)
    position = Column(String, nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="contacts")
    company = relationship("Company")

    @property
    def organization_id(self):
        return self.company_id

class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    value = Column(Numeric(10, 2), default=0.0)
    stage = Column(Enum(OpportunityStage, values_callable=lambda obj: [e.value for e in obj]), default=OpportunityStage.PROSPECTING, index=True)
    close_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="opportunities")
    company = relationship("Company")
    products = relationship("OpportunityProduct", back_populates="opportunity", cascade="all, delete-orphan")

    @property
    def organization_id(self):
        return self.company_id

    @property
    def customer_name(self):
        return self.customer.name if self.customer else None

class IndustryTemplate(Base):
    __tablename__ = "industry_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)
    product_type_default = Column(String, default="PHYSICAL")
    is_system = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    fields = relationship("TemplateField", back_populates="template", cascade="all, delete-orphan")
    categories = relationship("TemplateCategory", back_populates="template", cascade="all, delete-orphan")

class TemplateField(Base):
    __tablename__ = "template_fields"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("industry_templates.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    label = Column(String, nullable=False)
    field_type = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    unit = Column(String, nullable=True)
    required = Column(Boolean, default=False)
    filterable = Column(Boolean, default=False)
    searchable = Column(Boolean, default=False)
    sortable = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)
    options_json = Column(Text, nullable=True)
    validation_json = Column(Text, nullable=True)

    template = relationship("IndustryTemplate", back_populates="fields")

class TemplateCategory(Base):
    __tablename__ = "template_categories"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("industry_templates.id"), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("template_categories.id"), nullable=True)
    name = Column(String, nullable=False)
    display_order = Column(Integer, default=0)

    template = relationship("IndustryTemplate", back_populates="categories")
    parent = relationship("TemplateCategory", remote_side=[id], backref="children")

class OrgProductField(Base):
    __tablename__ = "org_product_fields"
    __table_args__ = (UniqueConstraint('company_id', 'name', name='uq_org_field_name'),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    label = Column(String, nullable=False)
    field_type = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    unit = Column(String, nullable=True)
    required = Column(Boolean, default=False)
    filterable = Column(Boolean, default=False)
    searchable = Column(Boolean, default=False)
    sortable = Column(Boolean, default=False)
    show_in_list = Column(Boolean, default=True)
    show_in_detail = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    default_value = Column(String, nullable=True)
    validation_json = Column(Text, nullable=True)

    company = relationship("Company")
    options = relationship("OrgProductFieldOption", back_populates="field", cascade="all, delete-orphan")

class OrgProductFieldOption(Base):
    __tablename__ = "org_product_field_options"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("org_product_fields.id"), nullable=False, index=True)
    label = Column(String, nullable=False)
    value = Column(String, nullable=False)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    field = relationship("OrgProductField", back_populates="options")

class OrgCategory(Base):
    __tablename__ = "org_categories"
    __table_args__ = (UniqueConstraint('company_id', 'name', 'parent_id', name='uq_org_category'),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("org_categories.id"), nullable=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    company = relationship("Company")
    parent = relationship("OrgCategory", remote_side=[id], backref="children")

class Product(Base):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint('code', 'company_id', name='uq_product_code_company'),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    category_id = Column(Integer, ForeignKey("org_categories.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, index=True, nullable=False)
    price = Column(Numeric(10, 2), default=0.0)
    cost_price = Column(Numeric(10, 2), default=0.0)
    product_type = Column(String, default="PHYSICAL")
    status = Column(String, default="ACTIVE")
    stock_quantity = Column(Integer, default=0)
    track_inventory = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    images_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="products")
    category = relationship("OrgCategory")
    opportunity_links = relationship("OpportunityProduct", back_populates="product")
    field_values = relationship("ProductFieldValue", back_populates="product", cascade="all, delete-orphan")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")

    @property
    def organization_id(self):
        return self.company_id

class ProductFieldValue(Base):
    __tablename__ = "product_field_values"
    __table_args__ = (UniqueConstraint('product_id', 'field_id', name='uq_product_field_val'),)

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    field_id = Column(Integer, ForeignKey("org_product_fields.id"), nullable=False, index=True)
    value_text = Column(Text, nullable=True)
    value_number = Column(Numeric(14, 4), nullable=True, index=True)
    value_boolean = Column(Boolean, nullable=True, index=True)
    value_json = Column(Text, nullable=True)

    product = relationship("Product", back_populates="field_values")
    field = relationship("OrgProductField")

class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    sku = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    price = Column(Numeric(10, 2), nullable=True)
    cost_price = Column(Numeric(10, 2), nullable=True)
    stock_quantity = Column(Integer, default=0)
    attributes_json = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="variants")

class OpportunityProduct(Base):
    __tablename__ = "opportunity_products"

    id = Column(Integer, primary_key=True, index=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(10, 2), default=0.0)

    opportunity = relationship("Opportunity", back_populates="products")
    product = relationship("Product", back_populates="opportunity_links")

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), default=0.0)
    billing_cycle = Column(String, default="monthly")
    max_users = Column(Integer, default=25)
    max_storage_mb = Column(Integer, default=5000)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class OrganizationSubscription(Base):
    __tablename__ = "organization_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False, index=True)
    status = Column(Enum(OrganizationStatus, values_callable=lambda obj: [e.value for e in obj]), default=OrganizationStatus.ACTIVE, nullable=False)
    start_date = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company")
    plan = relationship("SubscriptionPlan")

class Feature(Base):
    __tablename__ = "features"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

class OrganizationFeature(Base):
    __tablename__ = "organization_features"
    __table_args__ = (UniqueConstraint('company_id', 'feature_id', name='uq_org_feature'),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    feature_id = Column(Integer, ForeignKey("features.id"), nullable=False, index=True)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company")
    feature = relationship("Feature")


# ─── User Permissions (Admin-controlled granular permissions) ─────────────────

class UserPermission(Base):
    """Granular permissions granted by Admin to Manager/Employee."""
    __tablename__ = "user_permissions"
    __table_args__ = (UniqueConstraint('user_id', 'permission', name='uq_user_permission'),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    permission = Column(String, nullable=False)  # e.g. "leads.create", "contacts.delete"
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], backref="permissions")
    granter = relationship("User", foreign_keys=[granted_by])


# ─── User Activity Log (Login/Logout tracking) ────────────────────────────────

class UserActivityLog(Base):
    """Records login and logout events for all users."""
    __tablename__ = "user_activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    action = Column(String, nullable=False)  # "login" | "logout"
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", foreign_keys=[user_id], backref="activity_logs")


# ─── Group Chat ───────────────────────────────────────────────────────────────

class ChatGroup(Base):
    """Admin-created group chats within an organization."""
    __tablename__ = "chat_groups"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True, default="💬")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company")
    creator = relationship("User", foreign_keys=[created_by])
    members = relationship("ChatGroupMember", back_populates="group", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="group", cascade="all, delete-orphan")


class ChatGroupMember(Base):
    """Members in a chat group."""
    __tablename__ = "chat_group_members"
    __table_args__ = (UniqueConstraint('group_id', 'user_id', name='uq_chat_member'),)

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("chat_groups.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, default="member")  # "admin" | "member"
    joined_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("ChatGroup", back_populates="members")
    user = relationship("User")


class ChatMessage(Base):
    """Messages sent in a chat group."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("chat_groups.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    message_type = Column(String, default="text")  # "text" | "system"
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    group = relationship("ChatGroup", back_populates="messages")
    sender = relationship("User")


# ─── CSV Import Jobs ──────────────────────────────────────────────────────────

class ImportJob(Base):
    """Tracks CSV import history."""
    __tablename__ = "import_jobs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    imported_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    import_type = Column(String, nullable=False)  # "leads" | "contacts"
    filename = Column(String, nullable=True)
    total_rows = Column(Integer, default=0)
    imported_rows = Column(Integer, default=0)
    skipped_rows = Column(Integer, default=0)
    error_rows = Column(Integer, default=0)
    status = Column(String, default="completed")  # "completed" | "partial" | "failed"
    error_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company")
    importer = relationship("User")


# ─── Meetings, Reminders & Tasks ─────────────────────────────────────────────

class ReminderType(str, enum.Enum):
    MEETING = "meeting"
    TASK = "task"
    DEAL_CALL = "deal_call"
    REMINDER = "reminder"

class ReminderPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class ReminderStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Reminder(Base):
    """Meetings, tasks, deal call reminders scheduled by Admins, Managers, or Users."""
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    reminder_type = Column(
        Enum(ReminderType, values_callable=lambda obj: [e.value for e in obj]),
        default=ReminderType.MEETING,
        nullable=False,
        index=True
    )
    priority = Column(
        Enum(ReminderPriority, values_callable=lambda obj: [e.value for e in obj]),
        default=ReminderPriority.MEDIUM,
        nullable=False
    )
    status = Column(
        Enum(ReminderStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=ReminderStatus.SCHEDULED,
        nullable=False,
        index=True
    )
    scheduled_at = Column(DateTime, nullable=False, index=True)
    end_at = Column(DateTime, nullable=True)
    meeting_link = Column(String, nullable=True)
    location = Column(String, nullable=True)
    related_entity_type = Column(String, nullable=True)  # "lead" | "opportunity" | "customer" | "deal"
    related_entity_id = Column(Integer, nullable=True)
    related_entity_title = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company")
    creator = relationship("User", foreign_keys=[creator_id])
    attendees = relationship("ReminderAttendee", back_populates="reminder", cascade="all, delete-orphan")

    @property
    def organization_id(self):
        return self.company_id


class ReminderAttendee(Base):
    """Attendees/recipients invited to a meeting, task, or reminder."""
    __tablename__ = "reminder_attendees"
    __table_args__ = (UniqueConstraint('reminder_id', 'user_id', name='uq_reminder_attendee'),)

    id = Column(Integer, primary_key=True, index=True)
    reminder_id = Column(Integer, ForeignKey("reminders.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String, default="invited")  # "invited" | "accepted" | "declined" | "completed"
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    dismissed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    reminder = relationship("Reminder", back_populates="attendees")
    user = relationship("User", foreign_keys=[user_id])
