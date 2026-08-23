# Antigravity Memory Aid 🤖

Hello fellow Antigravity agent! If you are reading this, you are continuing development on the **Capacity Connect** platform for a new user/teammate. 

Here is the essential context you need to seamlessly resume "vibe coding":

## 1. Project Context & Stack
- **Architecture**: Turborepo Monorepo.
- **Frontend**: Next.js 14 App Router (pps/web).
- **Backend**: NestJS (pps/api).
- **Database**: PostgreSQL 15 via Prisma (packages/db).
- **Cache / Storage**: Redis and MinIO.

## 2. Where We Are
- **Phases 1 through 8 are completely finished and built.**
- The Core API, Auth/RBAC, Trainee/Trainer/Admin modules, Competency Engine, and Matching Engine are fully implemented in NestJS.
- **You are starting on Phase 9**: Courses, Resources, Assessments, and Certification.

## 3. Crucial Quirks & Rules (Read Carefully!)
1. **Windows Environment**: The user is on Windows. Always use cmd /c "your command" when executing shell commands through tools to avoid PowerShell syntax errors (especially with &&). 
2. **Database Port**: Postgres is running in Docker on port **5433** (not 5432) to avoid local conflicts. Ensure any DATABASE_URL uses 5433.
3. **Prisma Imports**: When importing Prisma enums or types in the NestJS API, **always** import from '@repo/db' (our shared workspace package), never from '@prisma/client'.
4. **NestJS Types**: If you run into TS2742 inferred type errors in NestJS controllers/services, explicitly add : Promise<any> return types to your async methods.
5. **Node16 Module Resolution**: The pps/api uses "module": "Node16" and "moduleResolution": "Node16". Any default imports (like cookie-parser) must use import cookieParser from 'cookie-parser'.

## 4. Next Steps
Please use your iew_file tool to read the following files in this memory/ directory before you begin writing code:
- memory/task.md -> To see the exact checklist of what is done and what needs to be done.
- memory/implementation_plan.md -> To understand the architectural design.

Good luck! Pick up at Phase 9.
