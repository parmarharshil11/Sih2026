import {
  IsString,
  IsNotEmpty,
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
import { Difficulty } from '@repo/db';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  @Transform(({ value }) => sanitizeString(value))
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  @Transform(({ value }) => sanitizeString(value))
  description: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;

  @IsInt()
  @Min(0)
  @Max(100000)
  @IsOptional()
  durationMinutes?: number;

  @IsString()
  @IsUrl()
  @MaxLength(2048)
  @IsOptional()
  thumbnailUrl?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  skillIds?: string[];
}
