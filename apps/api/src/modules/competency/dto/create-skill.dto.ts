import { IsString, IsOptional, MinLength } from 'class-validator';  
export class CreateSkillDto { @IsString() @MinLength(2) name: string; @IsString() category: string; @IsOptional() @IsString() description?: string; } 
