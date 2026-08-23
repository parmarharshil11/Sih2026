import { IsString, IsOptional, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeString } from '../../../common/utils/sanitize';

export class UpdateTrainerProfileDto {
  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  @Transform(({ value }) => sanitizeString(value))
  bio?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(60)
  yearsExperience?: number;
}
