import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateAvailabilityDto } from './create-availability.dto';

export class BulkCreateAvailabilityDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityDto)
  windows: CreateAvailabilityDto[];
}
