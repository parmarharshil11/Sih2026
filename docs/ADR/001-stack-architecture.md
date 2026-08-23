# ADR 001: Stack Architecture for Capacity Connect

## Status
Accepted

## Context
Capacity Connect is an enterprise-grade digital capacity building, competency development, and learning management platform. The platform requires robust security, high performance, maintainability, and scalability. It includes distinct user flows for Trainees, Trainers, and Admins, along with complex computational engines for skill gaps, trainer matching, and assessments.

## Decision
We have decided to lock in the following technical stack and architectural patterns to meet the enterprise requirements:

- **Monorepo Strategy:** Turborepo managing multiple applications (pps/web, pps/api) and shared packages (packages/ui, packages/shared-types, packages/db).
- **Frontend Layer (Client):** Next.js 14+ (App Router) with TypeScript, Tailwind CSS, and shadcn/ui. Chosen for its robust SSR/SSG capabilities, file-based routing, and enterprise-grade UI primitive ecosystems.
- **Backend Layer (API):** Node.js with NestJS (TypeScript). Chosen for its modularity and built-in dependency injection, which perfectly mirrors the required service separation (AuthModule, UserModule, TraineeModule, etc.).
- **Database & ORM:** PostgreSQL 15+ managed via Prisma ORM. Relational integrity is critical for the complex competency and assessment data model. JSONB is used for flexible metadata.
- **Cache & Background Processing:** Redis and BullMQ. Required for session caching, rate limiting, and handling background tasks like certificate generation and analytics recomputation.
- **Storage:** Abstracted object storage interface with a local disk adapter for development and an S3-compatible (MinIO/AWS) adapter for production.
- **Authentication:** Stateless scaling using JWT (access + rotating refresh tokens) stored in httpOnly, Secure, SameSite=strict cookies. Passwords hashed using Argon2id. Role verification is strictly server-side.
- **AI Integration:** Pluggable AIService interface designed to be provider-agnostic. AI is restricted to assistive read/explain roles and cannot mutate security/identity tables.
- **Testing Strategy:** Jest and Supertest for API, React Testing Library for frontend components, and Playwright for End-to-End user journeys.

## Consequences
- **Positive:** Deeply integrated TypeScript across the stack. Explicit boundaries between API modules. Predictable state and robust security defaults.
- **Negative/Trade-offs:** NestJS and Next.js App Router have learning curves. Prisma adds overhead but ensures type safety across database operations. Managing a monorepo requires careful dependency management to avoid circular dependencies.
