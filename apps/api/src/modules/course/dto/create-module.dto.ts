import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreateModuleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @Min(1)
  sequenceOrder: number;
}

export class UpdateModuleDto {
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsInt()
  @Min(1)
  sequenceOrder?: number;
}
