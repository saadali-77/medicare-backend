import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { GetSlotsQueryDto } from './dto/get-slots-query.dto';

const SLOT_DURATION_MINUTES = 30;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseDateOnly(dateStr: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // Create appointment
 async createAppointment(
  patientId: number,
  dto: CreateAppointmentDto,
) {
  // 1. Find doctor
  const doctor = await this.prisma.doctor.findUnique({
    where: {
      id: dto.doctorId,
    },
    include: {
      user: true,
    },
  });

  if (!doctor) {
    throw new NotFoundException('Doctor not found');
  }

  // 2. Check doctor account
  if (!doctor.user.isActive) {
    throw new BadRequestException(
      'Doctor account is inactive',
    );
  }

  // 3. Check doctor availability
  if (!doctor.isAvailable) {
    throw new BadRequestException(
      'Doctor is currently unavailable',
    );
  }

  // 4. Validate appointment date
  const appointmentDate = new Date(dto.appointmentDate);

  if (Number.isNaN(appointmentDate.getTime())) {
    throw new BadRequestException(
      'Invalid appointment date',
    );
  }

  if (appointmentDate <= new Date()) {
    throw new BadRequestException(
      'Appointment date must be in the future',
    );
  }

  // 5. Find patient
  const patient = await this.prisma.user.findUnique({
    where: {
      id: patientId,
    },
  });

  if (!patient) {
    throw new NotFoundException('Patient not found');
  }

  // 6. Make sure user is a patient
  if (patient.role !== 'PATIENT') {
    throw new BadRequestException(
      'Only patients can create appointments',
    );
  }

  // 7. Check patient account
  if (!patient.isActive) {
    throw new BadRequestException(
      'Patient account is inactive',
    );
  }

  // 8. If the doctor has a configured schedule, the requested time must
  // fall within one of their availability windows and align to the slot grid.
  const availabilityWindows =
    await this.prisma.doctorAvailability.findMany({
      where: { doctorId: dto.doctorId },
    });

  if (availabilityWindows.length > 0) {
    const dayOfWeek = appointmentDate.getDay();
    const requestedMinutes =
      appointmentDate.getHours() * 60 + appointmentDate.getMinutes();

    const fitsWindow = availabilityWindows.some((window) => {
      if (window.dayOfWeek !== dayOfWeek) {
        return false;
      }

      const start = timeToMinutes(window.startTime);
      const end = timeToMinutes(window.endTime);

      return (
        requestedMinutes >= start &&
        requestedMinutes + SLOT_DURATION_MINUTES <= end &&
        (requestedMinutes - start) % SLOT_DURATION_MINUTES === 0
      );
    });

    if (!fitsWindow) {
      throw new BadRequestException(
        'Doctor is not available at the requested time',
      );
    }
  }

  // 9. Check doctor's existing appointment
  const existingAppointment =
    await this.prisma.appointment.findFirst({
      where: {
        doctorId: dto.doctorId,
        appointmentDate,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
    });

  if (existingAppointment) {
    throw new BadRequestException(
      'Doctor already has an appointment at this time',
    );
  }

  // 10. Create appointment
  const appointment =
    await this.prisma.appointment.create({
      data: {
        patientId,
        doctorId: dto.doctorId,
        appointmentDate,
        reason: dto.reason,
      },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            department: true,
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
      },
    });

  return appointment;
}

  // Get logged-in patient's appointments
  async getMyAppointments(patientId: number) {
    const appointments =
      await this.prisma.appointment.findMany({
        where: {
          patientId,
        },
        include: {
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

    return appointments;
  }

  async cancelAppointment(
    appointmentId: number,
    patientId: number,
  ) {
    const appointment =
      await this.prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          patientId,
        },
      });

    if (!appointment) {
      throw new NotFoundException(
        'Appointment not found',
      );
    }

    if (
      appointment.status !== 'PENDING' &&
      appointment.status !== 'CONFIRMED'
    ) {
      throw new BadRequestException(
        `Appointment cannot be cancelled because it is already ${appointment.status}`,
      );
    }

    const cancelledAppointment =
      await this.prisma.appointment.update({
        where: {
          id: appointmentId,
        },
        data: {
          status: 'CANCELLED',
        },
        include: {
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
        },
      });

    return cancelledAppointment;
  }

  // Compute a doctor's bookable slots for a given date
  async getAvailableSlots(query: GetSlotsQueryDto) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: query.doctorId },
      include: { user: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (!doctor.user.isActive) {
      throw new BadRequestException('Doctor account is inactive');
    }

    if (!doctor.isAvailable) {
      throw new BadRequestException(
        'Doctor is currently unavailable',
      );
    }

    const { year, month, day } = parseDateOnly(query.date);
    const dayOfWeek = new Date(year, month - 1, day).getDay();

    const windows = await this.prisma.doctorAvailability.findMany({
      where: { doctorId: query.doctorId, dayOfWeek },
    });

    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

    const bookedAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId: query.doctorId,
        appointmentDate: { gte: dayStart, lte: dayEnd },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { appointmentDate: true },
    });

    const bookedTimes = new Set(
      bookedAppointments.map((a) => a.appointmentDate.getTime()),
    );

    const now = new Date();
    const slots: { time: string; appointmentDate: Date; isBooked: boolean }[] =
      [];

    for (const window of windows) {
      const start = timeToMinutes(window.startTime);
      const end = timeToMinutes(window.endTime);

      for (
        let minutes = start;
        minutes + SLOT_DURATION_MINUTES <= end;
        minutes += SLOT_DURATION_MINUTES
      ) {
        const slotDate = new Date(
          year,
          month - 1,
          day,
          Math.floor(minutes / 60),
          minutes % 60,
          0,
          0,
        );

        if (slotDate <= now) {
          continue;
        }

        slots.push({
          time: minutesToTime(minutes),
          appointmentDate: slotDate,
          isBooked: bookedTimes.has(slotDate.getTime()),
        });
      }
    }

    slots.sort((a, b) => a.appointmentDate.getTime() - b.appointmentDate.getTime());

    return slots;
  }
}
