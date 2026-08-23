import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeString } from '../../../common/utils/sanitize';
import { Difficulty, CourseStatus } from '@repo/db';

export class UpdateCourseDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(200)
  @Transform(({ value }) => sanitizeString(value))
  title?: string;

  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(5000)
  @Transform(({ value }) => sanitizeString(value))
  description?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;

  @IsInt()
  @Min(0)
  @Max(100000)
  @IsOptional()
  durationMinutes?: number;

  @IsString()
  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  thumbnailUrl?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  skillIds?: string[];
}

export class ReviewCourseDto {
  @IsEnum(CourseStatus)
  status: CourseStatus;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  @Transform(({ value }) => sanitizeString(value))
  reason?: string;
}
