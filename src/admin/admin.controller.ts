import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../../generated/prisma';

import { AdminService } from './admin.service';

import { BulkCreateAvailabilityDto } from './dto/bulk-create-availability.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { UpdateDoctorStatusDto } from './dto/update-doctor-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // =========================
  // Dashboard
  // =========================

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // =========================
  // Users
  // =========================

  @Get('users')
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Get('users/:id')
  findUserById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findUserById(id);
  }

  @Patch('users/:id/role')
  updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  // =========================
  // Doctors
  // =========================

  @Post('doctors')
  createDoctor(@Body() dto: CreateDoctorDto) {
    return this.adminService.createDoctor(dto);
  }

  @Get('doctors')
  findAllDoctors() {
    return this.adminService.findAllDoctors();
  }

  @Get('doctors/:id')
  findDoctorById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findDoctorById(id);
  }

  @Patch('doctors/:id')
  updateDoctor(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorDto,
  ) {
    return this.adminService.updateDoctor(id, dto);
  }

  @Patch('doctors/:id/status')
  updateDoctorStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorStatusDto,
  ) {
    return this.adminService.updateDoctorStatus(id, dto);
  }

  @Get('doctors/:id/appointments')
  findDoctorAppointments(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findDoctorAppointments(id);
  }

  @Patch('doctors/:id/appointments/:appointmentId/confirm')
  confirmDoctorAppointment(
    @Param('id', ParseIntPipe) id: number,
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
  ) {
    return this.adminService.confirmDoctorAppointment(id, appointmentId);
  }

  @Post('doctors/:id/availability')
  addDoctorAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.adminService.addDoctorAvailability(id, dto);
  }

  @Post('doctors/:id/availability/bulk')
  addBulkDoctorAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BulkCreateAvailabilityDto,
  ) {
    return this.adminService.addBulkDoctorAvailability(id, dto);
  }

  @Get('doctors/:id/availability')
  findDoctorAvailability(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findDoctorAvailability(id);
  }

  @Delete('doctors/:id/availability/:availabilityId')
  deleteDoctorAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Param('availabilityId', ParseIntPipe) availabilityId: number,
  ) {
    return this.adminService.deleteDoctorAvailability(
      id,
      availabilityId,
    );
  }

  // =========================
  // Departments
  // =========================

  @Post('departments')
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.adminService.createDepartment(dto);
  }

  @Get('departments')
  findAllDepartments() {
    return this.adminService.findAllDepartments();
  }

  @Patch('departments/:id')
  updateDepartment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.adminService.updateDepartment(id, dto);
  }
  @Delete('departments/:id')
deleteDepartment(@Param('id', ParseIntPipe) id: number) {
  return this.adminService.deleteDepartment(id);
}

  // =========================
  // Appointments
  // =========================

  @Get('appointments')
  findAllAppointments() {
    return this.adminService.findAllAppointments();
  }
  @Get('appointments/:id')
findAppointmentById(
  @Param('id', ParseIntPipe) id: number,
) {
  return this.adminService.findAppointmentById(id);
}

  @Patch('appointments/:id/status')
  updateAppointmentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.adminService.updateAppointmentStatus(id, dto.status);
  }

  @Patch('appointments/:id/confirm')
  confirmAppointment(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.confirmAppointment(id);
  }
}