import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus, Prisma, UserRole } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    user: {
      count: jest.Mock;
      groupBy: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    department: {
      findMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    doctor: {
      findUnique: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
    appointment: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    doctorAvailability: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let usersService: { findAll: jest.Mock; updateRole: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      department: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      doctor: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      appointment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      doctorAvailability: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    usersService = {
      findAll: jest.fn(),
      updateRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllUsers', () => {
    it('delegates to the users service', async () => {
      const users = [{ id: 1, email: 'a@example.com' }];
      usersService.findAll.mockResolvedValue(users);

      const result = await service.findAllUsers();

      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toEqual(users);
    });
  });

  describe('updateUserRole', () => {
    it('delegates to the users service', async () => {
      const updated = { id: 1, role: UserRole.ADMIN };
      usersService.updateRole.mockResolvedValue(updated);

      const result = await service.updateUserRole(1, UserRole.ADMIN);

      expect(usersService.updateRole).toHaveBeenCalledWith(
        1,
        UserRole.ADMIN,
      );
      expect(result).toEqual(updated);
    });
  });

  describe('findUserById', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findUserById(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the user without the password field', async () => {
      const user = {
        id: 1,
        name: 'Jane',
        email: 'jane@example.com',
        phone: null,
        role: UserRole.PATIENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findUserById(1);

      expect(result).toEqual(user);
    });
  });

  describe('createDoctor', () => {
    const dto = {
      name: 'Dr Jane',
      email: 'dr.jane@example.com',
      password: 'Password1!',
      specialization: 'Cardiology',
    };

    it('throws ConflictException when the email is already taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });

      await expect(service.createDoctor(dto)).rejects.toThrow(
        ConflictException,
      );

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates a user with role DOCTOR and a nested doctor profile', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const created = {
        id: 1,
        name: dto.name,
        email: dto.email,
        role: UserRole.DOCTOR,
        doctor: { id: 1, specialization: dto.specialization },
      };
      prisma.user.create.mockResolvedValue(created);

      const result = await service.createDoctor(dto);

      const createArgs = prisma.user.create.mock.calls[0][0];
      expect(createArgs.data.role).toBe(UserRole.DOCTOR);
      expect(createArgs.data.doctor.create.specialization).toBe(
        dto.specialization,
      );
      expect(createArgs.omit).toEqual({ password: true });
      expect(result).toEqual(created);
    });

    it('throws ConflictException when the license number is already in use', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique violation', {
          code: 'P2002',
          clientVersion: '6.7.0',
        }),
      );

      await expect(service.createDoctor(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws BadRequestException when departmentId does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('FK violation', {
          code: 'P2003',
          clientVersion: '6.7.0',
        }),
      );

      await expect(service.createDoctor(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateDoctorStatus', () => {
    it('throws NotFoundException when the doctor does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.updateDoctorStatus(1, { isAvailable: false }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.doctor.update).not.toHaveBeenCalled();
    });

    it('updates the doctor availability', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 1 });
      const updated = { id: 1, isAvailable: false };
      prisma.doctor.update.mockResolvedValue(updated);

      const result = await service.updateDoctorStatus(1, {
        isAvailable: false,
      });

      expect(prisma.doctor.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isAvailable: false },
        include: { user: { omit: { password: true } } },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('updateDoctor', () => {
    it('throws NotFoundException when the doctor does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.updateDoctor(1, { specialization: 'Neurology' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.doctor.update).not.toHaveBeenCalled();
    });

    it('updates the doctor profile fields', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 1 });
      const dto = { specialization: 'Neurology', experience: 5 };
      const updated = { id: 1, ...dto };
      prisma.doctor.update.mockResolvedValue(updated);

      const result = await service.updateDoctor(1, dto);

      expect(prisma.doctor.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
        include: { user: { omit: { password: true } } },
      });
      expect(result).toEqual(updated);
    });

    it('throws ConflictException when the license number is already in use', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 1 });
      prisma.doctor.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique violation', {
          code: 'P2002',
          clientVersion: '6.7.0',
        }),
      );

      await expect(
        service.updateDoctor(1, { licenseNumber: 'DUP' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when departmentId does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 1 });
      prisma.doctor.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('FK violation', {
          code: 'P2003',
          clientVersion: '6.7.0',
        }),
      );

      await expect(
        service.updateDoctor(1, { departmentId: 999 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllDoctors', () => {
    it('returns all doctors from prisma', async () => {
      const doctors = [{ id: 1, specialization: 'Cardiology' }];
      prisma.doctor.findMany.mockResolvedValue(doctors);

      const result = await service.findAllDoctors();

      expect(prisma.doctor.findMany).toHaveBeenCalled();
      expect(result).toEqual(doctors);
    });
  });

  describe('findDoctorById', () => {
    it('throws NotFoundException when the doctor does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.findDoctorById(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the doctor when found', async () => {
      const doctor = { id: 1, specialization: 'Cardiology' };
      prisma.doctor.findUnique.mockResolvedValue(doctor);

      const result = await service.findDoctorById(1);

      expect(result).toEqual(doctor);
    });
  });

  describe('findAllDepartments', () => {
    it('returns all departments from prisma', async () => {
      const departments = [{ id: 1, name: 'Cardiology' }];
      prisma.department.findMany.mockResolvedValue(departments);

      const result = await service.findAllDepartments();

      expect(prisma.department.findMany).toHaveBeenCalled();
      expect(result).toEqual(departments);
    });
  });

  describe('createDepartment', () => {
    const dto = { name: 'Cardiology', description: 'Heart stuff' };

    it('creates a department', async () => {
      const created = { id: 1, ...dto };
      prisma.department.create.mockResolvedValue(created);

      const result = await service.createDepartment(dto);

      expect(prisma.department.create).toHaveBeenCalledWith({
        data: dto,
      });
      expect(result).toEqual(created);
    });

    it('throws ConflictException when the department name already exists', async () => {
      prisma.department.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique violation', {
          code: 'P2002',
          clientVersion: '6.7.0',
        }),
      );

      await expect(service.createDepartment(dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateDepartment', () => {
    it('throws NotFoundException when the department does not exist', async () => {
      prisma.department.findUnique.mockResolvedValue(null);

      await expect(
        service.updateDepartment(1, { name: 'Neurology' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.department.update).not.toHaveBeenCalled();
    });

    it('updates the department', async () => {
      prisma.department.findUnique.mockResolvedValue({ id: 1 });
      const dto = { name: 'Neurology' };
      const updated = { id: 1, ...dto };
      prisma.department.update.mockResolvedValue(updated);

      const result = await service.updateDepartment(1, dto);

      expect(prisma.department.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: dto,
      });
      expect(result).toEqual(updated);
    });

    it('throws ConflictException when the new name already exists', async () => {
      prisma.department.findUnique.mockResolvedValue({ id: 1 });
      prisma.department.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique violation', {
          code: 'P2002',
          clientVersion: '6.7.0',
        }),
      );

      await expect(
        service.updateDepartment(1, { name: 'Cardiology' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getDashboardStats', () => {
    it('returns total user count and a breakdown by role', async () => {
      prisma.user.count.mockResolvedValue(3);
      prisma.user.groupBy.mockResolvedValue([
        { role: UserRole.PATIENT, _count: { role: 2 } },
        { role: UserRole.ADMIN, _count: { role: 1 } },
      ]);

      const result = await service.getDashboardStats();

      expect(prisma.user.groupBy).toHaveBeenCalledWith({
        by: ['role'],
        _count: { role: true },
      });
      expect(result).toEqual({
        totalUsers: 3,
        usersByRole: {
          [UserRole.PATIENT]: 2,
          [UserRole.ADMIN]: 1,
        },
      });
    });
  });

  describe('findAllAppointments', () => {
    it('returns all appointments ordered by date desc', async () => {
      const appointments = [{ id: 1, status: AppointmentStatus.PENDING }];
      prisma.appointment.findMany.mockResolvedValue(appointments);

      const result = await service.findAllAppointments();

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { appointmentDate: 'desc' },
        }),
      );
      expect(result).toEqual(appointments);
    });
  });

  describe('updateAppointmentStatus', () => {
    it('throws NotFoundException when the appointment does not exist', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAppointmentStatus(1, AppointmentStatus.CONFIRMED),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it('updates the appointment status', async () => {
      prisma.appointment.findUnique.mockResolvedValue({ id: 1 });
      const updated = { id: 1, status: AppointmentStatus.CONFIRMED };
      prisma.appointment.update.mockResolvedValue(updated);

      const result = await service.updateAppointmentStatus(
        1,
        AppointmentStatus.CONFIRMED,
      );

      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { status: AppointmentStatus.CONFIRMED },
        }),
      );
      expect(result).toEqual(updated);
    });
  });

  describe('confirmAppointment', () => {
    it('delegates to updateAppointmentStatus with CONFIRMED', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 1,
        status: AppointmentStatus.PENDING,
      });
      const updated = { id: 1, status: AppointmentStatus.CONFIRMED };
      prisma.appointment.update.mockResolvedValue(updated);

      const result = await service.confirmAppointment(1);

      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { status: AppointmentStatus.CONFIRMED },
        }),
      );
      expect(result).toEqual(updated);
    });

    it('throws BadRequestException when the appointment cannot be confirmed', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 1,
        status: AppointmentStatus.CANCELLED,
      });

      await expect(service.confirmAppointment(1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findDoctorAppointments', () => {
    it('throws NotFoundException when the doctor does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.findDoctorAppointments(5)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("returns the doctor's appointments", async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 5 });
      const appointments = [{ id: 1, doctorId: 5 }];
      prisma.appointment.findMany.mockResolvedValue(appointments);

      const result = await service.findDoctorAppointments(5);

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { doctorId: 5 } }),
      );
      expect(result).toEqual(appointments);
    });
  });

  describe('confirmDoctorAppointment', () => {
    it('throws NotFoundException when the appointment does not belong to the doctor', async () => {
      prisma.appointment.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmDoctorAppointment(5, 1),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it('confirms a pending appointment belonging to the doctor', async () => {
      prisma.appointment.findFirst.mockResolvedValue({ id: 1 });
      prisma.appointment.findUnique.mockResolvedValue({
        id: 1,
        status: AppointmentStatus.PENDING,
      });
      const updated = { id: 1, status: AppointmentStatus.CONFIRMED };
      prisma.appointment.update.mockResolvedValue(updated);

      const result = await service.confirmDoctorAppointment(5, 1);

      expect(prisma.appointment.findFirst).toHaveBeenCalledWith({
        where: { id: 1, doctorId: 5 },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('addDoctorAvailability', () => {
    const dto = { dayOfWeek: 3, startTime: '09:00', endTime: '12:00' };

    it('throws NotFoundException when the doctor does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.addDoctorAvailability(5, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when startTime is not before endTime', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 5 });

      await expect(
        service.addDoctorAvailability(5, {
          dayOfWeek: 3,
          startTime: '12:00',
          endTime: '09:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when the window overlaps an existing one', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 5 });
      prisma.doctorAvailability.findMany.mockResolvedValue([
        { dayOfWeek: 3, startTime: '10:00', endTime: '13:00' },
      ]);

      await expect(
        service.addDoctorAvailability(5, dto),
      ).rejects.toThrow(ConflictException);

      expect(prisma.doctorAvailability.create).not.toHaveBeenCalled();
    });

    it('creates the availability window when it does not overlap', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 5 });
      prisma.doctorAvailability.findMany.mockResolvedValue([]);
      const created = { id: 1, doctorId: 5, ...dto };
      prisma.doctorAvailability.create.mockResolvedValue(created);

      const result = await service.addDoctorAvailability(5, dto);

      expect(prisma.doctorAvailability.create).toHaveBeenCalledWith({
        data: {
          doctorId: 5,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
          endTime: dto.endTime,
        },
      });
      expect(result).toEqual(created);
    });
  });

  describe('addBulkDoctorAvailability', () => {
    const windows = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
    ];

    it('throws NotFoundException when the doctor does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.addBulkDoctorAvailability(5, { windows }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when a window has startTime after endTime', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 5 });

      await expect(
        service.addBulkDoctorAvailability(5, {
          windows: [
            { dayOfWeek: 1, startTime: '17:00', endTime: '09:00' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when two windows in the batch overlap', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 5 });
      prisma.doctorAvailability.findMany.mockResolvedValue([]);

      await expect(
        service.addBulkDoctorAvailability(5, {
          windows: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
            { dayOfWeek: 1, startTime: '11:00', endTime: '14:00' },
          ],
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.doctorAvailability.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a window overlaps an existing saved window', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 5 });
      prisma.doctorAvailability.findMany.mockResolvedValue([
        { dayOfWeek: 1, startTime: '10:00', endTime: '13:00' },
      ]);

      await expect(
        service.addBulkDoctorAvailability(5, {
          windows: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
          ],
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.doctorAvailability.create).not.toHaveBeenCalled();
    });

    it('creates all windows in a transaction when none overlap', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 5 });
      prisma.doctorAvailability.findMany.mockResolvedValue([]);
      prisma.doctorAvailability.create
        .mockResolvedValueOnce({ id: 1, doctorId: 5, ...windows[0] })
        .mockResolvedValueOnce({ id: 2, doctorId: 5, ...windows[1] });

      const result = await service.addBulkDoctorAvailability(5, {
        windows,
      });

      expect(prisma.doctorAvailability.create).toHaveBeenCalledTimes(2);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual([
        { id: 1, doctorId: 5, ...windows[0] },
        { id: 2, doctorId: 5, ...windows[1] },
      ]);
    });
  });

  describe('findDoctorAvailability', () => {
    it('throws NotFoundException when the doctor does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.findDoctorAvailability(5),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns the availability windows for the doctor', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 5 });
      const windows = [
        { id: 1, dayOfWeek: 3, startTime: '09:00', endTime: '12:00' },
      ];
      prisma.doctorAvailability.findMany.mockResolvedValue(windows);

      const result = await service.findDoctorAvailability(5);

      expect(result).toEqual(windows);
    });
  });

  describe('deleteDoctorAvailability', () => {
    it('throws NotFoundException when the window does not belong to the doctor', async () => {
      prisma.doctorAvailability.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteDoctorAvailability(5, 1),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.doctorAvailability.delete).not.toHaveBeenCalled();
    });

    it('deletes the availability window', async () => {
      prisma.doctorAvailability.findFirst.mockResolvedValue({
        id: 1,
        doctorId: 5,
      });

      const result = await service.deleteDoctorAvailability(5, 1);

      expect(prisma.doctorAvailability.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({
        message: 'Availability window deleted successfully',
      });
    });
  });
});
