import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeString } from '../../../common/utils/sanitize';

export class CreateQualificationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => sanitizeString(value))
  degree: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => sanitizeString(value))
  institution: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @IsOptional()
  @IsString()
  @IsUrl()
  documentUrl?: string;
}
