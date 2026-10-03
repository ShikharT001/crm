# ADR 003: Periodic Client-Side HTTP Polling vs. WebSockets

## Status
Accepted

## Context
The CRM requires real-time features:
1. Proactive due alerts and popups 5 minutes before scheduled meetings or daily tasks.
2. Team chat message feeds updating as team members chat.
3. Online team member presence monitoring.

We evaluated:
1. **Persistent Full-Duplex WebSockets**: Maintaining persistent TCP connections between clients and FastAPI workers.
2. **Server-Sent Events (SSE)**: Unidirectional streaming HTTP connections.
3. **Periodic HTTP Polling with Client-Side Synthesis**: Scheduled `fetch()` calls at 30-second (reminders) and 3-second (active chat) intervals, coupled with the browser's native Web Audio API for alert sounds.

## Decision
We chose **Periodic HTTP Polling with Client-Side Synthesis**.

## Rationale
- **Infrastructure Simplicity**: WebSockets require stateful sticky sessions, specialized reverse proxy configuration (upgrading HTTP connections), and distributed pub/sub brokers (like Redis) when scaling to multiple worker processes.
- **Stateless Server Architecture**: HTTP polling keeps the FastAPI backend 100% stateless and cache-friendly.
- **Low Overhead**: A 30-second poll to `GET /api/reminders/due` involves an index-backed SQLite query returning small JSON payloads (&lt; 1KB).
- **Zero Asset Dependencies**: The alert chime is synthesized in real time via the browser's `AudioContext`, eliminating missing audio file errors.

## Consequences
- **Positive**: Zero complex server infrastructure, works behind any standard reverse proxy, runs anywhere with zero configuration.
- **Negative / Trade-off**: Up to a few seconds of latency on incoming chat messages, which is fully acceptable for internal team CRM communication.
