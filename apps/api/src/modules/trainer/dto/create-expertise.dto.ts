import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateExpertiseDto {
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @IsNumber()
  @IsNotEmpty()
  proficiencyLevel: number;

  @IsNumber()
  @IsOptional()
  yearsExperience?: number;

  @IsBoolean()
  @IsOptional()
  certified?: boolean;
}
