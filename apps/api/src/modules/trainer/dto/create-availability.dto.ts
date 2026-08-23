import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateAvailabilityDto {
  @IsNumber()
  @IsNotEmpty()
  dayOfWeek: number;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsString()
  @IsNotEmpty()
  timezone: string;
}
