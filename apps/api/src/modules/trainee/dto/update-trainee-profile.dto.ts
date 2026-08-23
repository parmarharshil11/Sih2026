import { IsString, IsOptional, IsUUID, IsNumber, Min, Max, IsUrl, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeString } from '../../../common/utils/sanitize';

export class UpdateTraineeProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => sanitizeString(value))
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => sanitizeString(value))
  bio?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(2048)
  profilePhotoUrl?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  profileCompletionPct?: number;
}
