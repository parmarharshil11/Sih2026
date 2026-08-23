import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Security hardening (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('SQL Injection Prevention & Validation', () => {
    it('should sanitize input and reject invalid types on GET /api/v1/certificates/:id', () => {
      // Testing IDOR + type checking (UUID validation)
      return request(app.getHttpServer())
        .get('/api/v1/certificates/1\' OR \'1\'=\'1')
        .expect(400);
    });
  });

  describe('JWT Tampering', () => {
    it('should reject tampered JWT tokens', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.tamperedSignature')
        .expect(401);
    });
  });

  describe('Global Exception Filter (Information Leakage)', () => {
    it('should not leak Prisma P2002 details', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          role: 'trainee'
        })
        .expect((res) => {
          // It might return 400 if validation fails, or 409 if duplicate
          // In either case, it shouldn't contain Prisma strings
          expect(JSON.stringify(res.body)).not.toContain('PrismaClientKnownRequestError');
        });
    });
  });
});
