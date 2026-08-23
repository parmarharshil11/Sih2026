# Antigravity Memory Aid 🤖

Hello fellow Antigravity agent! If you are reading this, you are continuing development on the **Capacity Connect** platform for a new user/teammate.

Here is the essential context you need to seamlessly resume "vibe coding":

## 1. Project Context & Stack
- **Architecture**: Turborepo Monorepo.
- **Frontend**: Next.js 14 App Router (`apps/web`).
- **Backend**: NestJS (`apps/api`).
- **Database**: PostgreSQL 15 via Prisma (`packages/db`).
- **Cache / Storage**: Redis and MinIO.

## 2. Where We Are
- **ALL Phases 1 through 15 are COMPLETELY FINISHED.**
- The platform is production-ready. See `PRODUCTION_READINESS.md` at the repo root for startup instructions.

## 3. What Was Built (All 15 Phases)
- Phase 1-2: Architecture, monorepo, 40+ table Prisma schema
- Phase 3: JWT HttpOnly cookie auth, Argon2id, RBAC
- Phase 4-5: Trainee & Trainer profile CRUD
- Phase 6: Admin module, user management, approvals
- Phase 7: Competency & Skill Gap Engine
- Phase 8: Multi-signal Trainer-Trainee Matching
- Phase 9: Course lifecycle, MCQ assessments, QR certificates
- Phase 10: Analytics & organizational intelligence
- Phase 11: AI features (explainSkillGap, draftCourseOutline, recommendTrainers)
- Phase 12: Security hardening, rate limiting, audit logging
- Phase 13: Next.js UI (Glassmorphism dark mode, all 3 role portals)
- Phase 14: Realistic database seeder (seed.ts)
- Phase 15: Unit tests (6 service specs), E2E tests (RBAC, course lifecycle, certificate), Dockerfiles, PRODUCTION_READINESS.md

## 4. Crucial Quirks & Rules (Read Carefully!)
1. **Windows Environment**: The user is on Windows. Avoid PowerShell syntax errors.
2. **Database Port**: Postgres runs in Docker on port **5433** (not 5432). All `DATABASE_URL` must use 5433.
3. **Prisma Imports**: Always import enums/types from `'@repo/db'`, NEVER from `'@prisma/client'`.
4. **NestJS Types**: If you get TS2742 inferred type errors, add `: Promise<any>` return types.
5. **Node16 Module Resolution**: `apps/api` uses `"module": "Node16"`. Use `import x from 'pkg'` not `require()`.
6. **TrainerProfile Schema**: Uses `verificationStatus: VerificationStatus` enum, NOT `isVerified: boolean`.
7. **RegisterDto.role**: Typed as `'trainee' | 'trainer'` literal union. Use `as const` in tests.
8. **Global Prefix**: All API routes are under `/api/v1` (set in `main.ts`).

## 5. File Reading Order on Resume
1. `memory/memory.md` → Full project state
2. `PRODUCTION_READINESS.md` → Startup & deployment guide
3. `packages/db/prisma/schema.prisma` → DB schema reference
4. `apps/api/src/app.module.ts` → Module registry

Good luck! The project is complete. 🎉
