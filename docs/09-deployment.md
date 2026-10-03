# 09 - Deployment & Production Operations

This document describes how to deploy, host, and scale the **Enterprise CRM** full-stack application across development, staging, and production environments.

---

## Production Architecture Diagram

```mermaid
flowchart TD
    Client["Client Browsers (HTTPS)"] --> Proxy["Reverse Proxy / Load Balancer (Nginx / Cloudflare)"]

    subgraph AppHost["Application Server (Linux / Docker)"]
        Proxy -->|Port 3000| NextServer["Next.js 14 Node Server (Frontend)"]
        Proxy -->|Port 8000 /api| FastAPIWorkers["Uvicorn ASGI Workers (FastAPI Backend)"]
    end

    subgraph DataHost["Managed Database Layer"]
        FastAPIWorkers -->|SQLAlchemy 2.0| Postgres[("PostgreSQL 15+ (Production DB)")]
    end
```

---

## 1. Upgrading from SQLite to PostgreSQL

While local development uses SQLite (`crm.db`), production deployments should use **PostgreSQL** for multi-worker concurrency and connection pooling:

1. Install PostgreSQL drivers:
   ```powershell
   pip install psycopg2-binary
   ```
2. Update `backend/.env.local`:
   ```ini
   DATABASE_URL=postgresql://crm_user:SecurePass123@localhost:5432/crm_production
   ```
3. Update `backend/app/database.py`:
   ```python
   import os
   SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./crm.db")
   engine = create_engine(
       SQLALCHEMY_DATABASE_URL,
       connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
   )
   ```
4. Run migrations:
   ```powershell
   alembic upgrade head
   ```

---

## 2. Docker Containerization

### Backend Dockerfile (`backend/Dockerfile`)
```dockerfile
FROM python:3.10-slim

WORKDIR /app
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Frontend Dockerfile (`frontend/Dockerfile`)
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
```

---

## 3. Docker Compose Orchestration (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: crm_postgres
    restart: always
    environment:
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: crm_password
      POSTGRES_DB: crm_production
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    container_name: crm_backend
    restart: always
    environment:
      DATABASE_URL: postgresql://crm_user:crm_password@db:5432/crm_production
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - db
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    container_name: crm_frontend
    restart: always
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8000
    depends_on:
      - backend
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

---

## 4. CI/CD GitHub Actions Pipeline

Create `.github/workflows/ci.yml`:
```yaml
name: CRM Continuous Integration

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python 3.10
        uses: actions/setup-python@v4
        with:
          python-version: "3.10"
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest
      - name: Run Backend Pytest Suite
        run: |
          cd backend
          python -m pytest tests/

  frontend-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js 18
        uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Build Next.js Application
        run: |
          cd frontend
          npm ci
          npm run build
```
