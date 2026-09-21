import { IsOptional, IsString, Length } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
