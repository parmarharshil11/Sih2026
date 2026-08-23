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
} from 'class-validator';
import { AssessmentType } from '@repo/db';

export class CreateAssessmentDto {
  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsNotEmpty()
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
