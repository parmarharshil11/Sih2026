import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsIn,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,72}$/, {
    message: 'Password must contain at least one uppercase, one lowercase, one digit, and one special character',
  })
  password: string;

  @IsString()
  @IsIn(['trainee', 'trainer'])
  role: 'trainee' | 'trainer';
}
