import { IsUUID, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class UpdateProgressDto {
  @IsUUID()
  @IsNotEmpty()
  moduleId: string;

  @IsInt()
  @Min(0)
  @Max(100)
  progressPct: number;
}
