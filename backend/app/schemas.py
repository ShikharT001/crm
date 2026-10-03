from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, EmailStr, condecimal
from decimal import Decimal
from app.models import LeadStatus, CustomerStatus, OpportunityStage, EmployeeRole, UserRole

# ─── Auth / Token Schemas ───────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str  # plain str to accept .local / test domains
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

# ─── User Schemas ────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    name: str
    email: str
    role: UserRole = UserRole.EMPLOYEE
    company_id: Optional[int] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None
    company_id: Optional[int] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    company_id: Optional[int] = None
    manager_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    company_name: Optional[str] = None
    manager_name: Optional[str] = None
    permissions: List[str] = []

    class Config:
        from_attributes = True

# ─── Company Schemas ─────────────────────────────────────────────────────────

class CompanyBase(BaseModel):
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ─── Employee Schemas ─────────────────────────────────────────────────────────

class EmployeeBase(BaseModel):
    name: str
    email: EmailStr
    role: Optional[EmployeeRole] = EmployeeRole.SALESPERSON
    company_id: Optional[int] = None

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeResponse(EmployeeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ─── Lead Schemas ─────────────────────────────────────────────────────────────

class LeadBase(BaseModel):
    title: str
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    contact_name: str
    contact_email: EmailStr
    phone: Optional[str] = None
    status: Optional[LeadStatus] = LeadStatus.NEW
    value: Optional[Decimal] = Decimal("0.0")
    assigned_salesperson_id: Optional[int] = None
    notes: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    title: Optional[str] = None
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    status: Optional[LeadStatus] = None
    value: Optional[Decimal] = None
    assigned_salesperson_id: Optional[int] = None
    notes: Optional[str] = None

class LeadResponse(LeadBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    assigned_salesperson: Optional[EmployeeResponse] = None
    class Config:
        from_attributes = True

# ─── Contact Schemas ──────────────────────────────────────────────────────────

class ContactBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    position: Optional[str] = None
    is_primary: Optional[bool] = False

class ContactCreate(ContactBase):
    customer_id: int

class ContactResponse(ContactBase):
    id: int
    customer_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ─── Opportunity Product Schemas ──────────────────────────────────────────────

class OpportunityProductCreate(BaseModel):
    product_id: int
    quantity: int = 1
    unit_price: Decimal

class OpportunityProductResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    class Config:
        from_attributes = True

# ─── Opportunity Schemas ──────────────────────────────────────────────────────

class OpportunityBase(BaseModel):
    customer_id: int
    title: str
    value: Decimal = Decimal("0.0")
    stage: OpportunityStage = OpportunityStage.PROSPECTING
    close_date: Optional[date] = None

class OpportunityCreate(OpportunityBase):
    product_ids: Optional[List[int]] = []

class OpportunityUpdate(BaseModel):
    title: Optional[str] = None
    value: Optional[Decimal] = None
    stage: Optional[OpportunityStage] = None
    close_date: Optional[date] = None

class OpportunityResponse(OpportunityBase):
    id: int
    customer_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# ─── Customer Schemas ─────────────────────────────────────────────────────────

class CustomerBase(BaseModel):
    name: str
    company_id: Optional[int] = None
    lead_id: Optional[int] = None
    industry: Optional[str] = None
    status: Optional[CustomerStatus] = CustomerStatus.ACTIVE

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    contacts: List[ContactResponse] = []
    opportunities: List[OpportunityResponse] = []
    class Config:
        from_attributes = True

# ─── Dynamic Product System Schemas ──────────────────────────────────────────

class OrgProductFieldOptionBase(BaseModel):
    label: str
    value: str
    display_order: int = 0
    is_active: bool = True

class OrgProductFieldOptionCreate(OrgProductFieldOptionBase):
    pass

class OrgProductFieldOptionResponse(OrgProductFieldOptionBase):
    id: int
    field_id: int
    class Config:
        from_attributes = True

class OrgProductFieldBase(BaseModel):
    name: str
    label: str
    field_type: str
    description: Optional[str] = None
    unit: Optional[str] = None
    required: bool = False
    filterable: bool = False
    searchable: bool = False
    sortable: bool = False
    show_in_list: bool = True
    show_in_detail: bool = True
    is_active: bool = True
    display_order: int = 0
    default_value: Optional[str] = None
    validation_json: Optional[str] = None

class OrgProductFieldCreate(OrgProductFieldBase):
    options: Optional[List[OrgProductFieldOptionCreate]] = []

class OrgProductFieldUpdate(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    required: Optional[bool] = None
    filterable: Optional[bool] = None
    searchable: Optional[bool] = None
    sortable: Optional[bool] = None
    show_in_list: Optional[bool] = None
    show_in_detail: Optional[bool] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
    default_value: Optional[str] = None
    validation_json: Optional[str] = None

class OrgProductFieldResponse(OrgProductFieldBase):
    id: int
    company_id: int
    options: List[OrgProductFieldOptionResponse] = []
    class Config:
        from_attributes = True

class OrgCategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    display_order: int = 0
    is_active: bool = True

class OrgCategoryCreate(OrgCategoryBase):
    pass

class OrgCategoryResponse(OrgCategoryBase):
    id: int
    company_id: int
    children: List["OrgCategoryResponse"] = []
    class Config:
        from_attributes = True

class TemplateFieldBase(BaseModel):
    name: str
    label: str
    field_type: str
    description: Optional[str] = None
    unit: Optional[str] = None
    required: bool = False
    filterable: bool = False
    searchable: bool = False
    sortable: bool = False
    display_order: int = 0
    options_json: Optional[str] = None
    validation_json: Optional[str] = None

class TemplateFieldCreate(TemplateFieldBase):
    pass

class TemplateFieldResponse(TemplateFieldBase):
    id: int
    template_id: int
    class Config:
        from_attributes = True

class IndustryTemplateBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    icon: Optional[str] = None
    product_type_default: str = "PHYSICAL"
    is_system: bool = True
    is_active: bool = True

class IndustryTemplateCreate(IndustryTemplateBase):
    fields: Optional[List[TemplateFieldCreate]] = []

class IndustryTemplateResponse(IndustryTemplateBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    fields: List[TemplateFieldResponse] = []
    class Config:
        from_attributes = True

class ProductFieldValueInput(BaseModel):
    field_id: int
    value: Optional[str] = None

class ProductFieldValueResponse(BaseModel):
    id: int
    field_id: int
    field_name: Optional[str] = None
    field_label: Optional[str] = None
    field_type: Optional[str] = None
    value: Optional[str] = None
    class Config:
        from_attributes = True

class ProductVariantBase(BaseModel):
    sku: str
    name: str
    price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    stock_quantity: int = 0
    attributes_json: Optional[str] = None
    is_active: bool = True

class ProductVariantCreate(ProductVariantBase):
    pass

class ProductVariantResponse(ProductVariantBase):
    id: int
    product_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    code: str
    price: Decimal = Decimal("0.0")
    cost_price: Decimal = Decimal("0.0")
    product_type: str = "PHYSICAL"
    status: str = "ACTIVE"
    stock_quantity: int = 0
    track_inventory: bool = True
    category_id: Optional[int] = None
    description: Optional[str] = None
    images_json: Optional[str] = None

class ProductCreate(ProductBase):
    field_values: Optional[List[ProductFieldValueInput]] = []
    variants: Optional[List[ProductVariantCreate]] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    product_type: Optional[str] = None
    status: Optional[str] = None
    stock_quantity: Optional[int] = None
    track_inventory: Optional[bool] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    images_json: Optional[str] = None
    field_values: Optional[List[ProductFieldValueInput]] = None
    variants: Optional[List[ProductVariantCreate]] = None

class ProductResponse(ProductBase):
    id: int
    company_id: Optional[int] = None
    category_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    field_values: List[ProductFieldValueResponse] = []
    variants: List[ProductVariantResponse] = []
    class Config:
        from_attributes = True

# ─── Subscription & Feature Schemas ──────────────────────────────────────────

class SubscriptionPlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal = Decimal("0.0")
    billing_cycle: str = "monthly"
    max_users: int = 25
    max_storage_mb: int = 5000
    is_active: bool = True

class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass

class SubscriptionPlanResponse(SubscriptionPlanBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class FeatureBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True

class FeatureResponse(FeatureBase):
    id: int
    class Config:
        from_attributes = True

class OrganizationFeatureToggle(BaseModel):
    feature_code: str
    is_enabled: bool

class OrganizationDetailResponse(BaseModel):
    id: int
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    status: str
    owner_id: Optional[int] = None
    owner_email: Optional[str] = None
    max_users: int
    current_users_count: int
    subscription_plan_name: Optional[str] = None
    expires_at: Optional[datetime] = None
    enabled_features: List[str] = []
    created_at: datetime
    class Config:
        from_attributes = True

class OrganizationCreateRequest(BaseModel):
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    owner_email: str
    owner_name: str
    owner_password: str
    plan_id: Optional[int] = None
    status: str = "ACTIVE"
    max_users: int = 25
    enabled_features: Optional[List[str]] = None

class OrganizationUpdateRequest(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    status: Optional[str] = None
    max_users: Optional[int] = None
    plan_id: Optional[int] = None
    expires_at: Optional[datetime] = None
    enabled_features: Optional[List[str]] = None

# ─── Dashboard Summary Schema ─────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_leads: int
    active_leads: int
    converted_leads: int
    total_customers: int
    total_opportunities: int
    open_pipeline_value: Decimal
    closed_won_value: Decimal
    total_products: int

# ─── Reminder & Notification Schemas ──────────────────────────────────────────

class ReminderAttendeeResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    status: str = "invited"
    is_read: bool = False
    is_dismissed: bool = False
    dismissed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    reminder_type: Optional[str] = "meeting"  # "meeting", "task", "deal_call", "reminder"
    priority: Optional[str] = "medium"        # "low", "medium", "high", "urgent"
    scheduled_at: datetime
    end_at: Optional[datetime] = None
    meeting_link: Optional[str] = None
    location: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    related_entity_title: Optional[str] = None
    attendee_ids: Optional[List[int]] = []

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    reminder_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    meeting_link: Optional[str] = None
    location: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    related_entity_title: Optional[str] = None
    attendee_ids: Optional[List[int]] = None

class ReminderResponse(BaseModel):
    id: int
    company_id: Optional[int] = None
    creator_id: int
    creator_name: Optional[str] = None
    creator_role: Optional[str] = None
    title: str
    description: Optional[str] = None
    reminder_type: str
    priority: str
    status: str
    scheduled_at: datetime
    end_at: Optional[datetime] = None
    meeting_link: Optional[str] = None
    location: Optional[str] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[int] = None
    related_entity_title: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    attendees: List[ReminderAttendeeResponse] = []
    is_creator: bool = False
    is_dismissed_by_me: bool = False
    is_due: bool = False

    class Config:
        from_attributes = True

# Resolve forward ref
TokenResponse.model_rebuild()

