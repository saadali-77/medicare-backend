import { IsBoolean } from 'class-validator';

export class UpdateDoctorStatusDto {
  @IsBoolean()
  isAvailable: boolean;
}
