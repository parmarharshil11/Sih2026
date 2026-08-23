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

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtCookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestAdminController],
    }).compile();

    app = moduleFixture.createNestApplication();
    const cookieParser = require('cookie-parser');
    app.use(cookieParser());
    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
    await prisma.role.upsert({ where: { name: 'trainee' }, update: {}, create: { name: 'trainee' } });
    await prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin' } });
    await prisma.user.deleteMany({ where: { email: 'rbac-test@example.com' } });
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/auth/register (POST)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'rbac-test@example.com', password: 'password123', role: 'trainee' })
      .expect(201);
    
    const user = await prisma.user.findUnique({ where: { email: 'rbac-test@example.com' } });
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'active', emailVerifiedAt: new Date(), emailVerificationToken: null }
    });
  });

  it('/api/v1/auth/login (POST)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'rbac-test@example.com', password: 'password123' })
      .expect(200);
      
    const cookies = res.headers['set-cookie'] as unknown as string[];
    jwtCookie = cookies.find((c: string) => c.startsWith('access_token='));
    expect(jwtCookie).toBeDefined();
  });

  it('/test-admin (GET) - Should return 403 for trainee despite client attempts', async () => {
    const res = await request(app.getHttpServer())
      .get('/test-admin')
      .set('Cookie', jwtCookie)
      .send({ role: 'admin', roles: ['admin'] }) // Try to forge roles in body
      .expect(403);
      
    expect(res.body.error.message).toBe('Insufficient role');
  });
});
