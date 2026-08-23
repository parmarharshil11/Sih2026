import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/modules/prisma/prisma.service';

/**
 * E2E: Full Course Lifecycle Test
 * 
 * Flow: Trainer registers → creates draft course → adds module →
 *       submits for approval → Admin approves → Trainee enrolls
 * 
 * Requires a running PostgreSQL instance (uses DATABASE_URL env).
 * Set TEST_DB_URL or rely on docker-compose to provide the DB.
 */
describe('Course Lifecycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Track cookies for each role
  let adminCookie: string;
  let trainerCookie: string;
  let traineeCookie: string;

  // Track created resource IDs
  let trainerId: string;
  let traineeUserId: string;
  let courseId: string;
  let moduleId: string;

  // Unique test emails to avoid collision with seed data
  const ADMIN_EMAIL = `e2e-admin-${Date.now()}@test.com`;
  const TRAINER_EMAIL = `e2e-trainer-${Date.now()}@test.com`;
  const TRAINEE_EMAIL = `e2e-trainee-${Date.now()}@test.com`;
  const PASSWORD = 'TestPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    const cookieParser = require('cookie-parser');
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Ensure required roles exist
    await prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin' } });
    await prisma.role.upsert({ where: { name: 'trainer' }, update: {}, create: { name: 'trainer' } });
    await prisma.role.upsert({ where: { name: 'trainee' }, update: {}, create: { name: 'trainee' } });

    // Clean up any previous test run's data
    await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, TRAINER_EMAIL, TRAINEE_EMAIL] } } });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, TRAINER_EMAIL, TRAINEE_EMAIL] } } });
    await app.close();
  });

  // ─── Step 1: Seed Roles & Register Users ──────────────────────────────────────

  it('Step 1a: Register admin user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: ADMIN_EMAIL, password: PASSWORD, role: 'admin' })
      .expect(201);

    // Manually activate admin (skip email verification for tests)
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { status: 'active', emailVerifiedAt: new Date(), emailVerificationToken: null },
    });
  });

  it('Step 1b: Register trainer user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: TRAINER_EMAIL, password: PASSWORD, role: 'trainer' })
      .expect(201);

    const user = await prisma.user.findUnique({ where: { email: TRAINER_EMAIL } });
    trainerId = user.id;
    await prisma.user.update({
      where: { id: trainerId },
      data: { status: 'active', emailVerifiedAt: new Date(), emailVerificationToken: null },
    });
    // Create trainer profile
    await prisma.trainerProfile.upsert({
      where: { userId: trainerId },
      update: {},
      create: { userId: trainerId, bio: 'E2E Test Trainer', yearsExperience: 3, verificationStatus: 'verified' },
    });
  });

  it('Step 1c: Register trainee user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: TRAINEE_EMAIL, password: PASSWORD, role: 'trainee' })
      .expect(201);

    const user = await prisma.user.findUnique({ where: { email: TRAINEE_EMAIL } });
    traineeUserId = user.id;
    await prisma.user.update({
      where: { id: traineeUserId },
      data: { status: 'active', emailVerifiedAt: new Date(), emailVerificationToken: null },
    });
    // Create trainee profile
    await prisma.traineeProfile.upsert({
      where: { userId: traineeUserId },
      update: {},
      create: { userId: traineeUserId },
    });
  });

  // ─── Step 2: Login All Users ──────────────────────────────────────────────────

  it('Step 2a: Admin login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD })
      .expect(200);

    const cookies = res.headers['set-cookie'] as unknown as string[];
    adminCookie = cookies.find((c: string) => c.startsWith('access_token='));
    expect(adminCookie).toBeDefined();
  });

  it('Step 2b: Trainer login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TRAINER_EMAIL, password: PASSWORD })
      .expect(200);

    const cookies = res.headers['set-cookie'] as unknown as string[];
    trainerCookie = cookies.find((c: string) => c.startsWith('access_token='));
    expect(trainerCookie).toBeDefined();
  });

  it('Step 2c: Trainee login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TRAINEE_EMAIL, password: PASSWORD })
      .expect(200);

    const cookies = res.headers['set-cookie'] as unknown as string[];
    traineeCookie = cookies.find((c: string) => c.startsWith('access_token='));
    expect(traineeCookie).toBeDefined();
  });

  // ─── Step 3: Trainer Creates Course (must be DRAFT) ──────────────────────────

  it('Step 3: Trainer creates course — verifies DRAFT status', async () => {
    // Ensure a category exists
    let cat = await prisma.courseCategory.findFirst();
    if (!cat) {
      cat = await prisma.courseCategory.create({ data: { name: 'E2E Test Category' } });
    }

    const res = await request(app.getHttpServer())
      .post('/api/v1/courses')
      .set('Cookie', trainerCookie)
      .send({
        title: `E2E Test Course ${Date.now()}`,
        description: 'An E2E test course',
        difficulty: 'beginner',
        categoryId: cat.id,
        durationMinutes: 60,
      })
      .expect(201);

    courseId = res.body.id;
    expect(res.body.status).toBe('draft');
  });

  // ─── Step 4: Add Module ───────────────────────────────────────────────────────

  it('Step 4: Trainer adds module to course', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/courses/${courseId}/modules`)
      .set('Cookie', trainerCookie)
      .send({ title: 'Introduction Module', sequenceOrder: 1 })
      .expect(201);

    moduleId = res.body.id;
    expect(moduleId).toBeDefined();
  });

  // ─── Step 5: Submit for Approval ──────────────────────────────────────────────

  it('Step 5: Trainer submits course for approval → pending_approval', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/courses/${courseId}/submit-for-approval`)
      .set('Cookie', trainerCookie)
      .expect(200);

    expect(res.body.status).toBe('pending_approval');
  });

  // ─── Step 6: Admin Approves ───────────────────────────────────────────────────

  it('Step 6: Admin approves course → published', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/courses/${courseId}/approve`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.body.status).toBe('published');
  });

  // ─── Step 7: Trainee Enrolls ──────────────────────────────────────────────────

  it('Step 7: Trainee enrolls in published course', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/courses/enroll')
      .set('Cookie', traineeCookie)
      .send({ courseId })
      .expect(201);

    expect(res.body.status).toBe('started');
    expect(res.body.courseId).toBe(courseId);
  });

  it('Step 7b: Trainee cannot double-enroll (ConflictException → 409)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/courses/enroll')
      .set('Cookie', traineeCookie)
      .send({ courseId })
      .expect(409);
  });

  // ─── Security Checks ──────────────────────────────────────────────────────────

  it('Security: Trainee cannot approve a course (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/courses/${courseId}/approve`)
      .set('Cookie', traineeCookie)
      .expect(403);
  });

  it('Security: Unauthenticated request cannot create course (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/courses')
      .send({ title: 'Hack', description: 'No auth', difficulty: 'beginner' })
      .expect(401);
  });
});
