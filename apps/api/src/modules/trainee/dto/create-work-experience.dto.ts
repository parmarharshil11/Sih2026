import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateWorkExperienceDto {
  @IsNotEmpty()
  @IsString()
  organization: string;

  @IsNotEmpty()
  @IsString()
  role: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: string | Date;

  @IsOptional()
  @IsDateString()
  endDate?: string | Date;

  @IsOptional()
  @IsString()
  description?: string;
}
