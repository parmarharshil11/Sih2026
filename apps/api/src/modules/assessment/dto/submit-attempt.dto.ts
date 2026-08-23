import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class AnswerDto {
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @IsArray()
  @IsUUID('all', { each: true })
  selectedOptionIds: string[];
}

export class SubmitAttemptDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
