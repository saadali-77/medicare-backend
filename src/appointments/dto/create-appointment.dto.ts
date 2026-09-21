import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  doctorId: number;

  @IsDateString()
  appointmentDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}