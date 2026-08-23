# Capacity Connect - Project Memory & Handover

This document serves as the project memory to continue development across different sessions or accounts.

## Current State & Achievements
We are building a scalable, enterprise-grade learning and capacity-building platform (Capacity Connect) using a monorepo architecture. 

**Phases 1 through 8 have been FULLY completed.**
- **Phase 1 (Architecture):** Turborepo configured with Next.js (`apps/web`), NestJS (`apps/api`), Prisma (`packages/db`), and shared UI packages.
- **Phase 2 (Database):** Full 40+ table Prisma schema implemented. Docker Compose setup running Postgres on port `5433`, Redis, and MinIO.
- **Phase 3 (Auth):** JWT (HttpOnly cookie) authentication with Argon2id hashing, and Role-Based Access Control (RBAC) configured globally in NestJS.
- **Phase 4 (Trainee Module):** Profile CRUD, Interests, Work History, Qualifications tracking APIs implemented.
- **Phase 5 (Trainer Module):** Profile CRUD, Availability schedules, and Expertise setting APIs implemented.
- **Phase 6 (Admin Module):** User management, Approval workflows for trainers/courses, and system audit logs API.
- **Phase 7 (Competency Engine):** Implemented the Skill Gap Calculator (`gapValue = max(0, requiredLevel - currentLevel)`). Provides full skill gap reports and critical gap feeds, persisted as `SkillGapAnalysis`.
- **Phase 8 (Matching Engine):** Multi-signal matching algorithm implemented (Skill Overlap 35%, Proficiency Delta 20%, Availability 15%, Experience 10%, Rating 10%, Certification 10%). Supports Trainee-to-Trainer and Course-to-Trainer matching with human-readable reasoning.

**Build Status:**
- `npm run build` in `apps/api` succeeds with 0 errors. TypeScript configurations and cross-workspace imports (`@repo/db`) are working perfectly.

## Technical Details & Quirks
- **Database Port:** Postgres is mapped to `5433` (not 5432) to avoid conflicts with local installations. (`DATABASE_URL=postgresql://ccuser:ccpassword@localhost:5433/capacityconnect`)
- **Module Resolution:** NestJS TS config uses `Node16` for module resolution to work seamlessly with Turborepo workspaces.
- **Database Client:** Prisma client is generated into `packages/db/generated/client` and imported via `@repo/db`. Some methods require explicit `Promise<any>` return types in Controllers/Services to avoid TypeScript declaration emission errors.

## Future Tasks & Implementation Plan

### Phase 9: Courses, Resources, Assessments, Certification (Next Up)
- Build out Course lifecycle APIs (CRUD for courses, modules, resources).
- Implement the Assessment engine (MCQs, automated grading).
- Create QR Certificate generation and a public verification endpoint.

### Phase 10: Analytics & Organizational Intelligence
- Implement data aggregation for dashboards (Admin overview, Trainee stats).

### Phase 11: AI-Assisted Features
- Implement the `AIService` stub (for features like `explainSkillGap`, `recommendTrainers`).

### Phase 12 & 13: Security, UI, Accessibility
- Finalize API input validation.
- Build out the actual Next.js frontend in `apps/web` connecting to the NestJS API.

### Phase 14-16: Polish
- Seed realistic data.
- E2E Testing, bug triage, and production readiness.

## How to Resume
1. Run `docker-compose up -d` to ensure DB is running.
2. Ensure you set the `DATABASE_URL` environment variable properly when running tests or migrations.
3. Use `npm run dev` in the root to start the Turborepo dev servers.
4. Pick up from **Phase 9** (Courses and Assessments) by scaffolding the course module in `apps/api`.
