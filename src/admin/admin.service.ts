import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus, Prisma, UserRole } from '../../generated/prisma';
import { UsersService } from '../users/users.service';
import { BulkCreateAvailabilityDto } from './dto/bulk-create-availability.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { UpdateDoctorStatusDto } from './dto/update-doctor-status.dto';

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

const APPOINTMENT_ADMIN_INCLUDE = {
  doctor: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  patient: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
} as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  findAllUsers() {
    return this.usersService.findAll();
  }

  async findUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  updateUserRole(id: number, role: UserRole) {
    return this.usersService.updateRole(id, role);
  }

  async createDoctor(dto: CreateDoctorDto) {
    const {
      name,
      email,
      password,
      phone,
      specialization,
      qualification,
      experience,
      licenseNumber,
      departmentId,
      imageUrl,
      bio,
    } = dto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      return await this.prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          role: UserRole.DOCTOR,
          doctor: {
            create: {
              specialization,
              qualification,
              experience,
              licenseNumber,
              departmentId,
              imageUrl,
              bio,
            },
          },
        },
        include: { doctor: true },
        omit: { password: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'License number already in use',
          );
        }

        if (error.code === 'P2003') {
          throw new BadRequestException(
            'departmentId does not reference an existing department',
          );
        }
      }

      throw error;
    }
  }

  async updateDoctor(id: number, dto: UpdateDoctorDto) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    try {
      return await this.prisma.doctor.update({
        where: { id },
        data: dto,
        include: { user: { omit: { password: true } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'License number already in use',
          );
        }

        if (error.code === 'P2003') {
          throw new BadRequestException(
            'departmentId does not reference an existing department',
          );
        }
      }

      throw error;
    }
  }

  async updateDoctorStatus(id: number, dto: UpdateDoctorStatusDto) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return this.prisma.doctor.update({
      where: { id },
      data: { isAvailable: dto.isAvailable },
      include: { user: { omit: { password: true } } },
    });
  }

  findAllDepartments() {
    return this.prisma.department.findMany();
  }

  async createDepartment(dto: CreateDepartmentDto) {
    try {
      return await this.prisma.department.create({ data: dto });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Department name already exists',
        );
      }

      throw error;
    }
  }

  async updateDepartment(id: number, dto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    try {
      return await this.prisma.department.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Department name already exists',
        );
      }

      throw error;
    }
  }
async deleteDepartment(id: number) {
  const department = await this.prisma.department.findUnique({
    where: { id },
    include: {
      doctors: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!department) {
    throw new NotFoundException('Department not found');
  }

  if (department.doctors.length > 0) {
    throw new ConflictException(
      'Cannot delete department because doctors are assigned to it',
    );
  }

  await this.prisma.department.delete({
    where: { id },
  });

  return {
    message: 'Department deleted successfully',
  };
}


  async getDashboardStats() {
    const [totalUsers, usersByRole] = await Promise.all([
      this.prisma.user.count(),

      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
    ]);

    return {
      totalUsers,
      usersByRole: usersByRole.reduce(
        (acc, { role, _count }) => {
          acc[role] = _count.role;
          return acc;
        },
        {} as Record<UserRole, number>,
      ),
    };
  }
  async findAllDoctors() {
  return this.prisma.doctor.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
async findDoctorById(id: number) {
  const doctor = await this.prisma.doctor.findUnique({
    where: {
      id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  if (!doctor) {
    throw new NotFoundException('Doctor not found');
  }

  return doctor;
}
async findAllAppointments() {
  return this.prisma.appointment.findMany({
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      doctor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      appointmentDate: 'desc',
    },
  });
}

confirmAppointment(id: number) {
  return this.updateAppointmentStatus(id, AppointmentStatus.CONFIRMED);
}

async findDoctorAppointments(doctorId: number) {
  const doctor = await this.prisma.doctor.findUnique({
    where: { id: doctorId },
  });

  if (!doctor) {
    throw new NotFoundException('Doctor not found');
  }

  return this.prisma.appointment.findMany({
    where: { doctorId },
    include: {
      patient: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
    orderBy: { appointmentDate: 'desc' },
  });
}

async confirmDoctorAppointment(
  doctorId: number,
  appointmentId: number,
) {
  const appointment = await this.prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
  });

  if (!appointment) {
    throw new NotFoundException(
      'Appointment not found for this doctor',
    );
  }

  return this.updateAppointmentStatus(
    appointmentId,
    AppointmentStatus.CONFIRMED,
  );
}

async updateAppointmentStatus(
  id: number,
  status: AppointmentStatus,
) {
  const appointment =
    await this.prisma.appointment.findUnique({
      where: {
        id,
      },
    });

  if (!appointment) {
    throw new NotFoundException(
      'Appointment not found',
    );
  }

  const currentStatus = appointment.status;

  if (currentStatus === status) {
    throw new BadRequestException(
      `Appointment is already ${status}`,
    );
  }

  // PENDING → CONFIRMED or CANCELLED
  if (currentStatus === AppointmentStatus.PENDING) {
    if (
      status !== AppointmentStatus.CONFIRMED &&
      status !== AppointmentStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot change appointment from ${currentStatus} to ${status}`,
      );
    }
  }

  // CONFIRMED → COMPLETED, CANCELLED or NO_SHOW
  if (currentStatus === AppointmentStatus.CONFIRMED) {
    if (
      status !== AppointmentStatus.COMPLETED &&
      status !== AppointmentStatus.CANCELLED &&
      status !== AppointmentStatus.NO_SHOW
    ) {
      throw new BadRequestException(
        `Cannot change appointment from ${currentStatus} to ${status}`,
      );
    }
  }

  // Final states cannot be changed
  if (
    currentStatus === AppointmentStatus.COMPLETED ||
    currentStatus === AppointmentStatus.CANCELLED ||
    currentStatus === AppointmentStatus.NO_SHOW
  ) {
    throw new BadRequestException(
      `Cannot change appointment because it is already ${currentStatus}`,
    );
  }

  return this.prisma.appointment.update({
    where: {
      id,
    },
    data: {
      status,
    },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      doctor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}

async findAppointmentById(id: number) {
  const appointment = await this.prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
        },
      },
      doctor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              isActive: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      },
    },
  });

  if (!appointment) {
    throw new NotFoundException('Appointment not found');
  }

  return appointment;
}

  async addDoctorAvailability(
    doctorId: number,
    dto: CreateAvailabilityDto,
  ) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const startMinutes = timeToMinutes(dto.startTime);
    const endMinutes = timeToMinutes(dto.endTime);

    if (startMinutes >= endMinutes) {
      throw new BadRequestException(
        'startTime must be before endTime',
      );
    }

    const existingWindows =
      await this.prisma.doctorAvailability.findMany({
        where: { doctorId, dayOfWeek: dto.dayOfWeek },
      });

    const overlaps = existingWindows.some((window) => {
      const windowStart = timeToMinutes(window.startTime);
      const windowEnd = timeToMinutes(window.endTime);
      return startMinutes < windowEnd && endMinutes > windowStart;
    });

    if (overlaps) {
      throw new ConflictException(
        'This availability window overlaps with an existing one for that day',
      );
    }

    return this.prisma.doctorAvailability.create({
      data: {
        doctorId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  async addBulkDoctorAvailability(
    doctorId: number,
    dto: BulkCreateAvailabilityDto,
  ) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const parsed = dto.windows.map((window) => {
      const startMinutes = timeToMinutes(window.startTime);
      const endMinutes = timeToMinutes(window.endTime);

      if (startMinutes >= endMinutes) {
        throw new BadRequestException(
          `startTime must be before endTime for dayOfWeek ${window.dayOfWeek}`,
        );
      }

      return { ...window, startMinutes, endMinutes };
    });

    // Reject overlaps between windows within this same request
    for (let i = 0; i < parsed.length; i++) {
      for (let j = i + 1; j < parsed.length; j++) {
        if (
          parsed[i].dayOfWeek === parsed[j].dayOfWeek &&
          parsed[i].startMinutes < parsed[j].endMinutes &&
          parsed[i].endMinutes > parsed[j].startMinutes
        ) {
          throw new ConflictException(
            `Two windows in this request overlap for dayOfWeek ${parsed[i].dayOfWeek}`,
          );
        }
      }
    }

    // Reject overlaps against windows already saved for this doctor
    const existingWindows =
      await this.prisma.doctorAvailability.findMany({
        where: { doctorId },
      });

    for (const window of parsed) {
      const overlapsExisting = existingWindows.some(
        (existing) =>
          existing.dayOfWeek === window.dayOfWeek &&
          window.startMinutes < timeToMinutes(existing.endTime) &&
          window.endMinutes > timeToMinutes(existing.startTime),
      );

      if (overlapsExisting) {
        throw new ConflictException(
          `An existing availability window overlaps with the requested range for dayOfWeek ${window.dayOfWeek}`,
        );
      }
    }

    return this.prisma.$transaction(
      parsed.map((window) =>
        this.prisma.doctorAvailability.create({
          data: {
            doctorId,
            dayOfWeek: window.dayOfWeek,
            startTime: window.startTime,
            endTime: window.endTime,
          },
        }),
      ),
    );
  }

  async findDoctorAvailability(doctorId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return this.prisma.doctorAvailability.findMany({
      where: { doctorId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async deleteDoctorAvailability(
    doctorId: number,
    availabilityId: number,
  ) {
    const availability =
      await this.prisma.doctorAvailability.findFirst({
        where: { id: availabilityId, doctorId },
      });

    if (!availability) {
      throw new NotFoundException(
        'Availability window not found',
      );
    }

    await this.prisma.doctorAvailability.delete({
      where: { id: availabilityId },
    });

    return { message: 'Availability window deleted successfully' };
  }
}