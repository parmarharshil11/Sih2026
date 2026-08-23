import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeString } from '../../../common/utils/sanitize';

export class ExplainSkillGapDto {
  @IsUUID()
  @IsNotEmpty()
  skillGapId: string;
}

export class RecommendTrainersDto {
  @IsUUID()
  @IsNotEmpty()
  traineeId: string;
}

export class DraftCourseOutlineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => sanitizeString(value))
  topic: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  @Transform(({ value }) => sanitizeString(value))
  targetAudience?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Transform(({ value }) => sanitizeString(value))
  difficulty?: string;
}
