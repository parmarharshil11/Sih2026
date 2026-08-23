import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTrainerProfileDto } from './dto/update-trainer-profile.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { CreateExpertiseDto } from './dto/create-expertise.dto';

@Injectable()
export class TrainerService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<any> {
    const profile = await this.prisma.trainerProfile.findUnique({
      where: { userId },
      include: {
        expertise: { include: { skill: true } },
        availability: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Trainer profile not found');
    }

    return profile;
  }

  async updateProfile(userId: string, data: UpdateTrainerProfileDto): Promise<any> {
    return this.prisma.trainerProfile.update({
      where: { userId },
      data,
    });
  }

  async addAvailability(userId: string, data: CreateAvailabilityDto) {
    const profile = await this.getProfile(userId);
    return this.prisma.trainerAvailability.create({
      data: {
        ...data,
        trainerProfileId: profile.id,
      },
    });
  }

  async addExpertise(userId: string, data: CreateExpertiseDto) {
    const profile = await this.getProfile(userId);
    return this.prisma.trainerExpertise.create({
      data: {
        ...data,
        trainerProfileId: profile.id,
      },
    });
  }

  async deleteAvailability(userId: string, availabilityId: string) {
    const profile = await this.getProfile(userId);
    const availability = await this.prisma.trainerAvailability.findUnique({
      where: { id: availabilityId },
    });

    if (!availability || availability.trainerProfileId !== profile.id) {
      throw new NotFoundException('Availability not found or does not belong to you');
    }

    return this.prisma.trainerAvailability.delete({
      where: { id: availabilityId },
    });
  }

  async deleteExpertise(userId: string, expertiseId: string) {
    const profile = await this.getProfile(userId);
    const expertise = await this.prisma.trainerExpertise.findUnique({
      where: { id: expertiseId },
    });

    if (!expertise || expertise.trainerProfileId !== profile.id) {
      throw new NotFoundException('Expertise not found or does not belong to you');
    }

    return this.prisma.trainerExpertise.delete({
      where: { id: expertiseId },
    });
  }
}
