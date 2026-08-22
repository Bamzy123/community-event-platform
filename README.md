# Community Event Platform - REST API Backend

A clean REST API backend built for the **48-Hour Coding Challenge** featuring two distinct user roles: **Customers** and **Venue Managers**. 

Customers can suggest events, browse event suggestions, upvote suggestions, and submit events into a target venue's approval queue. Venue Managers can inspect pending event suggestions for their assigned venues (sorted by upvotes descending) and approve or reject them with server-side authorization enforcement.

---

## Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm

### Setup & Run Instructions

```bash
# 1. Install dependencies
npm install

# 2. Seed database with pre-configured venues, managers, customers, & events
npm run seed

# 3. Run automated API & security test suite
npm test

# 4. Start the API server
npm run dev
```

API Server endpoints will be available at [http://localhost:3000/api](http://localhost:3000/api).

---

## REST API Endpoints Overview

### Authentication
- `POST /api/auth/signup`: Register a new user (`CUSTOMER` or `VENUE_MANAGER`).
- `POST /api/auth/login`: Authenticate and receive a JWT token.
- `GET /api/auth/me`: Get current authenticated user profile.

### Venues
- `GET /api/venues`: Public/Customer endpoint listing available venues.

### Customer Features
- `POST /api/events`: Suggest an event (Requires `CUSTOMER` role).
- `GET /api/events`: Browse events (Filter by `venueId`, `status`, includes vote counts & user upvote status).
- `POST /api/events/:id/upvote`: Upvote an event (Requires `CUSTOMER` role, 1 vote per user).
- `DELETE /api/events/:id/upvote`: Remove upvote (Requires `CUSTOMER` role).

### Venue Manager Queue & Actions
- `GET /api/manager/queue`: Venue manager approval queue, scoped exclusively to assigned venues, sorted by upvote count descending (Requires `VENUE_MANAGER` role).
- `PATCH /api/manager/events/:id/status`: Approve (`APPROVED`) or Reject (`REJECTED`) an event (Requires `VENUE_MANAGER` role, enforces venue ownership).

---

## Pre-seeded Test Accounts

The seed script (`npm run seed`) creates pre-configured accounts for testing:

| Role | Name | Email | Password | Scope |
|---|---|---|---|---|
| **Customer** | Alice Johnson | `alice@customer.com` | `password123` | Can suggest & upvote events |
| **Customer** | Bob Smith | `bob@customer.com` | `password123` | Can suggest & upvote events |
| **Customer** | Charlie Brown | `charlie@customer.com` | `password123` | Can suggest & upvote events |
| **Venue Manager** | Manager Mark | `manager1@platform.com` | `password123` | Manages **Grand Symphony Hall** |
| **Venue Manager** | Manager Sarah | `manager2@platform.com` | `password123` | Manages **Riverside Outdoor Amphitheater** |

---

## Architecture & Data Model

### Stack Overview
- **Backend Framework**: Node.js + Express + TypeScript
- **Database & ORM**: SQLite + Prisma ORM (`@prisma/adapter-better-sqlite3`)
- **Authentication**: JWT Bearer Tokens + `bcryptjs` password hashing

### Data Schema (`prisma/schema.prisma`)
- **`User`**: Stores identity, email, password hash, and `Role` (`CUSTOMER` or `VENUE_MANAGER`).
- **`Venue`**: Venues hosting community events.
- **`VenueManager`**: Join table mapping Venue Managers to one or more specific Venues.
- **`Event`**: Stores event title, description, proposed date/time, `EventStatus` (`PENDING`, `APPROVED`, `REJECTED`), `venueId`, and `creatorId`.
- **`Vote`**: Enforces one vote per user per event via composite unique key `@unique([userId, eventId])`.

---

## Security & Role-Based Authorization

1. **Server-Side Authorization**: All manager actions (`GET /api/manager/queue`, `PATCH /api/manager/events/:id/status`) enforce strict role checking (`requireRole('VENUE_MANAGER')`).
2. **Venue Manager Scoping**: When a Venue Manager requests their queue, only events for venues explicitly linked to them in `VenueManager` are returned. When approving/rejecting an event, the backend verifies that the manager owns the target venue and rejects unauthorized attempts with `403 Forbidden`.
3. **Voting Integrity**: Database unique constraints prevent duplicate upvotes at the database layer.

---

## Tradeoffs & Future Roadmap

### Decisions & Assumptions
- **Automatic Queue Submission**: Event suggestions automatically enter the target venue manager's queue upon creation with status `PENDING`.
- **Rejection Policy**: Rejected events remain recorded as `REJECTED` in the system for auditing history; customers can submit fresh suggestions.

---

## AI Assistance Attribution

In accordance with the challenge AI policy, AI tools (Antigravity IDE / Gemini 3.6 Flash) assisted in:
- Generating initial boilerplate configurations for Prisma 7 SQLite driver adapters.
- Authoring the automated API test runner script (`src/tests/api.test.ts`).
