import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, Min, Max, IsUUID } from 'class-validator';

export class CreateExpertiseDto {
  @IsUUID()
  @IsNotEmpty()
  skillId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(5)
  proficiencyLevel: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(60)
  yearsExperience?: number;

  @IsBoolean()
  @IsOptional()
  certified?: boolean;
}
