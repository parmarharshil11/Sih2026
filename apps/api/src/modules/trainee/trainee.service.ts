import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTraineeProfileDto } from './dto/update-trainee-profile.dto';
import { CreateInterestDto } from './dto/create-interest.dto';
import { CreateWorkExperienceDto } from './dto/create-work-experience.dto';
import { CreateQualificationDto } from './dto/create-qualification.dto';

@Injectable()
export class TraineeService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.traineeProfile.findUnique({
      where: { userId },
      include: {
        department: true,
        interests: true,
        workExperiences: true,
        qualifications: true,
      },
    });
    if (!profile) {
      throw new NotFoundException('Trainee profile not found');
    }
    return profile;
  }

  async updateProfile(userId: string, data: UpdateTraineeProfileDto) {
    const profile = await this.prisma.traineeProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Trainee profile not found');
    }
    return this.prisma.traineeProfile.update({
      where: { id: profile.id },
      data,
    });
  }

  async addInterest(userId: string, data: CreateInterestDto) {
    const profile = await this.prisma.traineeProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Trainee profile not found');
    
    return this.prisma.interest.create({
      data: {
        ...data,
        traineeProfileId: profile.id,
      },
    });
  }

  async addWorkExperience(userId: string, data: CreateWorkExperienceDto) {
    const profile = await this.prisma.traineeProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Trainee profile not found');
    
    return this.prisma.workExperience.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        traineeProfileId: profile.id,
      },
    });
  }

  async addQualification(userId: string, data: CreateQualificationDto) {
    const profile = await this.prisma.traineeProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Trainee profile not found');
    
    return this.prisma.qualification.create({
      data: {
        ...data,
        profileOwnerId: profile.id,
        profileOwnerType: 'trainee',
      },
    });
  }
}
