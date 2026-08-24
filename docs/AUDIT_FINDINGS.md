# Phase 16a — Audit Findings Report

> Generated: 2026-08-24  
> Scope: Full repo grep-based static analysis of Capacity Connect (NestJS API + Next.js Web + Prisma)

---

## 1. No Plaintext Secrets in Source Files

| Check | Result |
|---|---|
| Hardcoded passwords/secrets/apiKeys in `.ts` source | **✅ PASS** — 0 matches |
| `.env.example` values | **⚠️ ADVISORY** — Contains example credentials (`ccpassword`, `minioadmin`, `CHANGE_ME_...`). These are clearly labeled placeholders, not real production secrets. Acceptable for `.env.example`. |
| `.env` in `.gitignore` | **✅ PASS** — `.env` is gitignored |

**Verdict: ✅ PASS**

---

## 2. No `console.log` of Sensitive Data

| File | Line | Content | Status |
|---|---|---|---|
| `apps/api/src/main.ts` | 16 | `console.log(\`API running on port ${process.env.PORT \|\| 4000}\`)` | **⚠️ LOW** — Non-sensitive, but should use NestJS Logger in production |
| `packages/db/prisma/seed.ts` | 442-450 | Prints demo credentials to console | **✅ ACCEPTABLE** — Seed script runs one-time, explicitly designed to print credentials per spec. Credentials are not in source code. |
| `apps/web/**` | — | No `console.log` found | **✅ PASS** |

**Verdict: ✅ PASS** (one advisory to use Logger instead of `console.log` in `main.ts`)

---

## 3. RBAC Guards on Every Sensitive Controller Route

### Summary Table

| Controller | Class-level Guard | Method-level Roles | Status |
|---|---|---|---|
| `AdminController` | `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')` | ✅ All 5 endpoints protected | **✅ PASS** |
| `TrainerController` | `@UseGuards(JwtAuthGuard, RolesGuard)` | `@Roles('trainer')` on all 6 endpoints | **✅ PASS** |
| `TraineeController` | `@UseGuards(JwtAuthGuard)` | ❌ **No `RolesGuard` or `@Roles('trainee')`** | **🔴 FINDING** |
| `CourseController` | Per-method guards | ✅ All 15 endpoints have role-specific guards | **✅ PASS** |
| `AssessmentController` | Per-method guards | ✅ All 9 endpoints have role-specific guards | **✅ PASS** |
| `CertificateController` | Per-method guards | `verify/:token` public ✅; `issue` has `JwtAuthGuard` only; `me` has `RolesGuard` + `Roles('trainee')` | **⚠️ ADVISORY** |
| `CompetencyController` | Per-method guards | ✅ All 9 endpoints have role-specific guards | **✅ PASS** |
| `MatchingController` | Per-method guards | ✅ All 4 endpoints guarded (2 JWT only for self-service, 2 with admin/trainer roles) | **✅ PASS** |
| `AnalyticsController` | `@UseGuards(JwtAuthGuard, RolesGuard)` class-level | ✅ All 4 endpoints have `@Roles()` | **✅ PASS** |
| `AiController` | `@UseGuards(JwtAuthGuard, RolesGuard)` class-level | ✅ All 3 endpoints have `@Roles()` | **✅ PASS** |
| `AuthController` | — | Public endpoints (`register`, `login`, `verify-email`, `forgot/reset-password`) correctly unguarded; `logout`/`refresh`/`me` guarded | **✅ PASS** |

### Finding: `TraineeController` Missing RolesGuard

**Severity:** 🔴 Medium  
**File:** `apps/api/src/modules/trainee/trainee.controller.ts`  
**Issue:** Uses only `@UseGuards(JwtAuthGuard)` at class level — no `RolesGuard` and no `@Roles('trainee')`. A trainer or admin user could hit trainee-specific endpoints (profile, interests, work-experience, qualifications).  
**Fix:** Add `RolesGuard` to `@UseGuards()` and add `@Roles('trainee')` at class level.  
**Status:** **FIXED** ✅ (applied inline in this phase)

### Advisory: `CertificateController.issueCertificate()` Guard

**Severity:** ⚠️ Low  
**File:** `apps/api/src/modules/certificate/certificate.controller.ts:48-49`  
**Issue:** `POST /issue` uses only `@UseGuards(JwtAuthGuard)` — no role restriction. This is intentionally permissive (both trainee and admin can issue), and the service-level check validates ownership. No code change needed, but documenting for awareness.

---

## 4. Audit Logging on Every Sensitive Action

### Required Actions vs. Actual Coverage

| Sensitive Action | Service | `auditService.log()` Present | Status |
|---|---|---|---|
| User login | `AuthService` | ✅ Line 110 | **✅ PASS** |
| User registration | `AuthService` | ✅ Line 52 | **✅ PASS** |
| Email verification | `AuthService` | ✅ Line 161 | **✅ PASS** |
| Refresh token | `AuthService` | ✅ Line 185 | **✅ PASS** |
| Logout | `AuthService` | ✅ Line 214 | **✅ PASS** |
| User status change (admin) | `AdminService` | ✅ Line 56 | **✅ PASS** |
| Trainer verification (admin) | `AdminService` | ✅ Line 114 | **✅ PASS** |
| Course creation | `CourseService` | ✅ Line 167 | **✅ PASS** |
| Course submit for approval | `CourseService` | ✅ Line 224 | **✅ PASS** |
| Course approval | `CourseService` | ✅ Line 254 | **✅ PASS** |
| Course rejection | `CourseService` | ✅ Line 293 | **✅ PASS** |
| Course enrollment | `CourseService` | ✅ Line 322 | **✅ PASS** |
| Course progress update | `CourseService` | ✅ Line 347 | **✅ PASS** |
| Module management | `CourseService` | ✅ Line 461 | **✅ PASS** |
| Assessment creation | `AssessmentService` | ✅ Line 42 | **✅ PASS** |
| Assessment attempt start | `AssessmentService` | ✅ Line 127 | **✅ PASS** |
| Assessment submission | `AssessmentService` | ✅ Line 313 | **✅ PASS** |
| Certificate issuance | `CertificateService` | ✅ Line 93 | **✅ PASS** |
| AI draft course outline | `AiService` | ✅ (via spec test assertion) | **✅ PASS** |
| AI explain skill gap | `AiService` | ✅ (via spec test assertion) | **✅ PASS** |

**Verdict: ✅ PASS** — All 20 listed sensitive actions have audit logging.

---

## 5. Storage Abstraction — No Hardcoded Local Paths

| Check | Result |
|---|---|
| `fs.write` in source (outside storage module) | **✅ PASS** — 0 matches |
| `./uploads` hardcoded path | **✅ PASS** — 0 matches |
| `path.join(__dirname` hardcoded path | **✅ PASS** — 0 matches |
| `STORAGE_ADAPTER` env var in `.env.example` | ✅ Present: `local` / `s3` toggle |

**Verdict: ✅ PASS**

---

## 6. Every Nav Item Resolves to a Working Page

### Sidebar Links → Page Files

| Sidebar Link | Page File Exists | Status |
|---|---|---|
| `/trainee` | `app/trainee/page.tsx` ✅ | **✅ PASS** |
| `/trainee/courses` | `app/trainee/courses/page.tsx` ✅ | **✅ PASS** |
| `/trainee/certificates` | `app/trainee/certificates/page.tsx` ✅ | **✅ PASS** |
| `/trainer` | `app/trainer/page.tsx` ✅ | **✅ PASS** |
| `/trainer/courses/new` | `app/trainer/courses/new/page.tsx` ✅ | **✅ PASS** |
| `/trainer/assessments/new` | `app/trainer/assessments/new/page.tsx` ✅ | **✅ PASS** |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` ✅ | **✅ PASS** |
| `/admin/users` | `app/admin/users/page.tsx` ✅ | **✅ PASS** |
| `/admin/courses` | `app/admin/courses/page.tsx` ✅ | **✅ PASS** |
| `/admin/audit-logs` | `app/admin/audit-logs/page.tsx` ✅ | **✅ PASS** |

### In-page Links → Page Files

| In-page Link | Page File Exists | Status |
|---|---|---|
| `/trainee/courses/[id]` | `app/trainee/courses/[id]/page.tsx` ✅ | **✅ PASS** |
| `/trainee/courses/[id]/learn` | `app/trainee/courses/[id]/learn/page.tsx` ✅ | **✅ PASS** |
| `/trainee/assessments/[id]/take` | `app/trainee/assessments/[id]/take/page.tsx` ✅ | **✅ PASS** |
| `/certificates/verify/[token]` | `app/certificates/verify/[token]/page.tsx` ✅ | **✅ PASS** |
| `/` (landing) | `app/page.tsx` ✅ | **✅ PASS** |

### Footer Links (Landing Page)

| Footer Link | Target | Status |
|---|---|---|
| Privacy Policy | `href="/"` | **⚠️ ADVISORY** — Placeholder, links to landing. No dead-end but not a real page. |
| Terms of Service | `href="/"` | **⚠️ ADVISORY** — Same as above. |
| Security Architecture | `href="/"` | **⚠️ ADVISORY** — Same as above. |

**Verdict: ✅ PASS** — All functional nav items resolve. Footer legal links are placeholder (links to `/`, not broken).

---

## 7. `.env.example` Values Audit

| Variable | Value | Assessment |
|---|---|---|
| `POSTGRES_PASSWORD` | `ccpassword` | ✅ Dev placeholder |
| `MINIO_ROOT_PASSWORD` | `minioadmin` | ✅ Default MinIO dev credential |
| `JWT_SECRET` | `CHANGE_ME_USE_A_LONG_RANDOM_STRING_IN_PRODUCTION` | ✅ Self-documenting placeholder |
| `JWT_REFRESH_SECRET` | `CHANGE_ME_ANOTHER_LONG_RANDOM_STRING` | ✅ Self-documenting placeholder |
| `OPENAI_API_KEY` | `` (empty) | ✅ Empty placeholder |
| `ANTHROPIC_API_KEY` | `` (empty) | ✅ Empty placeholder |

**Verdict: ✅ PASS**

---

## Summary

| Audit Item | Result |
|---|---|
| 1. No plaintext secrets | ✅ PASS |
| 2. No sensitive console.log | ✅ PASS (1 advisory: use Logger in main.ts) |
| 3. RBAC on every sensitive route | 🔴 **1 FINDING FIXED** (TraineeController missing RolesGuard) |
| 4. Audit logging on every sensitive action | ✅ PASS (20/20 covered) |
| 5. Storage abstraction — no hardcoded paths | ✅ PASS |
| 6. Every nav item → working page | ✅ PASS (3 footer placeholders noted) |
| 7. `.env.example` contains only placeholders | ✅ PASS |

**Overall: ✅ PASS** — 1 bug found and fixed inline.
