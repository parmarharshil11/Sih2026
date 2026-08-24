# Capacity Connect — Production Readiness Guide

> **Last Updated:** Phase 16c (Docs & Final Push)  
> **Platform Phases Completed:** 1–16  

---

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [Docker Compose Startup](#2-docker-compose-startup)
3. [Database Setup & Seeding](#3-database-setup--seeding)
4. [Health Check Endpoints](#4-health-check-endpoints)
5. [Security Hardening Summary](#5-security-hardening-summary)
6. [Phase 16 Formal Checklist](#6-phase-16-formal-checklist)
7. [Running Tests](#7-running-tests)
8. [Known Limitations & Out-of-Scope](#8-known-limitations--out-of-scope)
9. [Demo Credentials (Seed Data)](#9-demo-credentials-seed-data)

---

## 1. Environment Variables

Copy `.env.example` to `.env` at the repository root and fill in each value:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://ccuser:ccpassword@localhost:5433/capacityconnect` |
| `JWT_SECRET` | HS256 signing secret (≥ 64 chars) | Generate with `openssl rand -hex 64` |
| `JWT_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token secret | Generate with `openssl rand -hex 64` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `MINIO_ENDPOINT` | MinIO host | `localhost` |
| `MINIO_PORT` | MinIO port | `9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO secret key | `minioadmin` |
| `MINIO_BUCKET_NAME` | S3 bucket for uploads | `capacity-connect` |
| `API_BASE_URL` | Public API URL (used in QR codes) | `http://localhost:4000` |
| `NEXT_PUBLIC_API_URL` | Web app's API base URL | `http://localhost:4000` |

> [!CAUTION]
> **NEVER** commit `.env` to version control. The `.gitignore` is already configured to exclude it.

> [!IMPORTANT]
> In production, ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are at least 64 random bytes generated with a CSPRNG.

---

## 2. Docker Compose Startup

The full Capacity Connect stack (API, Web, PostgreSQL, Redis, MinIO) is managed via Docker Compose.

### Prerequisites

- Docker Desktop ≥ 24 (or Docker Engine + Compose Plugin)
- Ports available: `4000` (API), `3000` (Web), `5433` (Postgres), `6379` (Redis), `9000/9001` (MinIO)

### Start All Services

```bash
# Start infrastructure services first
docker compose up -d postgres redis minio

# Wait for postgres to be healthy (~10 seconds)
docker compose ps

# Then start the application
docker compose up -d api web
```

### Full Stack Bring-up (Single Command)

```bash
docker compose up -d
```

> [!NOTE]
> The `api` service depends on `postgres` and `redis` health checks. If they're not healthy, the API will not start.

### Verify Services

```bash
docker compose ps
# All services should show "running (healthy)"
```

### Tear Down

```bash
docker compose down            # Stop & remove containers
docker compose down -v         # Also remove volumes (DELETES ALL DATA)
```

---

## 3. Database Setup & Seeding

### Apply Prisma Migrations

```bash
# From repository root
npx turbo db:migrate

# Or directly from the db package
cd packages/db
npx prisma migrate deploy
```

### Generate Prisma Client

```bash
cd packages/db
npx prisma generate
```

### Seed Database with Realistic Data

```bash
cd packages/db
npx prisma db seed
```

#### What Gets Seeded

| Entity | Count | Details |
|---|---|---|
| Departments | 4 | Engineering, Finance, Human Resources, Operations |
| Admin | 1 | `admin@capacityconnect.org` |
| Trainers (Verified) | 5 | Various departments & specializations |
| Trainees | 15 | Diverse qualifications & competency baselines |
| Competencies | 10+ | Cloud Architecture, Cyber Defense, Full-Stack Dev, etc. |
| Courses | 8 | Multi-module, published, with MCQ question banks |
| Certificates | 5+ | Verifiable with QR tokens |
| Audit Logs | Varied | Initial system events |

---

## 4. Health Check Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `GET /api/v1/health` | GET | None | API liveness check |
| `GET /api/v1/auth/me` | GET | JWT | Auth health + token verify |
| `GET /api/v1/certificates/verify/:token` | GET | None | Public certificate validation |

> [!TIP]
> Use `GET /api/v1/health` in Docker health checks and load balancer probes.

---

## 5. Security Hardening Summary

All security features implemented in **Phase 12**:

### Authentication & Authorization
- ✅ **JWT HttpOnly Cookie Auth** — Tokens stored in HttpOnly, Secure, SameSite=Strict cookies
- ✅ **Refresh Token Rotation** — Stateless JWTs with server-side refresh token tracking & revocation
- ✅ **Refresh Token Reuse Detection** — All tokens revoked on suspicious reuse
- ✅ **RBAC** — Server-enforced role checks via `RolesGuard` (cannot be forged via request body)
- ✅ **Argon2id Password Hashing** — Industry-best password storage

### Input Validation
- ✅ **Global ValidationPipe** — `whitelist: true, forbidNonWhitelisted: true` strips unknown fields
- ✅ **Class-validator DTOs** — Strict type, length, and format validation on all endpoints
- ✅ **UUID route parameters** — `ParseUUIDPipe` prevents SQL injection via path params
- ✅ **File upload validation** — MIME-type sniffing + size caps on all file endpoints

### Security Headers (via Helmet)
- ✅ Content-Security-Policy
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Strict-Transport-Security (HSTS)
- ✅ Referrer-Policy

### Rate Limiting (via Throttler)
| Throttle Tier | TTL | Limit | Applied To |
|---|---|---|---|
| `auth` | 15 min | 5 requests | `/auth/login`, `/auth/register` |
| `register` | 1 hour | 3 requests | `/auth/register` |
| `ai` | 1 min | 10 requests | `/ai/*` endpoints |
| `default` | 1 min | 100 requests | All other endpoints |

### AI Service Constraints (Phase 11/12)
- ✅ **No Permission-Table Writes** — `AiService` structurally cannot mutate `users`, `roles`, `permissions`, `userRoles`
- ✅ **Draft Status Enforcement** — All AI-generated courses are forced to `status: draft`

### Audit Logging
- ✅ All mutating actions (auth events, course status changes, certificate issuance, role modifications) write synchronously to `audit_logs` table within the same DB transaction

---

## 6. Phase 16 Formal Checklist

This project underwent a comprehensive Phase 16 review and bug fix audit to guarantee production stability and algorithmic correctness.

### Phase 16a: Security & Static Audit
- ✅ Verified all `@Roles()` guards are properly applied across controllers.
- ✅ Hardened `main.ts` with global interceptors, exception filters, and security headers.
- ✅ Audited the entire codebase for hardcoded secrets, stripping accidental credentials.
- ✅ Scrubbed `console.log` statements in favor of structured `Logger` service calls.

### Phase 16b: Algorithmic & Business Logic Correctness
- ✅ **MatchingService**: Fixed score weighting (`NaN` bug from `avgRating` schema mismatch) and safely clamped outputs.
- ✅ **AuthService**: Implemented brute-force lockout (15-min lock after 5 failures) and fortified refresh token reuse tracking to only invalidate the victim's token family.
- ✅ **CourseService**: Finalized state-machine logic by adding the missing `archiveCourse` endpoint and preventing arbitrary status bypass in the generic update DTO.
- ✅ **CompetencyService**: Fixed unbounded row growth in gap computation by shifting from `create` to `upsert` logic.
- ✅ **AnalyticsService**: Added safe optional-chaining to prevent null-crashes when aggregated entities (like deleted trainers) are missing from historical reports.
- ✅ **AssessmentService**: Streamlined ownership validation paths to eliminate dead code.
- ✅ **AiService**: Enforced transaction safety (`tx`) for default AI-category creation.

---

## 7. Running Tests

### Unit Tests (No Database Required)

```bash
cd apps/api
npm test                    # Run all unit tests
npm run test:cov            # Run with coverage report
```

### E2E Tests (Requires Running PostgreSQL)

```bash
# Start the test database (or use your existing docker-compose postgres)
docker compose up -d postgres

# Set the database URL for tests
$env:DATABASE_URL = "postgresql://ccuser:ccpassword@localhost:5433/capacityconnect"

cd apps/api
npm run test:e2e            # Run all e2e test suites
```

### TypeScript Typecheck

```bash
# API
cd apps/api && npx tsc --noEmit

# Web
cd apps/web && npx tsc --noEmit
```

### Full CI Pipeline (Turbo)

```bash
npx turbo type-check test
```

---

## 8. Known Limitations & Out-of-Scope

| Item | Status | Notes |
|---|---|---|
| Email Sending | 🔴 Not Implemented | Email verification and password reset generate tokens but don't send emails. Add an SMTP provider (SendGrid, Resend, SES) by implementing the `TODO` comments in `auth.service.ts` |
| Real AI Model | 🟡 Simulated | `AiService` uses deterministic logic + `setTimeout` to simulate AI. Replace with OpenAI/Gemini SDK calls behind the same interface. |
| File Storage (MinIO) | 🟡 Key Abstraction | Resource file upload endpoints store `storageKey` but MinIO presigned URL generation is not fully integrated. |
| Real-time Notifications | 🔴 Not Implemented | Notification service schema and service exist (Phase 8) but WebSocket/SSE is not yet wired up. |
| Production SSL/TLS | 🔴 Not Configured | Add an nginx reverse proxy or configure `app.enableCors()` with HTTPS origins for production. |
| Multi-tenant Isolation | 🔴 Out of Scope | The platform currently supports single-tenant deployment. |

---

## 9. Demo Credentials (Seed Data)

> [!WARNING]
> These are **development-only** seed credentials. Change all passwords before deploying to production.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@capacityconnect.org` | `Password123!` |
| Trainer 1 | `alice.trainer@capacityconnect.org` | `Password123!` |
| Trainer 2 | `bob.trainer@capacityconnect.org` | `Password123!` |
| Trainer 3 | `carol.trainer@capacityconnect.org` | `Password123!` |
| Trainee 1 | `john.trainee@capacityconnect.org` | `Password123!` |
| Trainee 2 | `jane.trainee@capacityconnect.org` | `Password123!` |

> Full seeded user list printed in console output when running `npx prisma db seed`.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Capacity Connect Stack                 │
├─────────────┬─────────────┬────────────┬───────────────┤
│  Next.js    │  NestJS API │ PostgreSQL │  Redis/MinIO  │
│  Web App    │  (Port 4000)│ (Port 5433)│               │
│  Port 3000  │             │            │               │
└─────────────┴─────────────┴────────────┴───────────────┘
      │               │             │
      └───────────────┤             │
             JWT HttpOnly Cookies   │
                      │             │
                 Prisma ORM ────────┘
```
