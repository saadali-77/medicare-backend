import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Param, ParseIntPipe, Patch } from '@nestjs/common';

import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { GetSlotsQueryDto } from './dto/get-slots-query.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
  ) {}

  @Post()
  createAppointment(
    @Req() req: any,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.createAppointment(
      req.user.id,
      dto,
    );
  }

  @Get('my')
  getMyAppointments(@Req() req: any) {
    return this.appointmentsService.getMyAppointments(
      req.user.id,
    );
  }

  @Get('slots')
  getAvailableSlots(@Query() query: GetSlotsQueryDto) {
    return this.appointmentsService.getAvailableSlots(query);
  }
@Patch(':id/cancel')
cancelAppointment(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: any,
) {
  return this.appointmentsService.cancelAppointment(
    id,
    req.user.id,
  );
}

}