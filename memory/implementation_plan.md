# Capacity Connect Implementation Plan

This implementation plan details the setup and execution of the Capacity Connect platform, an enterprise-grade digital capacity building, competency development, and learning management platform. The architecture is a monorepo consisting of a Next.js (App Router) frontend, a NestJS backend, and a PostgreSQL database using Prisma ORM.

## User Review Required

- **Stack confirmation:** Ensure that the locked technical stack (Turborepo, Next.js 14+, NestJS, Prisma, PostgreSQL 15+, Redis, BullMQ) is acceptable for your environment.

## Open Questions

- **AI Integrations:** The AI provider is pluggable but defaults to OpenAI/Anthropic/Local. Since you haven't decided yet, we will implement the `AIService` interface with a mock/stub adapter for now, which can be swapped out later.

## Proposed Changes

### 1. Architecture Definition & Monorepo Setup (Phases 1-2)
- Set up Turborepo with `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared-types`, `packages/ui`, and `packages/db` (for Prisma schema and client).
- Initialize Prisma with the complete relational schema described in the spec.
- **Files to be created:** `package.json`, `turbo.json`, `.env.example`, `apps/api/src/...`, `apps/web/src/...`, `packages/db/prisma/schema.prisma`, `docker-compose.yml` (services: postgres, redis, minio).

### 2. Authentication & RBAC (Phase 3)
- Implement JWT based auth with refresh tokens, Argon2id hashing, and Role-Based Access Control (RBAC).

### 3. Core Feature Modules (Phases 4-6)
- **Trainee Module:** Profiles, course discovery, enrollments, assessment attempts, dashboard.
- **Trainer Module:** Expertise management, course creation, resource uploads, analytics.
- **Admin Module:** User approvals, moderation, dashboards, system settings, audit logs.

### 4. Advanced Engines & Business Logic (Phases 7-11)
- **Competency & Matching Engines (Phases 7-8):** Skill gap analysis, org heatmaps, and weighted scoring algorithm for matching trainees with trainers.
- **Assessments & Certification (Phase 9):** Pre/post tests, automated grading, QR-based digital certificates, and a PUBLIC (no-auth) verification page at `/verify/:token` (distinct, admin-independent route).
- **Analytics & AI (Phases 10-11):**
  - **Phase 10:** Organizational intelligence and analytics dashboards.
  - **Phase 11:** Pluggable AI service for generative explanations of skill gaps and matches.

### 5. Polish, Security, & Testing (Phases 12-16)
- Input validation (DTOs), security hardening, accessible UI.
- E2E testing (Playwright), Unit tests (Jest).
- Realistic data seeding.
- Final `PRODUCTION_READINESS.md`.

## Verification Plan

### Automated Tests
- `npm run test` across all packages (Jest for API, React Testing Library for Web).
- Playwright E2E tests for core user journeys (Trainee flow, Trainer flow, Admin flow).
- **Security & RBAC:** Integration test asserting a forged/tampered role claim in a request body/token is ignored server-side.
- **AI Safety:** Integration test confirming the AI module has no write path to `users`, `roles`, `permissions`, or `user_roles` tables.

### Manual Verification
- Run `docker-compose up` to verify the entire stack boots successfully.
- Log in with generated demo accounts and verify that dashboards populate with seeded data.
- Run axe-core accessibility checks on the UI.
- **Audit Logs:** Verify that sensitive admin actions (approval, role change, certificate issuance) correctly produce `audit_logs` rows.
- **Storage Abstraction:** Verify that switching the storage adapter (local disk → S3/MinIO) requires only a config/env change, not code changes.
