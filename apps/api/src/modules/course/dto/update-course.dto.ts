import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  IsUUID,
} from 'class-validator';
import { Difficulty, CourseStatus } from '@repo/db';

export class UpdateCourseDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;

  @IsInt()
  @Min(0)
  @IsOptional()
  durationMinutes?: number;

  @IsString()
  @IsOptional()
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
  reason?: string;
}
