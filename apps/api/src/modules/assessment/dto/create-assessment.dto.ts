import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  Max,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeString } from '../../../common/utils/sanitize';
import { AssessmentType } from '@repo/db';

export class CreateAssessmentDto {
  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  @Transform(({ value }) => sanitizeString(value))
  subject: string;

  @IsEnum(AssessmentType)
  type: AssessmentType;

  @IsInt()
  @Min(1)
  @IsOptional()
  timeLimitMinutes?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  passScorePct?: number;

  @IsBoolean()
  @IsOptional()
  randomizeQuestions?: boolean;

  @IsBoolean()
  @IsOptional()
  randomizeOptions?: boolean;
}
