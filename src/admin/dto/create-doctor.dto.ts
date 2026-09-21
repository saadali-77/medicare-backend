import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsStrongPassword,
  IsUrl,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  @Length(2, 50)
  name: string;

  @IsEmail()
  email: string;

  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password: string;

  @IsOptional()
  @IsString()
  @Length(10, 15)
  phone?: string;

  @IsString()
  specialization: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  experience?: number;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;
}
