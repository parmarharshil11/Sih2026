import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TraineeModule } from './modules/trainee/trainee.module';
import { TrainerModule } from './modules/trainer/trainer.module';
import { AdminModule } from './modules/admin/admin.module';
import { CompetencyModule } from './modules/competency/competency.module';
import { MatchingModule } from './modules/matching/matching.module';
import { CourseModule } from './modules/course/course.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { CertificateModule } from './modules/certificate/certificate.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import authConfig from './config/auth.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig],
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60 * 1000, limit: 100 },
      { name: 'auth', ttl: 15 * 60 * 1000, limit: 5 },
      { name: 'register', ttl: 60 * 60 * 1000, limit: 3 },
      { name: 'ai', ttl: 60 * 1000, limit: 10 },
    ]),
    PrismaModule,
    AuthModule,
    TraineeModule,
    TrainerModule,
    AdminModule,
    CompetencyModule,
    MatchingModule,
    // ─── Phase 9: Courses, Assessments & Certification ──────────────────────────
    CourseModule,
    AssessmentModule,
    CertificateModule,
    // ─── Phase 10 & 11: Analytics and AI ─────────────────────────────────────────
    AnalyticsModule,
    AiModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }) },
  ],
})
export class AppModule {}
