import { Type } from 'class-transformer';
import { IsDateString, IsInt } from 'class-validator';

export class GetSlotsQueryDto {
  @Type(() => Number)
  @IsInt()
  doctorId: number;

  @IsDateString()
  date: string;
}
