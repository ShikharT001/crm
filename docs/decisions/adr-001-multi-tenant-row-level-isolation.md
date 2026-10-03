# ADR 001: Shared-Database Row-Level Multi-Tenancy

## Status
Accepted

## Context
The CRM must support multiple independent companies (tenants) on a single infrastructure deployment while guaranteeing that no company can view or manipulate data belonging to another. We evaluated three architectural approaches:
1. **Database-per-Tenant**: A separate SQLite/Postgres database file or server instance for each company.
2. **Schema-per-Tenant**: A shared database server with separate schemas (namespaces) for each company.
3. **Shared-Database Shared-Schema with Row-Level Isolation**: A single database where all tenant-scoped tables have a `company_id` foreign key.

## Decision
We chose **Shared-Database Shared-Schema with Row-Level Isolation** backed by a standardized `TenantContext` security dependency in FastAPI.

## Rationale
- **Operational Simplicity**: Avoids running dozens of database connections, connection pools, and migration scripts across isolated databases.
- **Cross-Tenant Super Admin Operations**: Enables platform administrators to easily run aggregate queries (e.g. total platform users, active subscriptions, cross-company templates) using standard SQL joins.
- **Low Resource Footprint**: Allows local development and testing to run cleanly within a single `crm.db` SQLite file.

## Consequences
- **Positive**: Easy deployment, unified Alembic migrations, fast onboarding of new companies via simple SQL inserts.
- **Negative / Trade-off**: Developers must strictly use `tenant.filter_query()` and `tenant.enforce_ownership()` on every query to prevent data leakage. This is safeguarded through automated unit tests (`tests/test_tenant_isolation.py`).
