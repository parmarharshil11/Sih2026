import { IsString, IsNotEmpty, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeString } from '../../../common/utils/sanitize';

export class CreateModuleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(300)
  @Transform(({ value }) => sanitizeString(value))
  title: string;

  @IsInt()
  @Min(1)
  @Max(200)
  sequenceOrder: number;
}

export class UpdateModuleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(300)
  @Transform(({ value }) => sanitizeString(value))
  title?: string;

  @IsInt()
  @Min(1)
  @Max(200)
  sequenceOrder?: number;
}
