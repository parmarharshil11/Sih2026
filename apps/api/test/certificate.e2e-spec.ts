import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/modules/prisma/prisma.service';
import { EnrollmentStatus } from '@repo/db';

/**
 * E2E: Certificate Issuance & Public Verification Flow
 *
 * Flow: Setup completed enrollment → Issue certificate → Verify via public token endpoint
 *
 * Requires a running PostgreSQL instance.
 */
describe('Certificate Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminCookie: string;
  let traineeCookie: string;

  let enrollmentId: string;
  let certificateToken: string;

  const ADMIN_EMAIL = `cert-admin-${Date.now()}@test.com`;
  const TRAINER_EMAIL = `cert-trainer-${Date.now()}@test.com`;
  const TRAINEE_EMAIL = `cert-trainee-${Date.now()}@test.com`;
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

    // Ensure roles
    await prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin' } });
    await prisma.role.upsert({ where: { name: 'trainer' }, update: {}, create: { name: 'trainer' } });
    await prisma.role.upsert({ where: { name: 'trainee' }, update: {}, create: { name: 'trainee' } });

    // Clean previous test data
    await prisma.user.deleteMany({
      where: { email: { in: [ADMIN_EMAIL, TRAINER_EMAIL, TRAINEE_EMAIL] } },
    });

    // ── Create Users Directly in DB for Speed ──
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    const trainerRole = await prisma.role.findUnique({ where: { name: 'trainer' } });
    const traineeRole = await prisma.role.findUnique({ where: { name: 'trainee' } });
    const argon2 = require('argon2');
    const hash = await argon2.hash(PASSWORD, { type: argon2.argon2id });

    const adminUser = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL, passwordHash: hash, status: 'active',
        emailVerifiedAt: new Date(), emailVerificationToken: null,
        userRoles: { create: { roleId: adminRole.id } },
      },
    });

    const trainerUser = await prisma.user.create({
      data: {
        email: TRAINER_EMAIL, passwordHash: hash, status: 'active',
        emailVerifiedAt: new Date(), emailVerificationToken: null,
        userRoles: { create: { roleId: trainerRole.id } },
      },
    });
    const trainerProfile = await prisma.trainerProfile.upsert({
      where: { userId: trainerUser.id },
      update: {},
      create: { userId: trainerUser.id, bio: 'Cert E2E Trainer', yearsExperience: 5, verificationStatus: 'verified' },
    });

    const traineeUser = await prisma.user.create({
      data: {
        email: TRAINEE_EMAIL, passwordHash: hash, status: 'active',
        emailVerifiedAt: new Date(), emailVerificationToken: null,
        userRoles: { create: { roleId: traineeRole.id } },
      },
    });
    const traineeProfile = await prisma.traineeProfile.upsert({
      where: { userId: traineeUser.id },
      update: {},
      create: { userId: traineeUser.id },
    });

    // Create a course category + published course
    let cat = await prisma.courseCategory.findFirst();
    if (!cat) cat = await prisma.courseCategory.create({ data: { name: 'Cert Test Category' } });

    const course = await prisma.course.create({
      data: {
        title: `Cert E2E Course ${Date.now()}`,
        slug: `cert-e2e-${Date.now()}`,
        description: 'For certificate e2e test',
        difficulty: 'beginner',
        categoryId: cat.id,
        trainerId: trainerProfile.id,
        status: 'published',
        approvedById: adminUser.id,
        approvedAt: new Date(),
      },
    });

    // Create a COMPLETED enrollment directly in DB
    const enrollment = await prisma.enrollment.create({
      data: {
        traineeId: traineeProfile.id,
        courseId: course.id,
        status: EnrollmentStatus.completed,
        completedAt: new Date(),
      },
    });
    enrollmentId = enrollment.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [ADMIN_EMAIL, TRAINER_EMAIL, TRAINEE_EMAIL] } },
    });
    await app.close();
  });

  // ─── Step 1: Login ────────────────────────────────────────────────────────────

  it('Step 1a: Admin login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD })
      .expect(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    adminCookie = cookies.find((c: string) => c.startsWith('access_token='));
    expect(adminCookie).toBeDefined();
  });

  it('Step 1b: Trainee login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TRAINEE_EMAIL, password: PASSWORD })
      .expect(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    traineeCookie = cookies.find((c: string) => c.startsWith('access_token='));
    expect(traineeCookie).toBeDefined();
  });

  // ─── Step 2: Issue Certificate ────────────────────────────────────────────────

  it('Step 2: Admin issues certificate for completed enrollment', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/certificates/issue/${enrollmentId}`)
      .set('Cookie', adminCookie)
      .expect(201);

    expect(res.body).toHaveProperty('certificateNumber');
    expect(res.body.certificateNumber).toMatch(/^CC-\d{8}-[A-Z0-9]{8}$/);
    expect(res.body).toHaveProperty('verificationToken');
    expect(res.body).toHaveProperty('verificationUrl');

    certificateToken = res.body.verificationToken;
  });

  it('Step 2b: Duplicate issuance returns 409', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/certificates/issue/${enrollmentId}`)
      .set('Cookie', adminCookie)
      .expect(409);
  });

  // ─── Step 3: Public Certificate Verification (No Auth Required) ──────────────

  it('Step 3: Public verify endpoint returns valid certificate data — NO auth required', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/certificates/verify/${certificateToken}`)
      // Intentionally NO authentication header/cookie
      .expect(200);

    expect(res.body.valid).toBe(true);
    expect(res.body).toHaveProperty('certificateNumber');
    expect(res.body).toHaveProperty('trainee');
    expect(res.body).toHaveProperty('course');
    expect(res.body).toHaveProperty('trainer');

    // Internal IDs must NOT be exposed
    expect(res.body).not.toHaveProperty('id');
    expect(res.body).not.toHaveProperty('enrollmentId');
  });

  it('Step 3b: Invalid token returns valid=false — NOT a 404 (prevents enumeration)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/certificates/verify/invalid-token-that-does-not-exist')
      .expect(200);

    expect(res.body.valid).toBe(false);
  });

  // ─── Step 4: Trainee Certificate Vault ───────────────────────────────────────

  it('Step 4: Trainee can retrieve their own certificates', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/certificates/my')
      .set('Cookie', traineeCookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('certificateNumber');
  });
});
