# 10 - Configuration & Environment Variables

This document catalogs all environment variables used by the backend and frontend components, their default settings, and production security recommendations.

---

## 1. Backend Environment Variables (`backend/.env.local`)

| Variable | Type | Default Value | Description | Production Guidance |
| :--- | :--- | :--- | :--- | :--- |
| **`SECRET_KEY`** | `string` | `crm-super-secret-jwt-key-...` | Secret cryptographic key used to sign and verify JWT access tokens via HS256. | **CRITICAL**: Must be replaced with a random 256-bit hexadecimal string (`openssl rand -hex 32`). |
| **`JWT_SECRET_KEY`** | `string` | Fallback to `SECRET_KEY` | Secondary alias for JWT secret key. | Set to match `SECRET_KEY`. |
| **`DATABASE_URL`** | `string` | `sqlite:///./crm.db` | SQLAlchemy database connection URI. | For production, supply PostgreSQL URI: `postgresql://user:pass@host:5432/dbname`. |
| **`ACCESS_TOKEN_EXPIRE_MINUTES`** | `integer`| `480` (8 hours) | Token validity lifespan in minutes. | Recommended: 60 minutes for high security, paired with refresh tokens. |
| **`AUTH_PASSWORD`** | `string` | `admin123` | Legacy fallback password for development demo accounts. | Leave unset or blank in production environments. |

---

## 2. Frontend Environment Variables (`frontend/.env.local`)

| Variable | Type | Default Value | Description | Production Guidance |
| :--- | :--- | :--- | :--- | :--- |
| **`NEXT_PUBLIC_API_URL`** | `string` | `http://localhost:8000` | The origin URL of the FastAPI backend API server. | Set to public API domain (e.g. `https://api.yourdomain.com`). |
| **`NEXT_PUBLIC_AUTH_PASSWORD`** | `string` | `admin123` | Legacy convenience fallback for local testing. | Remove in production. |

> [!IMPORTANT]
> Any variable prefixed with `NEXT_PUBLIC_` is inlined into the client-side JavaScript bundle during the Next.js build. **Never place private keys, database passwords, or secret tokens in `NEXT_PUBLIC_` variables.**

---

## 3. Recommended Production Environment Files

### Backend (`/etc/crm/backend.env`):
```ini
ENVIRONMENT=production
DATABASE_URL=postgresql://crm_prod_user:J9v#kL2!mP9$wQ@db.internal:5432/crm_prod
SECRET_KEY=9f834c2b9a715f013d8e5c6b7a2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

### Frontend (`/etc/crm/frontend.env`):
```ini
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.crm.yourdomain.com
PORT=3000
```
