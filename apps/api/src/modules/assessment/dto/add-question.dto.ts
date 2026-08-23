import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType, Difficulty } from '@repo/db';

export class CreateOptionDto {
  @IsString()
  @IsNotEmpty()
  optionText: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class AddQuestionDto {
  @IsEnum(QuestionType)
  questionType: QuestionType;

  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @IsInt()
  @Min(1)
  points: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[];
}
