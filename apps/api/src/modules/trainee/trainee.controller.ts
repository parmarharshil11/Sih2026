import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TraineeService } from './trainee.service';
import { UpdateTraineeProfileDto } from './dto/update-trainee-profile.dto';
import { CreateInterestDto } from './dto/create-interest.dto';
import { CreateWorkExperienceDto } from './dto/create-work-experience.dto';
import { CreateQualificationDto } from './dto/create-qualification.dto';

@UseGuards(JwtAuthGuard)
@Controller('trainee')
export class TraineeController {
  constructor(private readonly traineeService: TraineeService) {}

  @Get('profile')
  getProfile(@CurrentUser('id') userId: string) {
    return this.traineeService.getProfile(userId);
  }

  @Patch('profile')
  updateProfile(@CurrentUser('id') userId: string, @Body() data: UpdateTraineeProfileDto) {
    return this.traineeService.updateProfile(userId, data);
  }

  @Post('interests')
  addInterest(@CurrentUser('id') userId: string, @Body() data: CreateInterestDto) {
    return this.traineeService.addInterest(userId, data);
  }

  @Post('work-experience')
  addWorkExperience(@CurrentUser('id') userId: string, @Body() data: CreateWorkExperienceDto) {
    return this.traineeService.addWorkExperience(userId, data);
  }

  @Post('qualifications')
  addQualification(@CurrentUser('id') userId: string, @Body() data: CreateQualificationDto) {
    return this.traineeService.addQualification(userId, data);
  }
}
