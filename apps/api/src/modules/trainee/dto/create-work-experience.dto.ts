import { IsString, IsNotEmpty, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeString } from '../../../common/utils/sanitize';

export class CreateWorkExperienceDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => sanitizeString(value))
  organization: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => sanitizeString(value))
  role: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: string | Date;

  @IsOptional()
  @IsDateString()
  endDate?: string | Date;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => sanitizeString(value))
  description?: string;
}
