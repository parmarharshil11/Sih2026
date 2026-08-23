import { IsString, IsInt, Min, Max, IsOptional, IsUrl } from 'class-validator';  
  
export class UpsertTraineeCompetencyDto {  
  @IsString() competencyId: string;  
  @IsInt() @Min(1) @Max(5) currentLevel: number;  
  @IsInt() @Min(1) @Max(5) requiredLevel: number;  
  @IsInt() @Min(1) @Max(5) targetLevel: number;  
  @IsOptional() @IsUrl() evidenceUrl?: string;  
} 
