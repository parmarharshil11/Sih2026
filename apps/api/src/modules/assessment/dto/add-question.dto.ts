import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  Max,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { sanitizeString } from '../../../common/utils/sanitize';
import { QuestionType, Difficulty } from '@repo/db';

export class CreateOptionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  @Transform(({ value }) => sanitizeString(value))
  optionText: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class AddQuestionDto {
  @IsEnum(QuestionType)
  questionType: QuestionType;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(2000)
  @Transform(({ value }) => sanitizeString(value))
  questionText: string;

  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @IsInt()
  @Min(1)
  @Max(100)
  points: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[];
}
