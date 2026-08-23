# CAPACITY CONNECT
## Enterprise Architecture Package + Google Antigravity Master Build Prompt

> This document contains the full architecture package (sections 1–12) followed by the complete, self-contained MASTER BUILD PROMPT (section 13) that can be pasted directly into Google Antigravity or an equivalent autonomous coding agent.

---

## 0. GUIDING ASSUMPTIONS (Documented, Not Asked)

Since the brief explicitly asks for sensible enterprise decisions instead of clarification loops, the following stack and defaults are locked in:

| Decision | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 14+ (App Router, TypeScript) | SSR/SSG, file-based routing, strong ecosystem, good for SEO landing page + protected app |
| UI Kit | Tailwind CSS + shadcn/ui + Radix primitives | Accessible primitives, no cheap gradients, enterprise look achievable |
| Backend | Node.js (NestJS, TypeScript) | Modular, DI-based, mirrors "service separation" requirement natively via Modules |
| Database | PostgreSQL 15+ | Relational integrity, JSONB for flexible metadata, mature RBAC patterns |
| ORM | Prisma | Type-safe schema, migrations, good fit for the large ER model below |
| Cache/Queue | Redis + BullMQ | Session cache, rate limiting, background jobs (certificate generation, analytics recompute, notifications) |
| Object Storage | S3-compatible abstraction (local disk adapter in dev, MinIO/AWS S3 in prod) | Satisfies "migration from local to cloud storage" requirement |
| Auth | JWT (access + refresh) + httpOnly cookies, bcrypt/argon2 password hashing | Stateless scaling, server-verified roles only |
| AI Layer | Provider-agnostic `AIService` interface (pluggable: OpenAI/Anthropic/local model) | Assistive only, never mutates permissions, always returns reasoning |
| Search | PostgreSQL full-text search (tsvector) now, interface designed for pluggable vector search later (pgvector/Elasticsearch) | Matches "architecture should allow future semantic search" |
| Testing | Jest + Supertest (backend), Playwright (E2E), React Testing Library (frontend) | Coverage of RBAC, scoring, matching logic |
| Deployment | Dockerized services + docker-compose for dev, Kubernetes-ready manifests for prod | Scalability requirement |
| Monorepo | Turborepo with `apps/web`, `apps/api`, `packages/shared-types`, `packages/ui` | Enforces modular architecture, avoids tight coupling |

Certificate verification, competency scoring, and trainer matching are all deterministic, data-driven algorithms (not AI black boxes) — AI is layered on top as an explainability/recommendation assistant, never the source of truth for scores.

---

## 1. PRODUCT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│   Public Site │ Trainee App │ Trainer App │ Admin Console (Next.js)  │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │ HTTPS / REST (JSON) + WebSocket (notifications)
┌───────────────────────────────▼───────────────────────────────────────┐
│                         API GATEWAY LAYER                            │
│   Auth Middleware │ RBAC Guard │ Rate Limiter │ Validation │ Logger  │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │
┌───────────────────────────────▼───────────────────────────────────────┐
│                        APPLICATION SERVICE LAYER (NestJS Modules)      │
│  AuthModule      UserModule        TraineeModule     TrainerModule    │
│  AdminModule     CourseModule      AssessmentModule  CompetencyModule │
│  MatchingModule  CertificateModule KnowledgeHubModule NotificationMod │
│  AnalyticsModule AIModule          AuditModule       StorageModule   │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │
┌───────────────────────────────▼───────────────────────────────────────┐
│                          DATA & INFRA LAYER                          │
│  PostgreSQL (primary) │ Redis (cache/queue) │ Object Storage (S3)    │
│  Background Workers (BullMQ) │ AI Provider Adapter │ Email Service   │
└─────────────────────────────────────────────────────────────────────┘
```

**Core architectural principles enforced:**
- Every module exposes a **service** (business logic) and a **controller** (HTTP boundary) — controllers never contain business logic.
- Cross-module communication happens through injected services or a domain event bus, never direct DB queries across module boundaries.
- All computed metrics (dashboards, heatmaps, match scores) are derived via query/service functions at read time or via scheduled recompute jobs — **never hard-coded**.

---

## 2. FEATURE ARCHITECTURE (Capacity-Building Lifecycle)

```
Trainee Profile Created
   → Baseline Competency Assessment (pre-test per skill)
   → Skill Gap Engine computes: Gap = Required Level − Current Level
   → Gap Classifier: None / Low / Medium / High / Critical
   → Recommendation Engine generates:
        - Personalized Learning Path (ordered course/resource sequence)
        - Trainer Match List (scored + explained)
   → Trainee enrolls in recommended/other courses
   → Consumes Learning Resources (video/PDF/PPT/doc)
   → Attempts Assessments (subject-wise MCQ, timed, randomized)
   → Post-Test Intelligence computes improvement metrics
   → On course completion criteria met → Certificate issued (QR + verification page)
   → Trainee Competency Record updated (Current Level → new value)
   → Aggregated into Department/Org Competency Heatmap
   → Feeds Organizational Intelligence recommendations to Admin
```

Feature modules map 1:1 to the differentiation requirements: **Competency Intelligence Engine, Skill Gap Analysis, Smart Trainer Matching, Personalized Learning Path, Pre/Post-Test Intelligence, Organizational Heatmap, Knowledge Hub, Digital Certification, Organizational Learning Intelligence** — each is an independent service with its own tables, tested in isolation, and composed at the API layer.

---

## 3. DATABASE ARCHITECTURE

Relational, 3NF-normalized PostgreSQL schema. Naming: snake_case, `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at`/`updated_at` timestamps on every table, soft-delete via `deleted_at` on content/resource tables.

### 3.1 Identity & Access
- `users(id, email UNIQUE, password_hash, status[pending|active|suspended], email_verified_at, last_login_at, created_at)`
- `roles(id, name UNIQUE[trainee|trainer|admin])`
- `permissions(id, code UNIQUE, description)`
- `role_permissions(role_id FK, permission_id FK)`
- `user_roles(user_id FK, role_id FK, PRIMARY KEY(user_id, role_id))`
- `audit_logs(id, actor_user_id FK NULLABLE, action, entity_type, entity_id, ip_address, metadata JSONB, created_at)`

### 3.2 Profiles
- `departments(id, name UNIQUE, description)`
- `trainee_profiles(id, user_id FK UNIQUE, department_id FK, headline, bio, profile_photo_url, profile_completion_pct)`
- `trainer_profiles(id, user_id FK UNIQUE, department_id FK, bio, verification_status[pending|verified|rejected], years_experience, trainer_rating_avg)`
- `qualifications(id, profile_owner_id, profile_owner_type[trainee|trainer], degree, institution, year, document_url)`
- `work_experience(id, trainee_profile_id FK, organization, role, start_date, end_date, description)`
- `interests(id, trainee_profile_id FK, interest_name)`
- `certificates_external(id, trainee_profile_id FK, title, issuer, issue_date, document_url)` — user-uploaded external certs, distinct from platform-issued `certificates`.

### 3.3 Skills & Competency Framework
- `skills(id, name UNIQUE, category, description)`
- `competencies(id, name, category, description)` — a competency may map to one or more skills
- `competency_skills(competency_id FK, skill_id FK)`
- `proficiency_levels(id, level_number 1-5, label)` — e.g., Novice → Expert
- `trainee_competencies(id, trainee_profile_id FK, competency_id FK, current_level, required_level, target_level, evidence_url, assessment_score, last_assessed_at)`
- `skill_gap_analysis(id, trainee_competency_id FK, gap_value INT, gap_classification[none|low|medium|high|critical], computed_at)` — recomputed on every new assessment/certification event
- `trainer_expertise(id, trainer_profile_id FK, skill_id FK, proficiency_level, years_experience, certified BOOLEAN)`
- `trainer_availability(id, trainer_profile_id FK, day_of_week, start_time, end_time, timezone)`

### 3.4 Courses
- `course_categories(id, name UNIQUE)`
- `courses(id, title, slug UNIQUE, description, thumbnail_url, trainer_id FK, category_id FK, difficulty[beginner|intermediate|advanced], duration_minutes, status[draft|pending_approval|published|archived], approved_by FK NULLABLE, approved_at)`
- `course_skills(course_id FK, skill_id FK)`
- `course_prerequisites(course_id FK, prerequisite_course_id FK)`
- `course_modules(id, course_id FK, title, sequence_order)`
- `course_resources(id, module_id FK, type[pdf|ppt|pptx|doc|docx|video|audio|image], title, storage_key, mime_type, size_bytes, uploaded_by FK, deleted_at)`
- `enrollments(id, trainee_id FK, course_id FK, status[started|in_progress|completed|abandoned], enrolled_at, completed_at, UNIQUE(trainee_id, course_id))`
- `course_progress(id, enrollment_id FK, module_id FK, status, progress_pct, last_accessed_at)`

### 3.5 Assessment Engine
- `assessments(id, course_id FK NULLABLE, subject, type[pre_test|post_test|module_quiz|final], time_limit_minutes, pass_score_pct, randomize_questions BOOLEAN, randomize_options BOOLEAN, created_by FK)`
- `assessment_questions(id, assessment_id FK, question_type[single_mcq|multi_mcq|true_false], question_text, difficulty, points)`
- `question_options(id, question_id FK, option_text, is_correct BOOLEAN)`
- `assessment_attempts(id, assessment_id FK, trainee_id FK, started_at, submitted_at, score_pct, passed BOOLEAN, attempt_number)`
- `assessment_answers(id, attempt_id FK, question_id FK, selected_option_ids UUID[], is_correct BOOLEAN)`
- `questionnaires(id, trainer_id FK, title, deadline_at, course_id FK NULLABLE)`
- `questionnaire_questions(id, questionnaire_id FK, question_text, question_type)`
- `questionnaire_responses(id, questionnaire_id FK, trainee_id FK, response_data JSONB, submitted_at)`

### 3.6 Trainer Matching
- `trainer_match_scores(id, trainee_id FK NULLABLE, course_id FK NULLABLE, trainer_id FK, match_score DECIMAL, reasons JSONB, computed_at)` — persisted so scores are auditable/explainable, recomputed on a schedule and on-demand.

### 3.7 Certification
- `certificates(id, enrollment_id FK UNIQUE, certificate_number UNIQUE, trainee_id FK, course_id FK, trainer_id FK, issued_at, qr_payload_url, verification_token UNIQUE)`
- `certificate_verifications(id, certificate_id FK, verified_at, verifier_ip)`

### 3.8 Feedback, Notifications, Engagement
- `feedback(id, trainee_id FK, target_type[course|trainer], target_id, rating 1-5, comment, created_at)`
- `ratings(id, trainer_id FK, avg_rating, total_ratings, recomputed_at)` — materialized aggregate
- `notifications(id, user_id FK, type, title, body, is_read BOOLEAN, created_at)`
- `announcements(id, created_by FK, title, body, audience[all|trainees|trainers], published_at)`
- `achievements(id, trainee_id FK, title, description, awarded_at, icon_key)`

### 3.9 Learning Paths & Knowledge Hub
- `learning_paths(id, trainee_id FK, generated_reason TEXT, created_at)`
- `learning_path_items(id, learning_path_id FK, sequence_order, item_type[course|resource|assessment], item_id, status)`
- `knowledge_hub_items(id, title, type, storage_key, category, tags TEXT[], subject, skill_id FK NULLABLE, department_id FK NULLABLE, uploaded_by FK, upload_date, search_vector tsvector)`

**Integrity rules:** all FKs `ON DELETE RESTRICT` for historical/audit-relevant records (attempts, certificates, audit_logs) and `ON DELETE CASCADE` only for strictly dependent child rows (e.g., `question_options` under `assessment_questions`). Indexes on all FK columns, on `users.email`, on `courses.slug`, on `skill_gap_analysis.gap_classification`, and GIN index on `knowledge_hub_items.search_vector` and `.tags`.

---

## 4. USER-FLOW ARCHITECTURE

**Trainee flow:** Sign up → Email verify → Admin approval (if org requires) → Build profile (qualifications, experience, skills, interests) → Take baseline competency assessment → View skill-gap dashboard → Receive personalized learning path + trainer recommendations → Enroll in course → Consume resources → Attempt assessments → Complete course → Receive certificate → Competency record updates → Give feedback.

**Trainer flow:** Login → Complete/verify profile (expertise, certifications, availability) → Await admin verification → Create course (draft) → Submit for admin approval → Upload modules/resources → Create questionnaires/MCQs with deadlines → Monitor enrollment + performance analytics → Respond to feedback.

**Admin flow:** Login → Review pending user approvals & trainer verifications → Approve/reject courses → Monitor org-wide dashboards (enrollment, competency heatmap, trainer effectiveness) → Publish announcements/achievements → Review organizational intelligence insights → Export reports → Review audit logs.

---

## 5. API ARCHITECTURE

RESTful, versioned under `/api/v1/`. JWT bearer (httpOnly cookie) + role guard decorators per route. Standard envelope: `{ data, meta, error }`. Standard error format: `{ error: { code, message, details? } }`, never a raw stack trace.

Representative endpoint groups (each maps to a NestJS module/controller):

```
/api/v1/auth            POST /register, /login, /logout, /refresh, /verify-email, /forgot-password, /reset-password
/api/v1/users           GET/PATCH /me, GET /:id (admin), PATCH /:id/role (admin)
/api/v1/trainees        GET/PATCH /:id/profile, /:id/qualifications, /:id/experience, /:id/skills
/api/v1/trainers        GET/PATCH /:id/profile, /:id/expertise, /:id/availability, GET /:id/analytics
/api/v1/courses         CRUD, POST /:id/submit-for-approval, POST /:id/approve (admin)
/api/v1/enrollments     POST /, GET /me, PATCH /:id/progress
/api/v1/assessments     CRUD (trainer), POST /:id/start, POST /:id/submit, GET /:id/results
/api/v1/questionnaires  CRUD, POST /:id/respond
/api/v1/competencies    GET /, GET /trainee/:id, POST /trainee/:id/assess
/api/v1/skill-gaps      GET /trainee/:id, GET /organization/heatmap (admin)
/api/v1/recommendations GET /learning-path/:traineeId, GET /courses/:traineeId
/api/v1/trainer-matching GET /for-trainee/:id, GET /for-course/:id
/api/v1/certificates    GET /me, GET /verify/:token (public)
/api/v1/knowledge       GET /search, CRUD (trainer/admin upload)
/api/v1/notifications   GET /me, PATCH /:id/read
/api/v1/analytics       GET /admin/overview, /admin/departments, /admin/trainers
/api/v1/admin           GET/PATCH /users/pending, /courses/pending, GET /audit-logs
```

All list endpoints support `?page&limit&sort&filter`. All mutating endpoints validate input via DTO schemas (class-validator/zod) before touching the service layer.

---

## 6. UI/UX REQUIREMENTS

- Design tokens: neutral base palette (slate/zinc), single accent color, generous whitespace, 8px spacing scale, Inter/IBM Plex for typography — enterprise, not "AI-generated gradient SaaS."
- Every list/table view has explicit **loading**, **empty**, **error**, and **populated** states as separate components, not conditional spaghetti.
- Dashboards use real chart components (bar/line/heatmap via a charting lib) bound to live API data — no static images.
- Keyboard navigable nav bar, visible focus rings, ARIA labels on icon-only buttons, color contrast ≥ WCAG AA, `prefers-reduced-motion` respected in transitions.
- Public landing page sections exactly as specified (Hero, Overview, How it Works, Competency Intelligence, Trainer Matching, Learning Journey, Knowledge Hub, Org Analytics, Testimonials clearly labeled "illustrative," CTA, Footer).

---

## 7. SECURITY REQUIREMENTS

- Passwords hashed with argon2id (or bcrypt cost ≥ 12); never logged.
- JWT access token short-lived (15 min), refresh token rotation with reuse detection, stored httpOnly + Secure + SameSite=strict.
- Every API route re-validates role/ownership **server-side** regardless of any client-supplied role claim.
- Rate limiting on auth endpoints (e.g., 5 attempts/15 min/IP) via Redis token bucket.
- File uploads: MIME sniffing + extension whitelist + max size per type + virus-scan hook placeholder + storage under non-executable paths.
- All admin-sensitive actions (role change, course approval, certificate issuance, user approval) write to `audit_logs` synchronously within the same transaction.
- Centralized error handler maps internal exceptions to safe user-facing messages; full stack only in server logs.
- Environment-based secrets only (`.env`, never committed); `.env.example` provided.

---

## 8. AI REQUIREMENTS

- `AIService` interface: `explainSkillGap()`, `recommendLearningPath()`, `recommendTrainers()`, `summarizeResource()`, `generateQuestionDrafts()`, `generateOrgInsights()`, `naturalLanguageSearch()`.
- Every AI response returns `{ result, reasoning[], confidence }` — reasoning is always shown in the UI next to the recommendation.
- AI never writes directly to `user_roles`, `permissions`, or any security table. AI-suggested content (e.g., draft MCQ questions) is always inserted as `status: draft` requiring trainer/admin confirmation.
- Deterministic calculations (skill gap, match score, scoring) are computed by plain application logic first; AI is only used to **narrate/explain** those numbers or generate suggestions, never to compute the numbers themselves — keeping the system auditable.

---

## 9. DEVELOPMENT PHASES (Summary)

Phases 1–16 as defined in the official brief are preserved verbatim as the execution backbone of the Antigravity prompt in Section 13, with an explicit **"verify before proceeding"** gate at the end of every phase.

---

## 10. TESTING STRATEGY

- **Unit:** skill-gap calculator, trainer-match scorer, assessment auto-grader, certificate ID/QR generator, RBAC guard logic.
- **Integration:** auth flows (register→verify→login→refresh), enrollment→progress→completion→certificate chain, file upload validation.
- **E2E (Playwright):** trainee full journey, trainer course-creation journey, admin approval journey, unauthorized-access attempts return 403 not 500.
- **Security tests:** SQL injection attempts on filter params, JWT tampering, role-escalation attempts via crafted payloads, file-upload of disallowed MIME types.

---

## 11. DEPLOYMENT STRATEGY

- `docker-compose.yml` for dev: `web`, `api`, `postgres`, `redis`, `minio`, `worker`.
- CI pipeline: lint → typecheck → unit tests → integration tests → build → (optional) E2E → deploy.
- Migrations run automatically on deploy (`prisma migrate deploy`), seed script gated behind `NODE_ENV=development|staging`.
- Kubernetes manifests (Deployment/Service/Ingress/HPA) provided as a stretch target for enterprise deployment, with readiness/liveness probes on `/health`.

---

## 12. SEED / DEMO DATA STRATEGY

- Seed script creates: 3 departments minimum (IT, Finance, HR), ~15 trainees, ~5 trainers, ~10 courses across categories, skills/competencies covering at least 5 domains, assessments with question banks, several enrollments in varied states, a handful of issued certificates, sample feedback/ratings, sample notifications/announcements.
- All seeded records tagged with a `is_seed_data: true` flag (or a dedicated `seed_metadata` table) and visually badge-labeled "Demo Data" in the UI where relevant.
- Demo accounts: `admin@demo.capacityconnect.local`, `trainer@demo.capacityconnect.local`, `trainee@demo.capacityconnect.local`, passwords generated randomly and printed once to console/README on first seed — never hard-coded in source.

---

## 13. GOOGLE ANTIGRAVITY — MASTER BUILD PROMPT

Copy everything between the lines below into Antigravity as a single prompt.

```
════════════════════════════════════════════════════════════════════
MASTER BUILD PROMPT — CAPACITY CONNECT
Digital Capacity Building, Competency Development & Learning Management Platform
════════════════════════════════════════════════════════════════════

ROLE: You are an autonomous senior full-stack engineering agent. Build a
production-oriented, industrial-grade web platform called CAPACITY CONNECT.
This is NOT a toy project, NOT a generic Moodle clone, and NOT a static
demo. Every dashboard number must come from a real database query. Every
navigation item must lead to a working screen. Security is server-side,
always.

────────────────────────────────────────
LOCKED TECHNICAL STACK (do not deviate without strong justification)
────────────────────────────────────────
- Monorepo: Turborepo — apps/web (Next.js 14+ App Router, TypeScript,
  Tailwind CSS, shadcn/ui), apps/api (NestJS, TypeScript), packages/shared-types,
  packages/ui.
- Database: PostgreSQL 15+ with Prisma ORM. Normalized relational schema.
- Cache/Queue: Redis + BullMQ for background jobs (certificate generation,
  analytics recompute, notification dispatch, trainer-match recompute).
- Object storage: storage abstraction interface with a LocalDiskAdapter
  (dev) and S3Adapter (prod/MinIO-compatible) implementing the same
  interface, so switching is a config change only.
- Auth: JWT access (15 min) + rotating refresh token, httpOnly Secure
  SameSite=strict cookies, argon2id password hashing.
- AI: a single AIService interface with a pluggable provider adapter.
  AI never writes to permission/role tables. AI outputs always include a
  `reasoning` array and are inserted as draft/pending where they create content.
- Testing: Jest + Supertest (API), React Testing Library (web), Playwright (E2E).
- All secrets via environment variables; provide .env.example; never commit
  real secrets.

────────────────────────────────────────
DATABASE SCHEMA — IMPLEMENT EXACTLY THIS ENTITY SET (Prisma schema)
────────────────────────────────────────
Implement the following tables/entities with full relations, FKs, unique
constraints, and indexes (expand fields sensibly for a production system,
but do not remove required relationships):

Identity: users, roles, permissions, role_permissions, user_roles, audit_logs
Profiles: departments, trainee_profiles, trainer_profiles, qualifications,
  work_experience, interests, certificates_external
Competency: skills, competencies, competency_skills, proficiency_levels,
  trainee_competencies, skill_gap_analysis, trainer_expertise, trainer_availability
Courses: course_categories, courses, course_skills, course_prerequisites,
  course_modules, course_resources, enrollments, course_progress
Assessment: assessments, assessment_questions, question_options,
  assessment_attempts, assessment_answers, questionnaires,
  questionnaire_questions, questionnaire_responses
Matching: trainer_match_scores
Certification: certificates, certificate_verifications
Engagement: feedback, ratings, notifications, announcements, achievements
Learning/Knowledge: learning_paths, learning_path_items, knowledge_hub_items

Rules:
- UUID primary keys, created_at/updated_at on every table, soft-delete
  (deleted_at) on content/resource tables.
- ON DELETE RESTRICT for historically significant records (attempts,
  certificates, audit_logs); CASCADE only for strictly owned children.
- Index every FK column plus users.email, courses.slug,
  skill_gap_analysis.gap_classification, and a GIN index on
  knowledge_hub_items.search_vector and .tags.

────────────────────────────────────────
PHASED EXECUTION PLAN — COMPLETE EACH PHASE FULLY AND VERIFY BEFORE
PROCEEDING TO THE NEXT. At the end of every phase, run the relevant
tests/build and fix any failures before moving on. Do not skip ahead.
────────────────────────────────────────

PHASE 1 — Architecture Definition
- Confirm the monorepo layout, module boundaries (Auth, User, Trainee,
  Trainer, Admin, Course, Assessment, Competency, Matching, Certificate,
  KnowledgeHub, Notification, Analytics, AI, Audit, Storage).
- Produce an ADR (architecture decision record) file documenting the
  stack choices above.
- VERIFY: monorepo builds with placeholder apps; turbo pipeline runs.

PHASE 2 — Project Structure & Database Schema
- Scaffold apps/web and apps/api. Create the full Prisma schema per the
  entity list above. Run initial migration against a local Postgres
  instance (docker-compose). Generate the Prisma client.
- VERIFY: `prisma migrate dev` succeeds; ER diagram exported; a smoke
  test connects and queries `users`.

PHASE 3 — Authentication & RBAC
- Implement register (email+password, status=pending until email verified
  and, if configured, admin-approved), login, logout, refresh rotation,
  email verification token flow, password reset flow.
- Implement roles table seeding (trainee/trainer/admin) and a RolesGuard
  + PermissionsGuard usable via decorators on controllers.
- Never trust a role claim from the client body — always resolve role
  from the authenticated user's DB record on every request.
- Implement rate limiting middleware on auth routes.
- VERIFY: unit + integration tests for register→verify→login→refresh,
  and for rejected access when role/permission is missing (expect 403).

PHASE 4 — Trainee Module
- Profile CRUD: qualifications, work experience, interests, skills,
  external certificates. Profile completion percentage calculator
  (real formula based on filled sections, not hard-coded).
- Course discovery (search/filter/sort), enrollment, progress tracking,
  resource consumption endpoints (secure signed URLs via storage
  abstraction), subject-wise MCQ assessment attempts (start/submit/score),
  assessment history, certificates list, feedback submission.
- Trainee dashboard aggregation endpoint pulling live data: profile
  completion, current courses, progress, upcoming assessments,
  competency score, top skill gaps, recommended courses/trainers,
  learning path, recent certificates, notifications.
- VERIFY: enrollment→progress→completion chain tested end-to-end;
  dashboard endpoint returns real DB-derived values (assert against
  seeded fixtures in a test, not snapshot of hard-coded text).

PHASE 5 — Trainer Module
- Trainer profile + expertise + availability management, subject to
  admin verification status.
- Course creation/management (draft → submit for approval), module and
  resource upload (video/pdf/ppt/doc) with MIME/size validation,
  questionnaire + MCQ authoring with deadlines, trainer library view.
- Trainee participation/performance analytics scoped to the trainer's
  own courses only (enforce ownership check server-side).
- Trainer dashboard: active courses, total trainees, pending
  questionnaires, average score, completion rate, average learner
  improvement, rating, upcoming deadlines, recent feedback, resource
  usage — all computed from real tables.
- VERIFY: a trainer cannot view or modify another trainer's course data
  (integration test asserting 403).

PHASE 6 — Admin Module
- User approval, role management, trainer verification, course
  moderation/approval, assessment/certification monitoring, audit log
  viewer, system settings, announcements/achievements management,
  reports/data export (CSV/PDF).
- Admin dashboard: totals (users, trainees, trainers, courses,
  enrollments, certificates, attempts), completion rate, average
  competency score, average skill improvement, department stats, top
  skill gaps, trainer effectiveness, activity trends — all live queries.
- VERIFY: non-admin users receive 403 on every admin route; audit log
  entries are created for every mutating admin action within the same
  transaction as the action.

PHASE 7 — Competency Engine & Skill Gap Analysis
- Implement trainee_competencies CRUD and the gap calculator:
  gap = required_level − current_level, classified into
  none/low/medium/high/critical using documented thresholds
  (e.g., 0 / 1 / 2 / 3 / 4+).
- Recompute skill_gap_analysis on every new assessment score or
  certification event (event-driven via the domain event bus / job
  queue, not polling).
- Build the organizational competency heatmap query (department × skill
  matrix) for admin analytics.
- VERIFY: unit tests covering every gap-classification boundary; a
  full-flow test where updating an assessment score triggers a
  recomputed gap record.

PHASE 8 — Trainer Matching Engine
- Implement a weighted scoring function combining: subject expertise
  match, skill level, certifications, years of experience, training
  history volume, trainee feedback/rating, prior learner improvement
  score, availability overlap, and department relevance. Document the
  weight of each factor in code comments and in a config object (not
  magic numbers scattered through the code).
- Persist results to trainer_match_scores with a `reasons` JSONB array
  of human-readable explanation strings (e.g., "Strong SQL expertise",
  "High previous learner improvement").
- Expose GET /trainer-matching/for-trainee/:id and /for-course/:id
  returning score + reasons, sorted descending.
- VERIFY: unit tests with constructed fixtures asserting scores and
  presence of expected reason strings; ensure the score is
  reproducible/deterministic given the same input data.

PHASE 9 — Courses, Resources, Assessments, Certification
- Full course lifecycle (modules, resources, prerequisites, skills
  covered, completion conditions, certificate eligibility rules).
- Assessment engine: MCQ / multi-answer / true-false, question bank,
  difficulty levels, time limits, deadlines, randomized questions and
  options per attempt, automatic scoring, pass/fail logic, attempt
  history, and pre-test/post-test pairing to compute absolute and
  percentage improvement + a learning-effectiveness metric.
- Certificate generation: unique certificate_number, QR code encoding a
  verification URL/token, PDF certificate rendering, and a PUBLIC
  (no-auth) verification page at /verify/:token showing validity,
  trainee name, course, trainer, and issue date only (no other PII).
- VERIFY: cheating-resistance checks (no correct-answer leakage before
  submission; server re-validates time limits and attempt ownership);
  certificate verification page correctly flags tampered/unknown tokens.

PHASE 10 — Analytics & Organizational Intelligence
- Build the Organizational Intelligence service answering, from real
  data only: largest competency gaps by department, most in-demand
  skills, highest/lowest completion courses, trainers with largest
  learner improvement, assessments that are statistically too
  difficult (e.g., pass rate below a threshold), employees/trainees
  needing urgent upskilling (critical gap count above a threshold),
  most-used learning resources.
- Render with real charts (bar/line/heatmap) bound to these endpoints.
- Report generation (CSV/PDF) for participation, completion, assessment
  performance, certification, competency development, trainer
  performance, department performance, skill gaps.
- VERIFY: each insight endpoint is covered by a test asserting the
  returned insight matches a hand-computed expectation from seeded data.

PHASE 11 — AI-Assisted Features
- Implement AIService with: explainSkillGap, recommendLearningPath,
  recommendTrainers (narrating the deterministic match score, not
  computing it), summarizeResource, generateQuestionDrafts (trainer
  must approve before publish), generateOrgInsights (narrating
  Phase 10 data), naturalLanguageSearch (parses intent, delegates to
  the real search/filter service).
- Every AI response includes `reasoning[]` and `confidence`. AI cannot
  write to users, roles, permissions, or user_roles tables under any
  circumstance — enforce this at the service layer, not just by
  convention.
- VERIFY: a test asserting the AI module has no write access to
  identity/permission tables (e.g., via a restricted DB role or
  service-layer guard); a test asserting AI-generated questions are
  created with status=draft.

PHASE 12 — Security, Audit Logging & Validation
- Full input validation (DTOs) on every endpoint, centralized exception
  filter that never leaks stack traces to clients, structured logging,
  file upload validation (extension + MIME sniffing + size caps),
  audit log entries for: login, role changes, user approval, course
  approval/modification, resource upload/deletion, assessment changes,
  certificate generation, and all other admin actions (actor, action,
  entity_type, entity_id, timestamp, ip, metadata).
- Add security tests: SQL injection attempts on filterable query
  params, JWT tampering/expired token handling, role-escalation payload
  attempts, disallowed file type uploads.
- VERIFY: security test suite passes; no endpoint returns raw error
  detail in production mode.

PHASE 13 — Responsive UI & Accessibility
- Build the public landing page (Hero, Platform Overview, How It Works,
  Competency Intelligence, Smart Trainer Matching, Learning Journey,
  Knowledge Hub, Organizational Analytics, clearly-labeled illustrative
  testimonials, CTA, Footer) and the three authenticated app shells
  (Trainee/Trainer/Admin) with a clean enterprise design system (no
  excessive gradients, no glassmorphism, no fake stats).
- Every list/table view implements explicit loading, empty, error, and
  populated states as separate, reusable components.
- Keyboard navigation, visible focus states, semantic HTML, ARIA labels,
  AA color contrast, reduced-motion support, mobile/tablet/desktop
  responsive layouts.
- VERIFY: run an accessibility audit (axe or Playwright + axe-core) on
  each major screen and fix violations; run responsive checks at
  mobile/tablet/desktop breakpoints.

PHASE 14 — Seed Realistic Data
- Seed: 3+ departments, ~15 trainees, ~5 trainers, ~10 courses across
  multiple categories, skills/competencies across 5+ domains,
  assessments with real question banks, enrollments in varied states
  (started/in_progress/completed/abandoned), several issued
  certificates, feedback/ratings, notifications/announcements.
- Tag all seeded rows so the UI can badge them "Demo Data." Generate
  demo credentials for admin/trainer/trainee, print them once to the
  console/README on first run — never hard-code them in source.
- VERIFY: after seeding, every dashboard and analytics screen shows
  non-empty, coherent, realistic-looking data with no manual
  intervention.

PHASE 15 — Testing, Bug Identification & Fixing
- Run the full test suite (unit, integration, E2E, security,
  accessibility). Triage and fix every failure. Add regression tests
  for any bug found. Re-run until the suite is green.
- VERIFY: CI pipeline (lint → typecheck → test → build) passes fully
  end-to-end locally.

PHASE 16 — Final Production-Readiness Review
- Confirm: no plaintext secrets in the repo; no console.log of
  sensitive data; every navigation item resolves to a working screen;
  every dashboard value is DB-derived; RBAC enforced on every sensitive
  route; audit logging present on every listed sensitive action;
  storage abstraction supports swapping local→S3 via config only;
  docker-compose brings the full stack up cleanly from a fresh clone;
  README documents setup, environment variables, seeding, demo
  credentials location, and deployment steps.
- Produce a short PRODUCTION_READINESS.md checklist confirming each
  item above with a pass/fail and note for any known limitation.
- Leave the project in a runnable state: `docker-compose up` (or
  documented equivalent) must result in a fully functional application
  with seeded demo data and working demo logins.

────────────────────────────────────────
HARD CONSTRAINTS (apply throughout ALL phases)
────────────────────────────────────────
1. No hard-coded dashboard/analytics values — everything is a real query.
2. No client-trusted role/permission checks — always re-verify server-side.
3. No plaintext passwords, no secrets in client bundles or source control.
4. No dead-end buttons or nav items — every control does something real.
5. AI is assistive only — it explains and suggests, it never decides
   security/permission outcomes and never writes to identity/role tables.
6. Every sensitive admin/trainer/trainee action that the spec lists under
   Audit & Compliance must produce an audit_logs row.
7. Prefer correctness and security over visual flourish at every decision
   point where they conflict.
8. Do not proceed to the next phase until the current phase's own
   verification step passes.

Begin at PHASE 1. Work through all 16 phases sequentially. At the end,
report the final PRODUCTION_READINESS.md status and how to run the
application locally.
════════════════════════════════════════════════════════════════════
```
