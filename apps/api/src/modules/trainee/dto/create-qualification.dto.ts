import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, IsUrl } from 'class-validator';

export class CreateQualificationDto {
  @IsNotEmpty()
  @IsString()
  degree: string;

  @IsNotEmpty()
  @IsString()
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
