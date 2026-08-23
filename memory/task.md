# Capacity Connect Tasks

## Phase 1: Architecture Definition & Monorepo Setup
- [x] Initialize Turborepo (`apps/web`, `apps/api`, `packages/shared-types`, `packages/ui`, `packages/db`)
- [x] Produce ADR (Architecture Decision Record) documenting stack choices
- [x] Verify monorepo builds and turbo pipeline runs

## Phase 2: Database Schema & Docker Setup
- [x] Scaffold `packages/db` with Prisma
- [x] Define full 40+ table Prisma schema based on specs
- [x] Create monorepo `docker-compose.yml` (Postgres, Redis, MinIO)
- [x] Generate Prisma client and migrate dev database

## Phase 3: Core API Auth & RBAC
- [x] Scaffold `apps/api` with NestJS
- [x] Implement Argon2id + JWT HttpOnly Auth Module
- [x] Create User & Role Guards and global filters
- [x] Setup Rate Limiting for Auth Endpoints
- [x] Write e2e tests asserting that forged client roles are ignored and RBAC security

## Phase 4: Trainee Module
- [x] Profile CRUD
- [x] Interests & Work History
- [x] Qualifications tracking API

## Phase 5: Trainer Module
- [x] Profile CRUD
- [x] Availability & Expertise setting
- [x] Ratings / Feedback placeholders

## Phase 6: Admin Module
- [x] User management (CRUD, suspend, roles)
- [x] Approval workflows (trainers, courses)
- [x] System settings/logs view API

## Phase 7: Competency Engine & Skill Gap Analysis
- [x] Skills CRUD (admin-managed, read-accessible to all)
- [x] Competency CRUD with skill-linking
- [x] Trainee competency upsert (currentLevel / requiredLevel / targetLevel)
- [x] Gap calculator: `gapValue = max(0, requiredLevel - currentLevel)` → persisted as `SkillGapAnalysis` row
- [x] Classification: none(0) / low(1) / medium(2) / high(3) / critical(4+)
- [x] Full gap report endpoint (sorted by severity, with summary counts)
- [x] Critical-gaps filter endpoint (minLevel query param)
- [x] Admin/Trainer: view any trainee's gap report
- [ ] Org competency heatmap

## Phase 8: Trainer Matching Engine
- [x] Multi-signal scoring algorithm (6 weighted factors: skill overlap 35%, proficiency delta 20%, availability 15%, experience 10%, rating 10%, certification 10%)
- [x] Trainee-to-trainer matching: collects gap skills → scores all verified trainers → persists ranked results
- [x] Course-to-trainer matching: scores trainers against a course's skill requirements
- [x] Cached match retrieval endpoint
- [x] Admin endpoint: compute matches for any trainee
- [x] Human-readable `reasons` JSON persisted with each match score
- [x] Full score `breakdown` returned per trainer in API response

## Phase 9: Courses, Resources, Assessments, Certification
- [x] Full course lifecycle & resources
- [x] Assessment engine (MCQ, grading)
- [x] QR Certificate generation & public verification page

## Phase 10: Analytics & Organizational Intelligence
- [ ] Org intelligence queries (insights)
- [ ] Analytics dashboards & Reports

## Phase 11: AI-Assisted Features
- [ ] Implement `AIService` (explainSkillGap, recommendTrainers, etc.)
- [ ] Verify AI security constraints

## Phase 12: Security, Audit Logging & Validation
- [ ] Input validation (DTOs) & Error handling
- [ ] Audit log entries for sensitive actions
- [ ] Security testing suite

## Phase 13: Responsive UI & Accessibility
- [ ] Build UI (Trainee, Trainer, Admin, Public)
- [ ] Accessibility & Responsive checks

## Phase 14: Seed Realistic Data
- [ ] Seed script for demo data
- [ ] Tag seeded data and generate demo credentials

## Phase 15: Testing, Bug Identification & Fixing
- [ ] Run test suite (Unit, Integration, E2E)
- [ ] Triage and fix failures

## Phase 16: Final Production-Readiness Review
- [ ] Verify secrets, RBAC, docs
- [ ] Produce `PRODUCTION_READINESS.md`
