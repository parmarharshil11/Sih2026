import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/modules/prisma/prisma.service';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './../src/common/guards/jwt-auth.guard';
import { RolesGuard } from './../src/common/guards/roles.guard';
import { Roles } from './../src/common/decorators/roles.decorator';

@Controller('test-admin')
class TestAdminController {
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getAdminData() {
    return { data: 'admin_only_data' };
  }
}

@Controller('test-trainer')
class TestTrainerController {
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('trainer')
  getTrainerData() {
    return { data: 'trainer_only_data' };
  }
}

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let traineeCookie: string;
  let trainerCookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestAdminController, TestTrainerController],
    }).compile();

    app = moduleFixture.createNestApplication();
    const cookieParser = require('cookie-parser');
    app.use(cookieParser());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    await prisma.role.upsert({ where: { name: 'trainee' }, update: {}, create: { name: 'trainee' } });
    await prisma.role.upsert({ where: { name: 'trainer' }, update: {}, create: { name: 'trainer' } });
    await prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin' } });
    await prisma.user.deleteMany({
      where: { email: { in: ['rbac-test@example.com', 'rbac-trainer@example.com'] } },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: ['rbac-test@example.com', 'rbac-trainer@example.com'] } },
    });
    await app.close();
  });

  // ─── Setup: Register & Activate Test Users ────────────────────────────────────

  it('Register trainee user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'rbac-test@example.com', password: 'password123', role: 'trainee' })
      .expect(201);

    const user = await prisma.user.findUnique({ where: { email: 'rbac-test@example.com' } });
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'active', emailVerifiedAt: new Date(), emailVerificationToken: null },
    });
  });

  it('Register trainer user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'rbac-trainer@example.com', password: 'password123', role: 'trainer' })
      .expect(201);

    const user = await prisma.user.findUnique({ where: { email: 'rbac-trainer@example.com' } });
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'active', emailVerifiedAt: new Date(), emailVerificationToken: null },
    });
  });

  it('Login as trainee', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'rbac-test@example.com', password: 'password123' })
      .expect(200);

    const cookies = res.headers['set-cookie'] as unknown as string[];
    traineeCookie = cookies.find((c: string) => c.startsWith('access_token='));
    expect(traineeCookie).toBeDefined();
  });

  it('Login as trainer', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'rbac-trainer@example.com', password: 'password123' })
      .expect(200);

    const cookies = res.headers['set-cookie'] as unknown as string[];
    trainerCookie = cookies.find((c: string) => c.startsWith('access_token='));
    expect(trainerCookie).toBeDefined();
  });

  // ─── Role Enforcement Tests ───────────────────────────────────────────────────

  it('[Trainee → Admin route] Should return 403 even if body contains role=admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-admin')
      .set('Cookie', traineeCookie)
      .send({ role: 'admin', roles: ['admin'] })
      .expect(403);

    expect(res.body.error.message).toBe('Insufficient role');
  });

  it('[Trainee → Trainer route] Should return 403', async () => {
    await request(app.getHttpServer())
      .get('/test-trainer')
      .set('Cookie', traineeCookie)
      .expect(403);
  });

  it('[Trainer → Admin route] Should return 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-admin')
      .set('Cookie', trainerCookie)
      .expect(403);

    expect(res.body.error.message).toBe('Insufficient role');
  });

  it('[Trainer → Trainer route] Should return 200', async () => {
    await request(app.getHttpServer())
      .get('/test-trainer')
      .set('Cookie', trainerCookie)
      .expect(200);
  });

  it('[Unauthenticated → Protected route] Should return 401', async () => {
    await request(app.getHttpServer())
      .get('/test-admin')
      .expect(401);
  });
});
