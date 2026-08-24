if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://ccuser:ccpassword@localhost:5432/capacityconnect';
}

import { PrismaClient, UserStatus, VerificationStatus, CourseStatus, Difficulty, ResourceType, EnrollmentStatus, ProgressStatus, AssessmentType, QuestionType, GapClassification } from '../generated/client/index.js';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Capacity Connect Database Seeding...');

  // 1. Clean Database (in reverse dependency order)
  console.log('🧹 Cleaning existing data...');
  await prisma.certificateVerification.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.trainerMatchScore.deleteMany();
  await prisma.assessmentAnswer.deleteMany();
  await prisma.assessmentAttempt.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.assessmentQuestion.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.courseProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.courseResource.deleteMany();
  await prisma.courseModule.deleteMany();
  await prisma.coursePrerequisite.deleteMany();
  await prisma.courseSkill.deleteMany();
  await prisma.course.deleteMany();
  await prisma.courseCategory.deleteMany();
  await prisma.trainerAvailability.deleteMany();
  await prisma.trainerExpertise.deleteMany();
  await prisma.skillGapAnalysis.deleteMany();
  await prisma.traineeCompetency.deleteMany();
  await prisma.competencySkill.deleteMany();
  await prisma.competency.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.proficiencyLevel.deleteMany();
  await prisma.qualification.deleteMany();
  await prisma.workExperience.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.externalCertificate.deleteMany();
  await prisma.traineeProfile.deleteMany();
  await prisma.trainerProfile.deleteMany();
  await prisma.department.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash default password
  const defaultPassword = 'Password123!';
  const passwordHash = await argon2.hash(defaultPassword);

  // 3. Roles & Permissions
  console.log('🔐 Seeding Roles & Permissions...');
  const roleAdmin = await prisma.role.create({ data: { name: 'admin' } });
  const roleTrainer = await prisma.role.create({ data: { name: 'trainer' } });
  const roleTrainee = await prisma.role.create({ data: { name: 'trainee' } });

  // 4. Departments
  console.log('🏢 Seeding Departments...');
  const deptEng = await prisma.department.create({ data: { name: 'Engineering', description: 'Software Architecture & Infrastructure' } });
  const deptFin = await prisma.department.create({ data: { name: 'Finance', description: 'Financial Planning, Risk & Audit' } });
  const deptHR = await prisma.department.create({ data: { name: 'Human Resources', description: 'Talent Acquisition & Organizational Development' } });
  const deptOps = await prisma.department.create({ data: { name: 'Operations', description: 'Logistics, Supply Chain & Delivery' } });

  // 5. Proficiency Levels
  console.log('📊 Seeding Proficiency Levels...');
  const levels = [
    { levelNumber: 1, label: 'Novice' },
    { levelNumber: 2, label: 'Beginner' },
    { levelNumber: 3, label: 'Intermediate' },
    { levelNumber: 4, label: 'Advanced' },
    { levelNumber: 5, label: 'Expert' },
  ];
  for (const l of levels) {
    await prisma.proficiencyLevel.create({ data: l });
  }

  // 6. Skills & Competencies
  console.log('💡 Seeding Skills & Competency Framework...');
  const skillCloud = await prisma.skill.create({ data: { name: 'Cloud Architecture (AWS/GCP)', category: 'Technology', description: 'Designing scalable cloud infrastructure' } });
  const skillFullStack = await prisma.skill.create({ data: { name: 'Full-Stack Development (React/NestJS)', category: 'Technology', description: 'Modern web app engineering' } });
  const skillData = await prisma.skill.create({ data: { name: 'Data Engineering & Analytics', category: 'Data', description: 'Data pipelines and SQL/Python analytics' } });
  const skillSecurity = await prisma.skill.create({ data: { name: 'Cybersecurity & Auditing', category: 'Security', description: 'Information security defense and compliance' } });
  const skillFinance = await prisma.skill.create({ data: { name: 'Financial Risk Modeling', category: 'Finance', description: 'Quantitative risk assessment and modeling' } });
  const skillAgile = await prisma.skill.create({ data: { name: 'Agile Project Delivery', category: 'Management', description: 'Scrum and Kanban execution' } });

  const compTechLeadership = await prisma.competency.create({
    data: {
      name: 'Technical Architecture Leadership',
      category: 'Technology',
      description: 'Mastery over end-to-end system design and cloud deployments',
    },
  });
  const compDataDriven = await prisma.competency.create({
    data: {
      name: 'Data-Driven Financial Strategy',
      category: 'Finance',
      description: 'Leveraging data analytics for enterprise risk management',
    },
  });

  await prisma.competencySkill.createMany({
    data: [
      { competencyId: compTechLeadership.id, skillId: skillCloud.id },
      { competencyId: compTechLeadership.id, skillId: skillFullStack.id },
      { competencyId: compDataDriven.id, skillId: skillData.id },
      { competencyId: compDataDriven.id, skillId: skillFinance.id },
    ],
  });

  // 7. Users & Profiles
  console.log('👤 Seeding Users & Profiles...');

  // 7.1 Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@capacityconnect.org',
      passwordHash,
      status: UserStatus.active,
      emailVerifiedAt: new Date(),
      userRoles: { create: { roleId: roleAdmin.id } },
    },
  });

  // 7.2 Trainers
  const trainerData = [
    { email: 'trainer.devops@capacityconnect.org', name: 'Dr. Sarah Connor', deptId: deptEng.id, exp: 12, rating: 4.9 },
    { email: 'trainer.finance@capacityconnect.org', name: 'Marcus Sterling', deptId: deptFin.id, exp: 9, rating: 4.8 },
    { email: 'trainer.agile@capacityconnect.org', name: 'Elena Rostova', deptId: deptHR.id, exp: 7, rating: 4.7 },
    { email: 'trainer.security@capacityconnect.org', name: 'Vikram Patel', deptId: deptEng.id, exp: 11, rating: 4.95 },
    { email: 'trainer.data@capacityconnect.org', name: 'Amara Okafor', deptId: deptOps.id, exp: 8, rating: 4.85 },
  ];

  const trainers: any[] = [];
  for (const t of trainerData) {
    const user = await prisma.user.create({
      data: {
        email: t.email,
        passwordHash,
        status: UserStatus.active,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: roleTrainer.id } },
      },
    });

    const profile = await prisma.trainerProfile.create({
      data: {
        userId: user.id,
        departmentId: t.deptId,
        bio: `${t.name} is a senior industry specialist with over ${t.exp} years of expertise in enterprise building.`,
        verificationStatus: VerificationStatus.verified,
        yearsExperience: t.exp,
        trainerRatingAvg: t.rating,
      },
    });

    // Add expertise
    await prisma.trainerExpertise.create({
      data: {
        trainerProfileId: profile.id,
        skillId: skillCloud.id,
        proficiencyLevel: 5,
        yearsExperience: t.exp,
        certified: true,
      },
    });

    trainers.push({ user, profile });
  }

  // 7.3 Trainees
  const trainees: any[] = [];
  for (let i = 1; i <= 15; i++) {
    const email = `trainee${i}@capacityconnect.org`;
    const deptId = i % 2 === 0 ? deptEng.id : i % 3 === 0 ? deptFin.id : deptHR.id;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        status: UserStatus.active,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: roleTrainee.id } },
      },
    });

    const profile = await prisma.traineeProfile.create({
      data: {
        userId: user.id,
        departmentId: deptId,
        headline: `Software Professional ${i}`,
        bio: `Eager learner pursuing technical and operational capacity growth.`,
        profileCompletionPct: 85,
      },
    });

    // Add trainee competency & gap analysis
    const comp = await prisma.traineeCompetency.create({
      data: {
        traineeProfileId: profile.id,
        competencyId: compTechLeadership.id,
        currentLevel: i % 3 + 1,
        requiredLevel: 4,
        targetLevel: 4,
        assessmentScore: 65.5,
        lastAssessedAt: new Date(),
      },
    });

    const gapVal = 4 - comp.currentLevel;
    await prisma.skillGapAnalysis.create({
      data: {
        traineeCompetencyId: comp.id,
        gapValue: gapVal,
        gapClassification: gapVal >= 3 ? GapClassification.critical : gapVal === 2 ? GapClassification.high : GapClassification.low,
      },
    });

    trainees.push({ user, profile });
  }

  // 8. Categories & Courses
  console.log('📚 Seeding Courses, Modules & Resources...');
  const catTech = await prisma.courseCategory.create({ data: { name: 'Cloud & Software Engineering' } });
  const catData = await prisma.courseCategory.create({ data: { name: 'Data & Financial Analytics' } });
  const catLeadership = await prisma.courseCategory.create({ data: { name: 'Management & Delivery' } });

  const course1 = await prisma.course.create({
    data: {
      title: 'Cloud-Native Microservices Architecture with NestJS & AWS',
      slug: 'cloud-native-microservices-nestjs-aws',
      description: 'Master containerized microservices, distributed logging, and AWS ECS deployments.',
      trainerId: trainers[0].profile.id,
      categoryId: catTech.id,
      difficulty: Difficulty.intermediate,
      durationMinutes: 480,
      status: CourseStatus.published,
      approvedById: adminUser.id,
      approvedAt: new Date(),
      courseSkills: { create: [{ skillId: skillCloud.id }, { skillId: skillFullStack.id }] },
    },
  });

  const course2 = await prisma.course.create({
    data: {
      title: 'Enterprise Cyber Defense & Zero-Trust Auditing',
      slug: 'enterprise-cyber-defense-zero-trust',
      description: 'Learn modern network auditing, RBAC controls, and automated incident response.',
      trainerId: trainers[3].profile.id,
      categoryId: catTech.id,
      difficulty: Difficulty.advanced,
      durationMinutes: 360,
      status: CourseStatus.published,
      approvedById: adminUser.id,
      approvedAt: new Date(),
      courseSkills: { create: [{ skillId: skillSecurity.id }] },
    },
  });

  const course3 = await prisma.course.create({
    data: {
      title: 'Financial Analytics & Predictive Modeling with Python',
      slug: 'financial-analytics-predictive-modeling',
      description: 'Practical financial modeling using pandas, NumPy, and regression analysis.',
      trainerId: trainers[1].profile.id,
      categoryId: catData.id,
      difficulty: Difficulty.beginner,
      durationMinutes: 300,
      status: CourseStatus.published,
      approvedById: adminUser.id,
      approvedAt: new Date(),
      courseSkills: { create: [{ skillId: skillData.id }, { skillId: skillFinance.id }] },
    },
  });

  // Modules & Resources
  const module1 = await prisma.courseModule.create({
    data: {
      courseId: course1.id,
      title: 'Module 1: Microservices Fundamentals & Domain-Driven Design',
      sequenceOrder: 1,
    },
  });

  const module2 = await prisma.courseModule.create({
    data: {
      courseId: course1.id,
      title: 'Module 2: Containerization with Docker & Multi-stage Builds',
      sequenceOrder: 2,
    },
  });

  await prisma.courseResource.create({
    data: {
      moduleId: module1.id,
      type: ResourceType.pdf,
      title: 'Architecture Blueprint PDF',
      storageKey: 'resources/microservices-blueprint.pdf',
      mimeType: 'application/pdf',
      sizeBytes: BigInt(2450000),
      uploadedById: trainers[0].user.id,
    },
  });

  // 9. Assessments & MCQs
  console.log('📝 Seeding Assessment Question Banks...');
  const assessment1 = await prisma.assessment.create({
    data: {
      courseId: course1.id,
      subject: 'Cloud Microservices Final Assessment',
      type: AssessmentType.post_test,
      timeLimitMinutes: 30,
      passScorePct: 70,
      createdById: trainers[0].user.id,
    },
  });

  const q1 = await prisma.assessmentQuestion.create({
    data: {
      assessmentId: assessment1.id,
      questionType: QuestionType.single_mcq,
      questionText: 'Which protocol is primarily used for synchronous high-performance microservices inter-service communication?',
      difficulty: Difficulty.intermediate,
      points: 2,
      options: {
        create: [
          { optionText: 'gRPC (HTTP/2)', isCorrect: true },
          { optionText: 'REST over HTTP/1.1', isCorrect: false },
          { optionText: 'FTP', isCorrect: false },
          { optionText: 'SMTP', isCorrect: false },
        ],
      },
    },
  });

  const q2 = await prisma.assessmentQuestion.create({
    data: {
      assessmentId: assessment1.id,
      questionType: QuestionType.true_false,
      questionText: 'Database-per-service pattern requires all microservices to share a single monolithic SQL schema.',
      difficulty: Difficulty.beginner,
      points: 1,
      options: {
        create: [
          { optionText: 'True', isCorrect: false },
          { optionText: 'False', isCorrect: true },
        ],
      },
    },
  });

  // 10. Enrollments, Progress, Attempts & Certificates
  console.log('🎓 Seeding Enrollments, Progress & QR Certificates...');
  for (let i = 0; i < 5; i++) {
    const trainee = trainees[i];

    const enrollment = await prisma.enrollment.create({
      data: {
        traineeId: trainee.profile.id,
        courseId: course1.id,
        status: i < 3 ? EnrollmentStatus.completed : EnrollmentStatus.in_progress,
        completedAt: i < 3 ? new Date() : null,
      },
    });

    await prisma.courseProgress.create({
      data: {
        enrollmentId: enrollment.id,
        moduleId: module1.id,
        status: ProgressStatus.completed,
        progressPct: 100,
      },
    });

    if (i < 3) {
      // Completed assessment attempt
      const attempt = await prisma.assessmentAttempt.create({
        data: {
          assessmentId: assessment1.id,
          traineeId: trainee.profile.id,
          startedAt: new Date(Date.now() - 3600000),
          submittedAt: new Date(),
          scorePct: 85.0,
          passed: true,
          attemptNumber: 1,
        },
      });

      // Issue Certificate
      const certNumber = `CC-20260823-000${i + 1}`;
      const token = uuidv4();
      const verifyUrl = `http://localhost:3000/certificates/verify/${token}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl);

      await prisma.certificate.create({
        data: {
          enrollmentId: enrollment.id,
          certificateNumber: certNumber,
          traineeId: trainee.profile.id,
          courseId: course1.id,
          trainerId: trainers[0].profile.id,
          issuedAt: new Date(),
          qrPayloadUrl: qrDataUrl,
          verificationToken: token,
        },
      });
    }
  }

  // 11. Trainer Match Scores
  console.log('🎯 Seeding Trainer Match Scores...');
  await prisma.trainerMatchScore.create({
    data: {
      traineeId: trainees[0].profile.id,
      trainerId: trainers[0].profile.id,
      courseId: course1.id,
      matchScore: 0.945,
      reasons: [
        '95% Skill Gap Alignment in Cloud Architecture',
        'Trainer has 12 years of hands-on engineering experience',
        'Schedule overlaps with Trainee availability',
      ],
    },
  });

  // 12. Audit Logs
  console.log('🛡️ Seeding Audit Logs...');
  await prisma.auditLog.createMany({
    data: [
      { actorUserId: adminUser.id, action: 'course.approved', entityType: 'Course', entityId: course1.id, ipAddress: '127.0.0.1', metadata: { title: course1.title } },
      { actorUserId: adminUser.id, action: 'admin.user_status_updated', entityType: 'User', entityId: trainers[0].user.id, ipAddress: '127.0.0.1', metadata: { newStatus: 'active' } },
    ],
  });

  console.log('\n======================================================');
  console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.log('\n🔐 DEMO CREDENTIALS:');
  console.log('------------------------------------------------------');
  console.log('👑 ADMIN:    admin@capacityconnect.org  / Password123!');
  console.log('👨‍🏫 TRAINER:  trainer.devops@capacityconnect.org / Password123!');
  console.log('👨‍🎓 TRAINEE:  trainee1@capacityconnect.org / Password123!');
  console.log('------------------------------------------------------\n');
}

main()
  .catch((e) => {
    console.error('❌ Error Seeding Database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
