import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from '@repo/db';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  @IsNotEmpty()
  status: UserStatus;
}
