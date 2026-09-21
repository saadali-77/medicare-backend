import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma: {
    doctor: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
    doctorAvailability: { findMany: jest.Mock };
    appointment: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  // A Wednesday in the future, at 10:00 local time
  const futureWednesday = (() => {
    const d = new Date();
    d.setDate(d.getDate() + ((3 - d.getDay() + 7) % 7 || 7));
    d.setHours(10, 0, 0, 0);
    return d;
  })();
  const futureDate = futureWednesday.toISOString();

  beforeEach(async () => {
    prisma = {
      doctor: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      doctorAvailability: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      appointment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAppointment', () => {
    const dto = {
      doctorId: 5,
      appointmentDate: futureDate,
      reason: 'Checkup',
    };

    it('throws NotFoundException when the doctor does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.createAppointment(1, dto),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the doctor account is inactive', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        id: 5,
        isAvailable: true,
        user: { isActive: false },
      });

      await expect(
        service.createAppointment(1, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the doctor is unavailable', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        id: 5,
        isAvailable: false,
        user: { isActive: true },
      });

      await expect(
        service.createAppointment(1, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the appointment date is not in the future', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        id: 5,
        isAvailable: true,
        user: { isActive: true },
      });

      await expect(
        service.createAppointment(1, {
          ...dto,
          appointmentDate: '2020-01-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the patient does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        id: 5,
        isAvailable: true,
        user: { isActive: true },
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createAppointment(1, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the caller is not a patient', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        id: 5,
        isAvailable: true,
        user: { isActive: true },
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        role: 'DOCTOR',
        isActive: true,
      });

      await expect(
        service.createAppointment(1, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the patient account is inactive', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        id: 5,
        isAvailable: true,
        user: { isActive: true },
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        role: 'PATIENT',
        isActive: false,
      });

      await expect(
        service.createAppointment(1, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the requested time is outside the doctor schedule', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        id: 5,
        isAvailable: true,
        user: { isActive: true },
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        role: 'PATIENT',
        isActive: true,
      });
      // Doctor only works a day/time that doesn't match futureWednesday@10:00
      prisma.doctorAvailability.findMany.mockResolvedValue([
        { dayOfWeek: futureWednesday.getDay(), startTime: '14:00', endTime: '17:00' },
      ]);

      await expect(
        service.createAppointment(1, dto),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the doctor already has an appointment at that time', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        id: 5,
        isAvailable: true,
        user: { isActive: true },
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        role: 'PATIENT',
        isActive: true,
      });
      prisma.appointment.findFirst.mockResolvedValue({ id: 99 });

      await expect(
        service.createAppointment(1, dto),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    it('creates the appointment when all checks pass and no schedule is configured', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        id: 5,
        isAvailable: true,
        user: { isActive: true },
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        role: 'PATIENT',
        isActive: true,
      });
      const created = { id: 1, patientId: 1, doctorId: 5 };
      prisma.appointment.create.mockResolvedValue(created);

      const result = await service.createAppointment(1, dto);

      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            patientId: 1,
            doctorId: 5,
            appointmentDate: new Date(dto.appointmentDate),
            reason: dto.reason,
          },
        }),
      );
      expect(result).toEqual(created);
    });

    it('creates the appointment when the requested time fits a configured window', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        id: 5,
        isAvailable: true,
        user: { isActive: true },
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        role: 'PATIENT',
        isActive: true,
      });
      prisma.doctorAvailability.findMany.mockResolvedValue([
        { dayOfWeek: futureWednesday.getDay(), startTime: '09:00', endTime: '12:00' },
      ]);
      const created = { id: 1, patientId: 1, doctorId: 5 };
      prisma.appointment.create.mockResolvedValue(created);

      const result = await service.createAppointment(1, dto);

      expect(result).toEqual(created);
    });
  });

  describe('getMyAppointments', () => {
    it('returns appointments for the given patient ordered by date desc', async () => {
      const appointments = [
        { id: 1, patientId: 1, doctorId: 5 },
      ];
      prisma.appointment.findMany.mockResolvedValue(appointments);

      const result = await service.getMyAppointments(1);

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 1 },
          orderBy: { appointmentDate: 'desc' },
        }),
      );
      expect(result).toEqual(appointments);
    });
  });

  describe('getAvailableSlots', () => {
    it('throws NotFoundException when the doctor does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.getAvailableSlots({ doctorId: 5, date: '2030-01-02' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the doctor is unavailable', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        id: 5,
        isAvailable: false,
        user: { isActive: true },
      });

      await expect(
        service.getAvailableSlots({ doctorId: 5, date: '2030-01-02' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns generated slots excluding already-booked times', async () => {
      // 2030-01-02 is a Wednesday
      prisma.doctor.findUnique.mockResolvedValue({
        id: 5,
        isAvailable: true,
        user: { isActive: true },
      });
      prisma.doctorAvailability.findMany.mockResolvedValue([
        { dayOfWeek: 3, startTime: '09:00', endTime: '10:00' },
      ]);
      prisma.appointment.findMany.mockResolvedValue([
        { appointmentDate: new Date(2030, 0, 2, 9, 30, 0, 0) },
      ]);

      const result = await service.getAvailableSlots({
        doctorId: 5,
        date: '2030-01-02',
      });

      expect(result).toEqual([
        {
          time: '09:00',
          appointmentDate: new Date(2030, 0, 2, 9, 0, 0, 0),
          isBooked: false,
        },
        {
          time: '09:30',
          appointmentDate: new Date(2030, 0, 2, 9, 30, 0, 0),
          isBooked: true,
        },
      ]);
    });

    it('returns no slots when the doctor has no availability configured for that day', async () => {
      prisma.doctor.findUnique.mockResolvedValue({
        id: 5,
        isAvailable: true,
        user: { isActive: true },
      });
      prisma.doctorAvailability.findMany.mockResolvedValue([]);
      prisma.appointment.findMany.mockResolvedValue([]);

      const result = await service.getAvailableSlots({
        doctorId: 5,
        date: '2030-01-02',
      });

      expect(result).toEqual([]);
    });
  });
});
