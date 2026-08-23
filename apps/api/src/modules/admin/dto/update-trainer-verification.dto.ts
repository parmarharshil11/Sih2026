import { IsEnum, IsNotEmpty } from 'class-validator';
import { VerificationStatus } from '@repo/db';

export class UpdateTrainerVerificationDto {
  @IsEnum(VerificationStatus)
  @IsNotEmpty()
  status: VerificationStatus;
}
