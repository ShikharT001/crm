# Enterprise CRM Documentation

Welcome to the comprehensive technical documentation for the **Enterprise Multi-Tenant SaaS CRM Platform**. This documentation covers every architectural layer, domain model, API endpoint, frontend page, database table, security policy, and operational workflow of the system.

---

## Documentation Structure & Navigation

The documentation is organized into numbered topic guides, resource references, Architecture Decision Records (ADRs), and visual diagrams:

| File / Folder | Focus Area | Target Audience |
| :--- | :--- | :--- |
| [**`01-overview.md`**](file:///d:/Projects/CRM/docs/01-overview.md) | High-level product mission, core domain entities, business workflows, and feature matrix. | Everyone (Product, Engineering, QA) |
| [**`02-architecture.md`**](file:///d:/Projects/CRM/docs/02-architecture.md) | High-level system design, multi-tenant security boundary, client-server communication, and subsystem interaction. | System Architects, Backend & Full-Stack Leads |
| [**`03-getting-started.md`**](file:///d:/Projects/CRM/docs/03-getting-started.md) | Prerequisites, local installation, database migration, seeding scripts, and default demo credentials. | All Developers & QA Engineers |
| [**`04-features/`**](file:///d:/Projects/CRM/docs/04-features/) | Detailed domain specifications for every feature module: Auth, Multi-Tenancy, RBAC, Leads, Deals Pipeline, Customers, Dynamic Products, Reminders, Chat, Imports, and Activity. | Product Managers, Frontend & Backend Engineers |
| [**`05-api/`**](file:///d:/Projects/CRM/docs/05-api/) | Complete REST API reference, request/response payloads, authentication, and endpoint contracts for all 14 routers. | Frontend Developers, API Consumers, Integrators |
| [**`06-database/`**](file:///d:/Projects/CRM/docs/06-database/) | Database architecture, complete 18-table relational schema catalog, Mermaid ER diagram, and Alembic migration workflows. | Database Engineers, Backend Developers |
| [**`07-frontend/`**](file:///d:/Projects/CRM/docs/07-frontend/) | Next.js 14 App Router layout, page routing, glassmorphism design system, API client layer, and notification engine. | Frontend Developers, UI/UX Engineers |
| [**`08-backend/`**](file:///d:/Projects/CRM/docs/08-backend/) | FastAPI structure, dependency injection, service classes, Pydantic schemas, and complex business logic rules. | Backend Developers |
| [**`09-deployment.md`**](file:///d:/Projects/CRM/docs/09-deployment.md) | Hosting strategies, Dockerization, reverse proxies, environment separation, and CI/CD pipelines. | DevOps, SREs, System Admins |
| [**`10-configuration.md`**](file:///d:/Projects/CRM/docs/10-configuration.md) | Complete reference of backend and frontend environment variables with security guidelines. | DevOps, Developers |
| [**`11-testing.md`**](file:///d:/Projects/CRM/docs/11-testing.md) | Test framework, automated test suites (17 test cases), fixtures, mocking, and coverage execution. | QA Engineers, Developers |
| [**`12-troubleshooting.md`**](file:///d:/Projects/CRM/docs/12-troubleshooting.md) | Diagnostic runbooks for common developer hurdles (ports, CORS, SQLite constraints, CSV encodings). | All Developers |
| [**`decisions/`**](file:///d:/Projects/CRM/docs/decisions/) | Architecture Decision Records (ADRs) explaining key design trade-offs and rationale. | Architects, Senior Developers |
| [**`diagrams/`**](file:///d:/Projects/CRM/docs/diagrams/) | Dedicated Mermaid diagrams visualizing system architecture, data flows, and security decision trees. | Technical Leads, Reviewers |

---

## Recommended Reading Order

### 1. New Full-Stack Developer
1. [**`01-overview.md`**](file:///d:/Projects/CRM/docs/01-overview.md) – Understand what the CRM does and who uses it.
2. [**`03-getting-started.md`**](file:///d:/Projects/CRM/docs/03-getting-started.md) – Set up Python and Node.js environments and seed the test database.
3. [**`02-architecture.md`**](file:///d:/Projects/CRM/docs/02-architecture.md) – Learn how FastAPI and Next.js communicate.
4. [**`08-backend/structure.md`**](file:///d:/Projects/CRM/docs/08-backend/structure.md) & [**`07-frontend/structure.md`**](file:///d:/Projects/CRM/docs/07-frontend/structure.md) – Explore the project directory layout.
5. [**`04-features/`**](file:///d:/Projects/CRM/docs/04-features/) – Review individual feature behavior.

### 2. Frontend Engineer
1. [**`03-getting-started.md`**](file:///d:/Projects/CRM/docs/03-getting-started.md) – Boot backend and frontend locally.
2. [**`07-frontend/structure.md`**](file:///d:/Projects/CRM/docs/07-frontend/structure.md) – Inspect Next.js App Router tree and CSS variables.
3. [**`07-frontend/state-and-data.md`**](file:///d:/Projects/CRM/docs/07-frontend/state-and-data.md) – Understand `src/lib/api.js` client wrapper and auth tokens.
4. [**`07-frontend/pages.md`**](file:///d:/Projects/CRM/docs/07-frontend/pages.md) – Learn what each page does and which endpoints it binds to.
5. [**`05-api/overview.md`**](file:///d:/Projects/CRM/docs/05-api/overview.md) – API contracts and error formatting.

### 3. Backend Engineer
1. [**`02-architecture.md`**](file:///d:/Projects/CRM/docs/02-architecture.md) – Multi-tenant isolation and security context.
2. [**`06-database/schema.md`**](file:///d:/Projects/CRM/docs/06-database/schema.md) & [**`06-database/erd.md`**](file:///d:/Projects/CRM/docs/06-database/erd.md) – Relational entity model.
3. [**`08-backend/structure.md`**](file:///d:/Projects/CRM/docs/08-backend/structure.md) – Dependency injection, routers, and models.
4. [**`08-backend/business-logic.md`**](file:///d:/Projects/CRM/docs/08-backend/business-logic.md) – Core domain rules and edge cases.
5. [**`11-testing.md`**](file:///d:/Projects/CRM/docs/11-testing.md) – Running `pytest` and adding test fixtures.

### 4. DevOps / System Administrator
1. [**`09-deployment.md`**](file:///d:/Projects/CRM/docs/09-deployment.md) – Production runtime, Docker containers, reverse proxies.
2. [**`10-configuration.md`**](file:///d:/Projects/CRM/docs/10-configuration.md) – Environment variables and secret management.
3. [**`12-troubleshooting.md`**](file:///d:/Projects/CRM/docs/12-troubleshooting.md) – Common operational issues and fixes.

---

## Technology Stack Snapshot

- **Backend Runtime**: Python 3.10+
- **Backend Framework**: FastAPI 0.109+ (ASGI)
- **Web Server**: Uvicorn 0.27+
- **Database ORM**: SQLAlchemy 2.0+
- **Database Engine**: SQLite 3 (production upgrade path to PostgreSQL)
- **Schema Validation**: Pydantic v2
- **Authentication**: JWT (JSON Web Tokens) with `python-jose` & `passlib[bcrypt]`
- **Migrations**: Alembic 1.13+ with custom SQLite migration scripts
- **Frontend Framework**: Next.js 14.2+ (App Router)
- **Frontend UI**: React 18, Lucide React icons, Glassmorphic Vanilla CSS
- **Testing**: Pytest 9+, FastAPI TestClient, in-memory/test SQLite DBs
