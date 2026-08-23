import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeString } from '../../../common/utils/sanitize';

export class CreateSkillDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => sanitizeString(value))
  name: string;

  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => sanitizeString(value))
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => sanitizeString(value))
  description?: string;
}
