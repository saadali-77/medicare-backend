import { IsEnum } from 'class-validator';
import { AppointmentStatus } from '../../../generated/prisma';

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;
}
