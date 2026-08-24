import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TrainerService } from './trainer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateTrainerProfileDto } from './dto/update-trainer-profile.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { CreateExpertiseDto } from './dto/create-expertise.dto';

@Controller('api/v1/trainer')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrainerController {
  constructor(private readonly trainerService: TrainerService) {}

  @Get('profile')
  @Roles('trainer')
  async getProfile(@CurrentUser('id') userId: string): Promise<any> {
    return this.trainerService.getProfile(userId);
  }

  @Patch('profile')
  @Roles('trainer')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateTrainerProfileDto: UpdateTrainerProfileDto,
  ): Promise<any> {
    return this.trainerService.updateProfile(userId, updateTrainerProfileDto);
  }

  @Post('availability')
  @Roles('trainer')
  addAvailability(
    @CurrentUser('id') userId: string,
    @Body() createAvailabilityDto: CreateAvailabilityDto,
  ) {
    return this.trainerService.addAvailability(userId, createAvailabilityDto);
  }

  @Delete('availability/:id')
  @Roles('trainer')
  deleteAvailability(
    @CurrentUser('id') userId: string,
    @Param('id') availabilityId: string,
  ) {
    return this.trainerService.deleteAvailability(userId, availabilityId);
  }

  @Post('expertise')
  @Roles('trainer')
  addExpertise(
    @CurrentUser('id') userId: string,
    @Body() createExpertiseDto: CreateExpertiseDto,
  ) {
    return this.trainerService.addExpertise(userId, createExpertiseDto);
  }

  @Delete('expertise/:id')
  @Roles('trainer')
  deleteExpertise(
    @CurrentUser('id') userId: string,
    @Param('id') expertiseId: string,
  ) {
    return this.trainerService.deleteExpertise(userId, expertiseId);
  }
}
