import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateTrainerProfileDto {
  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsNumber()
  @IsOptional()
  yearsExperience?: number;
}
