import { IsString, IsOptional, IsUUID, IsNumber, Min, Max, IsUrl } from 'class-validator';

export class UpdateTraineeProfileDto {
  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
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
