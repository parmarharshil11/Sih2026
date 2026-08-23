# Capacity Connect - Project Memory & Handover

This document serves as the project memory to continue development across different sessions or accounts.

## Current State & Achievements

We are building a scalable, enterprise-grade learning and capacity-building platform (Capacity Connect) using a monorepo architecture.

**Phases 1 through 15 have been FULLY completed.**

- **Phase 1 (Architecture):** Turborepo configured with Next.js (`apps/web`), NestJS (`apps/api`), Prisma (`packages/db`), and shared UI packages.
- **Phase 2 (Database):** Full 40+ table Prisma schema implemented. Docker Compose setup running Postgres on port `5433` (or `5432`), Redis, and MinIO.
- **Phase 3 (Auth):** JWT (HttpOnly cookie) authentication with Argon2id hashing, and Role-Based Access Control (RBAC) configured globally in NestJS.
- **Phase 4 (Trainee Module):** Profile CRUD, Interests, Work History, Qualifications tracking APIs implemented.
- **Phase 5 (Trainer Module):** Profile CRUD, Availability schedules, and Expertise setting APIs implemented.
- **Phase 6 (Admin Module):** User management, Approval workflows for trainers/courses, and system audit logs API.
- **Phase 7 (Competency Engine):** Skill Gap Calculator (`gapValue = max(0, requiredLevel - currentLevel)`). Provides full skill gap reports and critical gap feeds, persisted as `SkillGapAnalysis`.
- **Phase 8 (Matching Engine):** Multi-signal matching algorithm (Skill Overlap 35%, Proficiency Delta 20%, Availability 15%, Experience 10%, Rating 10%, Certification 10%). Supports Trainee-to-Trainer and Course-to-Trainer matching.
- **Phase 9 (Courses, Assessments, Certification):** Full course lifecycle APIs, MCQ assessment engine with server-side grading & cheating prevention, QR Certificate generation with a public verification endpoint.
- **Phase 10 (Analytics & Organizational Intelligence):** Aggregated analytics service providing admin overview, department competency heatmaps, trainer effectiveness metrics, critical gap feeds, and low pass-rate quiz detectors.
- **Phase 11 (AI-Assisted Features):** Pluggable `AiService` for skill gap explanations, trainer recommendation narratives, and course outline drafting with strict "draft status" and "no permission-table writes" security enforcement.
- **Phase 12 (Security Hardening & Audit Logging):** Rate limiting (`ThrottlerModule`), magic-byte file upload validation (`FileValidationInterceptor`), global exception filter for Prisma masking, and transactional audit logging across all state-changing endpoints.
- **Phase 13 (Responsive Next.js UI & Accessibility):** Modern Glassmorphism dark mode web application featuring Public Landing Page, Unauthenticated Public Certificate Verifier, Trainee Portal (Dashboard, Catalog, Course Player, MCQ Assessment Stepper, Certificate Vault), Trainer Studio (Dashboard, Course Builder with AI Assistant, Assessment Authoring), and Admin Console (Executive Analytics, User/Verification Manager, Course Moderation Queue, Real-time Audit Log Stream).
- **Phase 14 (Realistic Data Seeding):** `packages/db/prisma/seed.ts` populating 4 Departments, Admin, 5 Verified Trainers, 15 Trainees, 10 Competencies, 8 Courses with modules & resources, MCQ Question Banks, Enrollments, Progress, Verifiable Certificates, Match Scores, and Audit Logs.
- **Phase 15 (Verification, Testing & Production Readiness):**
  - 6 Unit test suites (auth, course, assessment, certificate, analytics, ai) with full Prisma mocking.
  - 3 E2E test suites: RBAC enforcement (expanded cross-role), Course lifecycle flow, Certificate flow.
  - `PRODUCTION_READINESS.md` at repo root with env vars, startup sequence, health checks, security summary, demo credentials.
  - `docker-compose.yml` extended with `api` and `web` service definitions with health check `depends_on`.
  - `apps/api/Dockerfile` and `apps/web/Dockerfile` added (multi-stage builds).
  - `apps/api/src/main.ts` updated with `setGlobalPrefix('api/v1')`.
  - TypeScript typecheck passes with **0 errors**.

## Build Status
- `npx tsc --noEmit` in `apps/api` → ✅ 0 errors
- `npx tsc --noEmit` in `apps/web` → ✅ 0 errors
- `npm run build` in `apps/web` → ✅ Success (all 14 pages)

## Technical Details & Quirks
- **Database Client:** Prisma client is generated into `packages/db/generated/client` and exported via `@repo/db`.
- **Audit Logging:** Global `AuditService` in `PrismaModule` logs events synchronously within Prisma transactions (`$transaction`).
- **AI Security:** AI draft features force `CourseStatus.draft` status with zero permission-table mutation rights.
- **TrainerProfile Schema:** Uses `verificationStatus: VerificationStatus` enum (`pending/verified/rejected`), NOT a boolean `isVerified` field.
- **RegisterDto:** The `role` field is typed as `'trainee' | 'trainer'` literal union (NOT `string`). Use `as const` in tests.
- **Global Prefix:** All API routes are under `/api/v1` (set in `main.ts` with `setGlobalPrefix`).
- **E2E Tests:** Require a running PostgreSQL instance. All test data uses unique timestamp-suffixed emails to prevent collision.

## How to Resume
1. Run `docker compose up -d postgres redis minio` to ensure infrastructure is running.
2. Run `npx prisma db seed` in `packages/db` to populate test data.
3. Run `npm run dev` to start dev servers for both API and Web apps.
4. All phases 1-15 are complete. The project is production-ready.

## Demo Credentials (from seed)
- Admin: `admin@capacityconnect.org` / `Password123!`
- Trainer: `alice.trainer@capacityconnect.org` / `Password123!`
- Trainee: `john.trainee@capacityconnect.org` / `Password123!`
