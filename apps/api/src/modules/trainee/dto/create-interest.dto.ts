import { IsString, IsNotEmpty } from 'class-validator';

export class CreateInterestDto {
  @IsNotEmpty()
  @IsString()
  interestName: string;
}
