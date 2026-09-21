import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { FindDoctorsQueryDto } from './dto/find-doctors-query.dto';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  findAll(@Query() query: FindDoctorsQueryDto) {
    return this.doctorsService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.doctorsService.findById(id);
  }
}
