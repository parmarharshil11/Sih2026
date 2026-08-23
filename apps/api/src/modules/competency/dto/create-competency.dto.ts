import { IsString, IsOptional, IsArray, MinLength } from 'class-validator';  
export class CreateCompetencyDto { @IsString() @MinLength(2) name: string; @IsString() category: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsArray() @IsString({ each: true }) skillIds?: string[]; } 
