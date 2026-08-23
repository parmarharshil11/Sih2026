# Phase 12 — Security, Audit Logging & Validation
## Implementation-Ready Specification

---

## 1. INPUT VALIDATION SPEC

### 1.1 Existing Infrastructure

The app already has a global `ValidationPipe` registered in `app.module.ts`:
```ts
{ provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }) }
```
This already strips unknown properties and rejects unexpected fields. The spec below identifies where validation is **missing, insufficient, or must be tightened**.

### 1.2 String Sanitization Approach

**Library:** Use `class-sanitizer` or, preferably, a custom `@Transform` with a helper function.

**Helper (create in `apps/api/src/common/utils/sanitize.ts`):**
```ts
export function sanitizeString(value: string): string {
  return value
    .replace(/[<>]/g, '')           // strip angle brackets (XSS)
    .replace(/['"`;\\]/g, '')       // strip SQL meta-chars
    .replace(/\.\.\//g, '')         // strip path traversal
    .trim();
}
```

Apply via `@Transform(({ value }) => sanitizeString(value))` on all user-facing text fields (titles, descriptions, bios, comments, search queries). Do NOT apply to passwords or tokens.

**SQL injection note:** Prisma uses parameterized queries by default, so direct SQL injection through Prisma methods is already mitigated. The sanitization is defense-in-depth against stored XSS and any future `$queryRaw` usage.

### 1.3 Module-by-Module Validation Requirements

#### Auth Module

| DTO | Field | Current | Required Change |
|---|---|---|---|
| `RegisterDto.email` | `@IsEmail()` | ✅ Sufficient | Add `@MaxLength(254)` (RFC 5321 max) |
| `RegisterDto.password` | `@MinLength(8) @MaxLength(72)` | ✅ Sufficient | Add `@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,72}$/, { message: 'Password must contain at least one uppercase, one lowercase, one digit, and one special character' })` |
| `RegisterDto.role` | `@IsIn(['trainee', 'trainer'])` | ✅ Good. `admin` is correctly excluded. | No change |
| `LoginDto.email` | `@IsEmail()` | ✅ | Add `@MaxLength(254)` |
| `LoginDto.password` | `@MinLength(1)` | ⚠️ Weak | Change to `@MinLength(8) @MaxLength(72)` |
| `ResetPasswordDto.token` | `@IsString()` | ⚠️ Weak | Add `@IsUUID()` (tokens are UUID v4) and `@MaxLength(36)` |
| `ResetPasswordDto.password` | `@MinLength(8) @MaxLength(72)` | ✅ | Add same `@Matches` regex as RegisterDto |
| `ForgotPasswordDto.email` | `@IsEmail()` | Check if exists | Must have `@IsEmail()` and `@MaxLength(254)` |
| `AuthController.verifyEmail` | `:token` route param | No DTO validation | Add `@IsUUID()` validation via `ParseUUIDPipe` in the `@Param` |

#### Admin Module

| DTO | Field | Current | Required Change |
|---|---|---|---|
| `UpdateUserStatusDto.status` | Check | Likely `@IsEnum(UserStatus)` | Verify it uses `@IsEnum(UserStatus)` with only values: `pending`, `active`, `suspended`. A body like `{ "status": "admin" }` must fail. |
| `UpdateTrainerVerificationDto.status` | Check | Likely `@IsEnum(VerificationStatus)` | Verify it uses `@IsEnum(VerificationStatus)` with values: `pending`, `verified`, `rejected` |
| Pagination: `page`, `limit` query params | raw `parseInt` in controller | ⚠️ No bounds | Clamp `page >= 1`, `limit` between `1..100`. Use `@Type(() => Number) @IsInt() @Min(1)` in a shared `PaginationQueryDto` |

#### Trainee Module

| DTO | Field | Rule |
|---|---|---|
| `headline` | `@IsString() @MaxLength(120) @IsOptional()` | Sanitize |
| `bio` | `@IsString() @MaxLength(2000) @IsOptional()` | Sanitize |
| `profilePhotoUrl` | `@IsUrl() @MaxLength(2048) @IsOptional()` | Must validate URL format |
| `interestName` | `@IsString() @MinLength(1) @MaxLength(100)` | Sanitize |
| `organization` (work exp) | `@IsString() @MaxLength(200)` | Sanitize |
| `role` (work exp) | `@IsString() @MaxLength(100)` | Sanitize |
| `description` (work exp) | `@IsString() @MaxLength(2000) @IsOptional()` | Sanitize |
| `degree` (qualification) | `@IsString() @MaxLength(200)` | Sanitize |
| `institution` (qualification) | `@IsString() @MaxLength(200)` | Sanitize |
| `year` (qualification) | `@IsInt() @Min(1900) @Max(2100)` | — |

#### Trainer Module

| DTO | Field | Rule |
|---|---|---|
| `bio` | `@IsString() @MaxLength(2000) @IsOptional()` | Sanitize |
| `yearsExperience` | `@IsInt() @Min(0) @Max(60)` | — |
| `dayOfWeek` (availability) | `@IsInt() @Min(0) @Max(6)` | — |
| `startTime`, `endTime` | `@Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)` | HH:MM format |
| `timezone` | `@IsString() @MaxLength(50)` | Validate against IANA list or `@IsTimeZone()` |
| `proficiencyLevel` (expertise) | `@IsInt() @Min(1) @Max(5)` | — |

#### Course Module

| DTO | Field | Rule |
|---|---|---|
| `CreateCourseDto.title` | `@IsString() @MinLength(3) @MaxLength(200)` | Sanitize |
| `CreateCourseDto.description` | `@IsString() @MinLength(10) @MaxLength(5000)` | Sanitize |
| `CreateCourseDto.durationMinutes` | `@IsInt() @Min(0) @Max(100000)` | — |
| `CreateCourseDto.thumbnailUrl` | `@IsUrl() @MaxLength(2048) @IsOptional()` | — |
| `CreateModuleDto.title` | `@IsString() @MinLength(1) @MaxLength(300)` | Sanitize |
| `CreateModuleDto.sequenceOrder` | `@IsInt() @Min(1) @Max(200)` | — |
| `CreateCategoryDto.name` | `@IsString() @MinLength(1) @MaxLength(100)` | Sanitize |
| Search query (`?search=`) | raw string in controller | Sanitize before passing to Prisma `contains` |

#### Assessment Module

| DTO | Field | Rule |
|---|---|---|
| `CreateAssessmentDto.subject` | `@IsString() @MinLength(1) @MaxLength(300)` | Sanitize |
| `CreateAssessmentDto.timeLimitMinutes` | `@IsInt() @Min(1) @Max(600)` | — |
| `CreateAssessmentDto.passScorePct` | `@IsInt() @Min(0) @Max(100)` | Already present. Verify. |
| `AddQuestionDto.questionText` | `@IsString() @MinLength(1) @MaxLength(2000)` | Sanitize |
| `AddQuestionDto.points` | `@IsInt() @Min(1) @Max(100)` | — |
| `CreateOptionDto.optionText` | `@IsString() @MinLength(1) @MaxLength(500)` | Sanitize |

#### Certificate Module

| DTO | Field | Rule |
|---|---|---|
| `IssueCertificateDto.enrollmentId` | `@IsUUID()` | ✅ Already present |
| `verify/:token` route param | raw string | Add `ParseUUIDPipe` validation |

#### Competency Module

| DTO | Field | Rule |
|---|---|---|
| `CreateSkillDto.name` | `@IsString() @MinLength(1) @MaxLength(100)` | Sanitize |
| `CreateSkillDto.category` | `@IsString() @MinLength(1) @MaxLength(100)` | Sanitize |
| `CreateSkillDto.description` | `@IsString() @MaxLength(2000) @IsOptional()` | Sanitize |
| `CreateCompetencyDto.name` | Same as skill | Sanitize |
| `UpsertTraineeCompetencyDto.currentLevel` | `@IsInt() @Min(1) @Max(5)` | — |
| `UpsertTraineeCompetencyDto.requiredLevel` | `@IsInt() @Min(1) @Max(5)` | — |
| `UpsertTraineeCompetencyDto.targetLevel` | `@IsInt() @Min(1) @Max(5)` | — |
| `UpsertTraineeCompetencyDto.evidenceUrl` | `@IsUrl() @MaxLength(2048) @IsOptional()` | — |
| `?category` filter query params | raw string in controller | Sanitize |

#### AI Module

| DTO | Field | Rule |
|---|---|---|
| `DraftCourseOutlineDto.topic` | `@IsString() @MinLength(3) @MaxLength(200)` | Sanitize |
| `DraftCourseOutlineDto.targetAudience` | `@IsString() @MaxLength(200) @IsOptional()` | Sanitize |
| `DraftCourseOutlineDto.difficulty` | `@IsEnum(Difficulty) @IsOptional()` | Use enum, not raw string |

#### Analytics Module (query params)

All query parameters passed to analytics endpoints are used internally for DB aggregation and do not accept user-supplied filter strings at present. No additional DTOs needed unless future filters are added. Current implementation is safe.

### 1.4 Shared Pagination DTO

Create `apps/api/src/common/dto/pagination-query.dto.ts`:
```ts
export class PaginationQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page?: number = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit?: number = 20;
}
```
Refactor all controllers currently doing raw `parseInt` on `page`/`limit` to use this DTO via `@Query()`.

### 1.5 UUID Route Parameter Validation

All `:id` route parameters across the entire API must use `ParseUUIDPipe`:
```ts
@Param('id', ParseUUIDPipe) id: string
```
This blocks malformed IDs from reaching service methods. Apply globally to all controller `@Param('id')`, `@Param('courseId')`, `@Param('moduleId')`, `@Param('attemptId')`, `@Param('questionId')`, etc.

---

## 2. AUDIT LOGGING TRIGGER SPEC

### 2.1 Audit Service

Create `apps/api/src/common/services/audit.service.ts` as a shared injectable service wrapping `prisma.auditLog.create()`.

```ts
// Pseudocode interface
class AuditService {
  async log(data: {
    actorUserId: string | null;
    action: string;       // enum-like constant, e.g. 'USER_LOGIN'
    entityType: string;   // e.g. 'User', 'Course', 'Certificate'
    entityId: string | null;
    ipAddress: string | null;
    metadata: Record<string, any> | null;
    prisma?: PrismaTransactionClient; // optional tx client
  }): Promise<void>;
}
```

**Critical rule:** When the audit log is associated with a write operation, the `prisma` parameter must be passed as the transaction client so the audit row and the business write are in the SAME `$transaction`. If the business write fails, the audit log is NOT persisted (no false positives).

### 2.2 Extracting IP Address

Create a reusable helper used by every controller that needs to pass IP:
```ts
function extractIp(req: Request): string | null {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    ?? req.socket.remoteAddress
    ?? null;
}
```

### 2.3 Trigger Catalog

| # | Action | Service Method | Trigger Point | `action` constant | `entityType` | `metadata` contents |
|---|---|---|---|---|---|---|
| 1 | **User login** | `AuthService.login` | AFTER `lastLoginAt` update succeeds | `USER_LOGIN` | `User` | `{ email }` |
| 2 | **Failed login** | `AuthService.login` | AFTER password check fails (before throwing) | `USER_LOGIN_FAILED` | `User` | `{ email, reason: 'invalid_credentials' \| 'suspended' \| 'pending' }` |
| 3 | **User registration** | `AuthService.register` | AFTER `prisma.user.create` in same tx | `USER_REGISTERED` | `User` | `{ email, role }` |
| 4 | **Password reset request** | `AuthService.forgotPassword` | AFTER token saved | `PASSWORD_RESET_REQUESTED` | `User` | `{ email }` — actor null since unauthenticated |
| 5 | **Password reset completed** | `AuthService.resetPassword` | AFTER password hash updated, in same tx | `PASSWORD_RESET_COMPLETED` | `User` | `{ userId }` |
| 6 | **User status change** | `AdminService.updateUserStatus` | AFTER `prisma.user.update`, in same tx | `USER_STATUS_CHANGED` | `User` | `{ oldStatus, newStatus }` |
| 7 | **Trainer verification** | `AdminService.updateTrainerVerification` | AFTER `prisma.trainerProfile.update`, in same tx | `TRAINER_VERIFICATION_CHANGED` | `TrainerProfile` | `{ oldStatus, newStatus }` |
| 8 | **Course created** | `CourseService.createCourse` | AFTER `prisma.course.create`, in same tx | `COURSE_CREATED` | `Course` | `{ title, status: 'draft' }` |
| 9 | **Course updated** | `CourseService.updateCourse` | AFTER update | `COURSE_UPDATED` | `Course` | `{ changedFields: [...] }` — list of field names that changed |
| 10 | **Course submitted for approval** | `CourseService.submitForApproval` | AFTER status change | `COURSE_SUBMITTED` | `Course` | `{ title }` |
| 11 | **Course approved** | `CourseService.approveCourse` | AFTER status → published, in same tx | `COURSE_APPROVED` | `Course` | `{ approvedById }` |
| 12 | **Course rejected** | `CourseService.rejectCourse` | AFTER status → draft | `COURSE_REJECTED` | `Course` | `{ rejectedById }` |
| 13 | **Course deleted** | `CourseService.deleteCourse` | AFTER soft-delete | `COURSE_DELETED` | `Course` | `{}` |
| 14 | **Assessment created** | `AssessmentService.createAssessment` | AFTER create | `ASSESSMENT_CREATED` | `Assessment` | `{ subject, type }` |
| 15 | **Question added** | `AssessmentService.addQuestion` | AFTER create | `QUESTION_ADDED` | `AssessmentQuestion` | `{ assessmentId, questionType }` |
| 16 | **Question deleted** | `AssessmentService.deleteQuestion` | AFTER delete | `QUESTION_DELETED` | `AssessmentQuestion` | `{ assessmentId }` |
| 17 | **Assessment attempt submitted** | `AssessmentService.submitAttempt` | AFTER transaction, in same tx | `ASSESSMENT_SUBMITTED` | `AssessmentAttempt` | `{ scorePct, passed }` |
| 18 | **Certificate issued** | `CertificateService.issueCertificate` | AFTER `prisma.certificate.create`, in same tx | `CERTIFICATE_ISSUED` | `Certificate` | `{ certificateNumber, traineeId, courseId }` |
| 19 | **Certificate verified** | `CertificateService.verifyCertificate` | AFTER verification record created | `CERTIFICATE_VERIFIED` | `Certificate` | `{ verifierIp, valid: true\|false }`. Note: actorUserId is null (public endpoint) |
| 20 | **Enrollment created** | `CourseService.enroll` | AFTER create | `ENROLLMENT_CREATED` | `Enrollment` | `{ courseId }` |
| 21 | **AI draft course generated** | `AiService.draftCourseOutline` | AFTER draft saved | `AI_COURSE_DRAFTED` | `Course` | `{ topic, status: 'draft' }` |

### 2.4 Transaction Pattern

For all write operations, wrap the business logic and audit log in `prisma.$transaction`:

```ts
// Pseudocode pattern
await this.prisma.$transaction(async (tx) => {
  const result = await tx.course.update({ ... });
  await this.auditService.log({
    actorUserId: userId,
    action: 'COURSE_APPROVED',
    entityType: 'Course',
    entityId: courseId,
    ipAddress,
    metadata: { approvedById: userId },
    prisma: tx,  // uses the same transaction client
  });
  return result;
});
```

For login/failed-login (read-heavy operations where the audit is the only write), a simple `prisma.auditLog.create()` without a wrapping transaction is acceptable.

---

## 3. CENTRALIZED EXCEPTION HANDLING SPEC

### 3.1 Current State

The existing `GlobalExceptionFilter` at `apps/api/src/common/filters/global-exception.filter.ts` already:
- Returns a structured `{ error: { code, message, timestamp, path }, data, meta }` envelope
- Logs full stack traces server-side for unhandled exceptions
- Returns only `"Internal server error"` for non-HttpException types

### 3.2 Enhancements Required

#### Mapping Table

| Internal Exception | Client-Facing Message | HTTP Status |
|---|---|---|
| `BadRequestException` | Original message (validation errors are user-safe) | 400 |
| `UnauthorizedException` | `"Authentication required"` or original if already generic | 401 |
| `ForbiddenException` | `"Access denied"` | 403 |
| `NotFoundException` | `"Resource not found"` | 404 |
| `ConflictException` | Original message (e.g., "Already enrolled") | 409 |
| `ThrottlerException` | `"Too many requests. Try again later."` | 429 |
| `Prisma.PrismaClientKnownRequestError` (P2002 unique constraint) | `"A record with this value already exists"` | 409 |
| `Prisma.PrismaClientKnownRequestError` (P2025 not found) | `"Resource not found"` | 404 |
| `Prisma.PrismaClientKnownRequestError` (other) | `"Internal server error"` | 500 |
| `Prisma.PrismaClientValidationError` | `"Internal server error"` | 500 |
| `SyntaxError` (malformed JSON body) | `"Malformed request body"` | 400 |
| All other `Error` | `"Internal server error"` | 500 |
| Non-Error thrown | `"Internal server error"` | 500 |

#### What MUST NEVER appear in a client response:
- Stack traces
- Raw Prisma/SQL error messages (e.g., `prisma.user.findUnique is not a function`)
- Internal file paths (e.g., `f:\SIH Project repo\...`)
- Database connection strings or DSN fragments
- Dependency version numbers
- Internal entity IDs that the user didn't supply in the request (avoid leaking UUIDs of other entities)

#### What MUST be logged server-side:
- Full stack trace
- Request method, URL, headers (minus `cookie` and `authorization`—redact these)
- Request body (redact `password`, `passwordHash`, `token`, `refreshToken`)
- Prisma error code and meta (for Prisma exceptions)

### 3.3 Pseudocode for Enhanced Filter

```ts
catch(exception, host) {
  // ... existing code ...
  
  // Add: Handle Prisma errors specifically
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') { status = 409; message = 'A record with this value already exists'; }
    else if (exception.code === 'P2025') { status = 404; message = 'Resource not found'; }
    else { status = 500; message = 'Internal server error'; }
    // Always log full Prisma error server-side
    this.logger.error(`Prisma error ${exception.code}`, exception.message);
  }
  
  // Add: Handle malformed JSON
  if (exception instanceof SyntaxError && (exception as any).status === 400) {
    status = 400; message = 'Malformed request body';
  }
  
  // Scrub: ensure no stack/path info leaks
  // ... rest of response ...
}
```

---

## 4. FILE UPLOAD VALIDATION SPEC

### 4.1 MIME Type Whitelist & Max Size

| `ResourceType` enum | Allowed MIME Types | Max Size |
|---|---|---|
| `pdf` | `application/pdf` | 25 MB |
| `ppt` | `application/vnd.ms-powerpoint` | 50 MB |
| `pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | 50 MB |
| `doc` | `application/msword` | 25 MB |
| `docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 25 MB |
| `video` | `video/mp4`, `video/webm` | 500 MB |
| `audio` | `audio/mpeg`, `audio/wav`, `audio/ogg` | 100 MB |
| `image` | `image/jpeg`, `image/png`, `image/webp`, `image/gif` | 10 MB |

### 4.2 MIME-Sniffing Validation

**Do NOT trust `Content-Type` header or file extension alone.** Use the `file-type` npm package (pure JS, reads magic bytes):

```ts
import { fileTypeFromBuffer } from 'file-type';

const detected = await fileTypeFromBuffer(buffer);
if (!detected || !ALLOWED_MIMES_FOR_TYPE[resourceType].includes(detected.mime)) {
  throw new BadRequestException('File type not allowed');
}
```

### 4.3 Storage Path Rules

- Base path: `uploads/{userId}/{courseId}/{moduleId}/{filename}`
- Filenames: replace original filename with `{uuid}.{detected-extension}` to prevent path traversal and name collisions
- Directory must NOT be served with execute permissions
- If using MinIO (as per docker-compose), use a dedicated bucket `cc-resources` with private ACL

### 4.4 Rejected File Handling

On rejection:
1. Return `400 Bad Request` with message: `"File rejected: <reason>"` where reason is one of:
   - `"MIME type not allowed for resource type '<type>'"`
   - `"File size exceeds <max> MB limit"`
   - `"File appears to be empty"`
2. Log an audit entry: action=`FILE_UPLOAD_REJECTED`, metadata=`{ originalName, detectedMime, sizeBytes, reason }`

### 4.5 File Upload Interceptor

Create `apps/api/src/common/interceptors/file-validation.interceptor.ts` using NestJS `FileInterceptor` from `@nestjs/platform-express` with Multer limits:

```ts
FileInterceptor('file', {
  limits: { fileSize: MAX_SIZE_PER_TYPE[resourceType] },
  fileFilter: (req, file, cb) => { /* validate extension first pass */ },
})
```

Then in the service method, perform the magic-bytes check with `file-type` as a second pass before writing to storage.

---

## 5. RATE LIMITING SPEC

### 5.1 Current State

The existing `ThrottlerModule` is configured with a single named config `auth` (5 requests per 15 minutes). This applies only to auth routes that explicitly use `@Throttle()`.

### 5.2 Additional Rate Limits Required

| Endpoint Group | Window | Max Requests | Key | Rationale |
|---|---|---|---|---|
| `POST /api/v1/auth/login` | 15 min | 5 per IP | IP | Already configured via `auth` throttle. Verify it's applied. |
| `POST /api/v1/auth/register` | 1 hour | 3 per IP | IP | Prevent mass account creation |
| `POST /api/v1/auth/forgot-password` | 15 min | 3 per IP | IP | Prevent email bombing |
| `POST /api/v1/auth/reset-password` | 15 min | 5 per IP | IP | Prevent brute-force token guessing |
| `POST /api/v1/assessments/:id/start` | 1 min | 2 per user | User ID | Prevent attempt farming |
| `POST /api/v1/certificates/issue` | 1 min | 3 per user | User ID | Prevent cert spam |
| `POST /api/v1/ai/*` | 1 min | 5 per user | User ID | Prevent AI abuse |
| `GET /api/v1/certificates/verify/:token` | 1 min | 30 per IP | IP | Public endpoint, prevent scraping |
| `GET /api/v1/analytics/*` | 1 min | 10 per user | User ID | Heavy aggregation queries |
| All other `POST/PATCH/DELETE` | 1 min | 30 per user | User ID | General write protection |
| All other `GET` | 1 min | 100 per user | User ID | General read protection |

### 5.3 Implementation Approach

Add additional named throttler configurations in `ThrottlerModule.forRoot()`:
```ts
ThrottlerModule.forRoot([
  { name: 'auth',      ttl: 15 * 60 * 1000, limit: 5 },
  { name: 'register',  ttl: 60 * 60 * 1000, limit: 3 },
  { name: 'ai',        ttl: 60 * 1000,      limit: 5 },
  { name: 'general',   ttl: 60 * 1000,      limit: 30 },
])
```

Apply per-endpoint with `@Throttle({ register: { ttl: 3600000, limit: 3 } })`.

---

## 6. SECURITY TEST CASE SPEC

### 6.1 SQL Injection Attempts

| # | Endpoint | Malicious Input | Expected Behavior | Expected Response |
|---|---|---|---|---|
| SQL-1 | `GET /api/v1/courses?search='; DROP TABLE courses; --` | SQL in search query param | Prisma parameterizes; query returns 0 results | `200 OK`, empty `data` array |
| SQL-2 | `POST /api/v1/auth/login` with `email: "admin@test.com' OR '1'='1"` | SQL in email field | `@IsEmail()` validation rejects | `400 Bad Request`, validation error |
| SQL-3 | `GET /api/v1/courses?categoryId=1; DELETE FROM courses` | SQL in UUID param | `ParseUUIDPipe` rejects | `400 Bad Request`, "Validation failed (uuid is expected)" |
| SQL-4 | `GET /api/v1/competencies?category=Technical' UNION SELECT * FROM users--` | SQL in filter param | Sanitize + Prisma parameterization | `200 OK`, no data leaked |

### 6.2 JWT Tampering

| # | Attack | Expected Behavior | Expected Response |
|---|---|---|---|
| JWT-1 | Modify JWT payload `sub` to a different user's ID, re-sign with a random key | Signature verification fails in JwtStrategy | `401 Unauthorized` |
| JWT-2 | Send expired JWT (exp in the past) | Passport JWT strategy rejects | `401 Unauthorized` |
| JWT-3 | Send JWT with `alg: "none"` | `jsonwebtoken` library rejects algorithm none by default | `401 Unauthorized` |
| JWT-4 | Forge JWT with `roles: ["admin"]` in the payload | RolesGuard resolves roles from DB lookup, NOT from token claims. Forged claim is ignored. | Role check uses DB roles → `403 Forbidden` if actual role is trainee |
| JWT-5 | Send request with no cookie/token at all to a guarded endpoint | JwtAuthGuard rejects | `401 Unauthorized` |
| JWT-6 | Reuse a revoked refresh token | `AuthService.refresh` detects reuse, revokes ALL user tokens | `401 Unauthorized`, "Refresh token reuse detected" |

### 6.3 Role-Escalation Payload Attempts

| # | Endpoint | Attack Payload | Expected Behavior | Expected Response |
|---|---|---|---|---|
| ROLE-1 | `POST /api/v1/auth/register` | `{ "email": "evil@test.com", "password": "P@ss1234", "role": "admin" }` | `@IsIn(['trainee', 'trainer'])` rejects `admin` | `400 Bad Request` |
| ROLE-2 | `POST /api/v1/auth/register` | `{ "email": "evil@test.com", "password": "P@ss1234", "role": "trainee", "userRoles": [{ "roleId": "<admin-role-uuid>" }] }` | `whitelist: true` + `forbidNonWhitelisted: true` strips `userRoles` and rejects | `400 Bad Request`, "property userRoles should not exist" |
| ROLE-3 | `PATCH /admin/users/:id/status` as trainee | Trainee cookie sent to admin endpoint | `RolesGuard` checks DB role = trainee, denies admin route | `403 Forbidden`, "Insufficient role" |
| ROLE-4 | `POST /api/v1/courses` as trainee | Trainee tries to create a course (trainer-only) | `@Roles('trainer')` guard denies | `403 Forbidden` |
| ROLE-5 | `PATCH /api/v1/courses/:id` with `{ "approvedById": "<my-id>", "status": "published" }` | Trainer tries to self-approve | `whitelist: true` strips `approvedById` (not in DTO). Service checks `status !== draft` logic. | `400 Bad Request` or field silently stripped |

### 6.4 Disallowed File Type / Oversized File Uploads

| # | Attack | Expected Behavior | Expected Response |
|---|---|---|---|
| FILE-1 | Upload `.exe` renamed to `.pdf` | Magic-bytes check via `file-type` detects `application/x-dosexec`, not `application/pdf` | `400 Bad Request`, "MIME type not allowed" |
| FILE-2 | Upload 30 MB PDF (exceeds 25 MB limit) | Multer `fileSize` limit triggers | `400 Bad Request`, "File size exceeds 25 MB limit" |
| FILE-3 | Upload `.html` file as a resource | Neither extension nor MIME is in whitelist | `400 Bad Request`, "MIME type not allowed" |
| FILE-4 | Upload file with path traversal name `../../etc/passwd.pdf` | Filename is replaced with `{uuid}.pdf` — original name ignored in storage | `201 Created`, file stored safely |
| FILE-5 | Upload 0-byte file | Size check rejects | `400 Bad Request`, "File appears to be empty" |

### 6.5 IDOR (Insecure Direct Object Reference) Checks

| # | Endpoint | Attack | Expected Behavior | Expected Response |
|---|---|---|---|---|
| IDOR-1 | `GET /api/v1/enrollments/:id` | Trainee A requests Trainee B's enrollment by guessing UUID | Service must verify `enrollment.trainee.userId === currentUserId` | `403 Forbidden` or `404 Not Found` (prefer 404 to avoid confirming existence) |
| IDOR-2 | `PATCH /api/v1/enrollments/:id/progress` | Trainee A updates progress on Trainee B's enrollment | `CourseService.updateProgress` checks `enrollment.traineeId === traineeProfile.id` (already implemented) | `404 Not Found` (already returns "Enrollment not found") |
| IDOR-3 | `PATCH /api/v1/courses/:id` | Trainer A edits Trainer B's course | `_assertCourseOwner` check (already implemented) | `403 Forbidden`, "You do not own this course" |
| IDOR-4 | `GET /api/v1/assessments/:id/attempts/:attemptId/results` | Trainee A reads Trainee B's attempt results | Service checks `attempt.traineeId === traineeProfile.id` (already implemented) | `404 Not Found` |
| IDOR-5 | `GET /api/v1/certificates/:id` | Any user guesses another user's certificate UUID | Currently no ownership check. **MUST ADD**: verify `cert.trainee.userId === userId` OR user is admin | Should return `403` or `404` |

---

## 7. IMPLEMENTATION HANDOFF NOTES

### 7.1 Prioritized Checklist (Highest Risk First)

1. **IDOR fixes** (Section 6.5, especially IDOR-5: `GET /certificates/:id` lacks ownership check) — immediate data leak risk
2. **Audit logging infrastructure** (Section 2: create AuditService, wrap sensitive operations in transactions)
3. **Enhanced GlobalExceptionFilter** (Section 3: prevent Prisma error leaks, handle P2002/P2025)
4. **UUID route param validation** (Section 1.5: add `ParseUUIDPipe` to all `:id` params globally)
5. **Password strength regex** (Section 1.3: tighten RegisterDto and ResetPasswordDto)
6. **Login DTO tightening** (Section 1.3: LoginDto password MinLength to 8)
7. **Shared PaginationQueryDto** (Section 1.4) and refactor admin/course controllers
8. **String sanitization utility** (Section 1.2) and apply `@Transform` to all text fields
9. **File upload validation interceptor** with magic-byte checking (Section 4)
10. **Rate limiting expansion** (Section 5) — add named throttle configs
11. **Security test suite** (Section 6) — write as Jest e2e tests in `apps/api/test/security.e2e-spec.ts`

### 7.2 Existing Patterns to Reuse

| Pattern | Location | Reuse For |
|---|---|---|
| `JwtAuthGuard` | `common/guards/jwt-auth.guard.ts` | Do NOT recreate. Import as-is. |
| `RolesGuard` | `common/guards/roles.guard.ts` | Do NOT recreate. Import as-is. |
| `@Roles()` decorator | `common/decorators/roles.decorator.ts` | Import as-is. |
| `@CurrentUser()` decorator | `common/decorators/current-user.decorator.ts` | Import as-is. |
| `GlobalExceptionFilter` | `common/filters/global-exception.filter.ts` | **Extend**, do not replace. |
| `ValidationPipe` config | `app.module.ts` line 51 | Already global. All DTOs auto-validated. |
| `PrismaService` | `modules/prisma/prisma.service.ts` | All DB access goes through this. |
| `AuditLog` schema | `schema.prisma` lines 108-123 | Schema is already defined. No migration needed. |

### 7.3 Critical Constraint: Do Not Weaken RBAC

> **Validation is ADDITIVE, not a replacement for authorization checks.**

The implementing AI **must not**:
- Remove any `@UseGuards(JwtAuthGuard, RolesGuard)` decorator from any controller
- Remove any `@Roles(...)` decorator from any endpoint
- Remove any ownership checks (`_assertCourseOwner`, `traineeId === profile.id`, etc.) from any service method
- Add a `@Public()` or `@SkipAuth()` decorator to any endpoint except `GET /certificates/verify/:token` (which is already public)
- Modify the `RolesGuard` to read roles from the JWT payload instead of the DB

All Phase 12 changes are purely **additive hardening** on top of the existing auth/RBAC infrastructure.

---

*End of Phase 12 Specification.*
