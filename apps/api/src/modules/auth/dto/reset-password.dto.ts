import { IsString, MinLength, MaxLength, IsUUID, Matches } from 'class-validator';
export class ResetPasswordDto {
  @IsUUID(4)
  @MaxLength(36)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,72}$/, {
    message: 'Password must contain at least one uppercase, one lowercase, one digit, and one special character',
  })
  password: string;
}
