# ADR 004: Stateless JWT Authentication with Database Audit Logging

## Status
Accepted

## Context
We needed a secure authentication mechanism that integrates cleanly across Next.js frontend pages and FastAPI REST endpoints without session coupling or CSRF vulnerability headaches. We evaluated:
1. **Server-Side Session Cookies**: HTTP-only session cookies backed by server Redis or DB sessions.
2. **Stateless JWT (JSON Web Tokens)**: Cryptographically signed Bearer tokens stored on the client.

## Decision
We chose **Stateless JWT Tokens** (HS256 signed) paired with a server-side **Audit Activity Log** (`user_activity_logs`).

## Rationale
- **Decoupled Frontend & Backend**: Stateless Bearer tokens allow the Next.js frontend and FastAPI backend to be hosted on completely different domains or ports without complex cross-site cookie and CORS credentials friction.
- **Self-Contained Claims**: The JWT token contains `sub` (user ID), `company_id`, and `role`, enabling fast context resolution on every backend request without redundant database joins.
- **Audit & Presence Tracking**: To retain the accountability of traditional session backends without the architectural weight, successful login and logout operations are recorded in `user_activity_logs`, which powers the 24-hour online presence monitor.

## Consequences
- **Positive**: Clean REST architecture, easy to test with `curl` or automated test clients, horizontal scalability across backend workers.
- **Negative / Trade-off**: JWT tokens cannot be revoked individually mid-lifecycle without a blacklist; this is mitigated by our 8-hour expiry window and the ability to instantly deactivate compromised accounts via `is_active = False`.
