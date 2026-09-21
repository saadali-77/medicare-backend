import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus, UserRole } from '../../generated/prisma';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: {
    findAllUsers: jest.Mock;
    updateUserRole: jest.Mock;
    getDashboardStats: jest.Mock;
    findAllDepartments: jest.Mock;
    createDepartment: jest.Mock;
    updateDoctorStatus: jest.Mock;
    updateDoctor: jest.Mock;
    findAllDoctors: jest.Mock;
    findDoctorById: jest.Mock;
    updateDepartment: jest.Mock;
    findAllAppointments: jest.Mock;
    updateAppointmentStatus: jest.Mock;
    confirmAppointment: jest.Mock;
    findDoctorAppointments: jest.Mock;
    confirmDoctorAppointment: jest.Mock;
    addDoctorAvailability: jest.Mock;
    addBulkDoctorAvailability: jest.Mock;
    findDoctorAvailability: jest.Mock;
    deleteDoctorAvailability: jest.Mock;
  };

  beforeEach(async () => {
    adminService = {
      findAllUsers: jest.fn(),
      updateUserRole: jest.fn(),
      getDashboardStats: jest.fn(),
      findAllDepartments: jest.fn(),
      createDepartment: jest.fn(),
      updateDoctorStatus: jest.fn(),
      updateDoctor: jest.fn(),
      findAllDoctors: jest.fn(),
      findDoctorById: jest.fn(),
      updateDepartment: jest.fn(),
      findAllAppointments: jest.fn(),
      updateAppointmentStatus: jest.fn(),
      confirmAppointment: jest.fn(),
      findDoctorAppointments: jest.fn(),
      confirmDoctorAppointment: jest.fn(),
      addDoctorAvailability: jest.fn(),
      addBulkDoctorAvailability: jest.fn(),
      findDoctorAvailability: jest.fn(),
      deleteDoctorAvailability: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboardStats', () => {
    it('delegates to the admin service', async () => {
      const stats = { totalUsers: 1, usersByRole: { PATIENT: 1 } };
      adminService.getDashboardStats.mockResolvedValue(stats);

      const result = await controller.getDashboardStats();

      expect(adminService.getDashboardStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe('findAllUsers', () => {
    it('delegates to the admin service', async () => {
      const users = [{ id: 1, email: 'a@example.com' }];
      adminService.findAllUsers.mockResolvedValue(users);

      const result = await controller.findAllUsers();

      expect(adminService.findAllUsers).toHaveBeenCalled();
      expect(result).toEqual(users);
    });
  });

  describe('updateUserRole', () => {
    it('delegates to the admin service with the parsed id and role', async () => {
      const updated = { id: 1, role: UserRole.ADMIN };
      adminService.updateUserRole.mockResolvedValue(updated);

      const result = await controller.updateUserRole(1, {
        role: UserRole.ADMIN,
      });

      expect(adminService.updateUserRole).toHaveBeenCalledWith(
        1,
        UserRole.ADMIN,
      );
      expect(result).toEqual(updated);
    });
  });

  describe('findAllDepartments', () => {
    it('delegates to the admin service', async () => {
      const departments = [{ id: 1, name: 'Cardiology' }];
      adminService.findAllDepartments.mockResolvedValue(departments);

      const result = await controller.findAllDepartments();

      expect(adminService.findAllDepartments).toHaveBeenCalled();
      expect(result).toEqual(departments);
    });
  });

  describe('createDepartment', () => {
    it('delegates to the admin service', async () => {
      const dto = { name: 'Cardiology' };
      const created = { id: 1, ...dto };
      adminService.createDepartment.mockResolvedValue(created);

      const result = await controller.createDepartment(dto);

      expect(adminService.createDepartment).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });

  describe('updateDoctorStatus', () => {
    it('delegates to the admin service with the parsed id and dto', async () => {
      const dto = { isAvailable: false };
      const updated = { id: 1, isAvailable: false };
      adminService.updateDoctorStatus.mockResolvedValue(updated);

      const result = await controller.updateDoctorStatus(1, dto);

      expect(adminService.updateDoctorStatus).toHaveBeenCalledWith(
        1,
        dto,
      );
      expect(result).toEqual(updated);
    });
  });

  describe('updateDoctor', () => {
    it('delegates to the admin service with the parsed id and dto', async () => {
      const dto = { specialization: 'Neurology' };
      const updated = { id: 1, ...dto };
      adminService.updateDoctor.mockResolvedValue(updated);

      const result = await controller.updateDoctor(1, dto);

      expect(adminService.updateDoctor).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('findAllDoctors', () => {
    it('delegates to the admin service', async () => {
      const doctors = [{ id: 1, specialization: 'Cardiology' }];
      adminService.findAllDoctors.mockResolvedValue(doctors);

      const result = await controller.findAllDoctors();

      expect(adminService.findAllDoctors).toHaveBeenCalled();
      expect(result).toEqual(doctors);
    });
  });

  describe('findDoctorById', () => {
    it('delegates to the admin service with the parsed id', async () => {
      const doctor = { id: 1, specialization: 'Cardiology' };
      adminService.findDoctorById.mockResolvedValue(doctor);

      const result = await controller.findDoctorById(1);

      expect(adminService.findDoctorById).toHaveBeenCalledWith(1);
      expect(result).toEqual(doctor);
    });
  });

  describe('updateDepartment', () => {
    it('delegates to the admin service with the parsed id and dto', async () => {
      const dto = { name: 'Neurology' };
      const updated = { id: 1, ...dto };
      adminService.updateDepartment.mockResolvedValue(updated);

      const result = await controller.updateDepartment(1, dto);

      expect(adminService.updateDepartment).toHaveBeenCalledWith(
        1,
        dto,
      );
      expect(result).toEqual(updated);
    });
  });

  describe('findAllAppointments', () => {
    it('delegates to the admin service', async () => {
      const appointments = [{ id: 1, status: 'PENDING' }];
      adminService.findAllAppointments.mockResolvedValue(appointments);

      const result = await controller.findAllAppointments();

      expect(adminService.findAllAppointments).toHaveBeenCalled();
      expect(result).toEqual(appointments);
    });
  });

  describe('updateAppointmentStatus', () => {
    it('delegates to the admin service with the parsed id and status', async () => {
      const dto = { status: AppointmentStatus.CONFIRMED };
      const updated = { id: 1, status: AppointmentStatus.CONFIRMED };
      adminService.updateAppointmentStatus.mockResolvedValue(updated);

      const result = await controller.updateAppointmentStatus(1, dto);

      expect(
        adminService.updateAppointmentStatus,
      ).toHaveBeenCalledWith(1, dto.status);
      expect(result).toEqual(updated);
    });
  });

  describe('confirmAppointment', () => {
    it('delegates to the admin service with the parsed id', async () => {
      const updated = { id: 1, status: AppointmentStatus.CONFIRMED };
      adminService.confirmAppointment.mockResolvedValue(updated);

      const result = await controller.confirmAppointment(1);

      expect(adminService.confirmAppointment).toHaveBeenCalledWith(1);
      expect(result).toEqual(updated);
    });
  });

  describe('findDoctorAppointments', () => {
    it('delegates to the admin service with the parsed id', async () => {
      const appointments = [{ id: 1, doctorId: 5 }];
      adminService.findDoctorAppointments.mockResolvedValue(appointments);

      const result = await controller.findDoctorAppointments(5);

      expect(adminService.findDoctorAppointments).toHaveBeenCalledWith(5);
      expect(result).toEqual(appointments);
    });
  });

  describe('confirmDoctorAppointment', () => {
    it('delegates to the admin service with both parsed ids', async () => {
      const updated = { id: 1, status: AppointmentStatus.CONFIRMED };
      adminService.confirmDoctorAppointment.mockResolvedValue(updated);

      const result = await controller.confirmDoctorAppointment(5, 1);

      expect(
        adminService.confirmDoctorAppointment,
      ).toHaveBeenCalledWith(5, 1);
      expect(result).toEqual(updated);
    });
  });

  describe('addDoctorAvailability', () => {
    it('delegates to the admin service with the parsed id and dto', async () => {
      const dto = { dayOfWeek: 3, startTime: '09:00', endTime: '12:00' };
      const created = { id: 1, doctorId: 5, ...dto };
      adminService.addDoctorAvailability.mockResolvedValue(created);

      const result = await controller.addDoctorAvailability(5, dto);

      expect(
        adminService.addDoctorAvailability,
      ).toHaveBeenCalledWith(5, dto);
      expect(result).toEqual(created);
    });
  });

  describe('addBulkDoctorAvailability', () => {
    it('delegates to the admin service with the parsed id and dto', async () => {
      const dto = {
        windows: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        ],
      };
      const created = [{ id: 1, doctorId: 5, ...dto.windows[0] }];
      adminService.addBulkDoctorAvailability.mockResolvedValue(created);

      const result = await controller.addBulkDoctorAvailability(5, dto);

      expect(
        adminService.addBulkDoctorAvailability,
      ).toHaveBeenCalledWith(5, dto);
      expect(result).toEqual(created);
    });
  });

  describe('findDoctorAvailability', () => {
    it('delegates to the admin service with the parsed id', async () => {
      const windows = [{ id: 1, doctorId: 5 }];
      adminService.findDoctorAvailability.mockResolvedValue(windows);

      const result = await controller.findDoctorAvailability(5);

      expect(
        adminService.findDoctorAvailability,
      ).toHaveBeenCalledWith(5);
      expect(result).toEqual(windows);
    });
  });

  describe('deleteDoctorAvailability', () => {
    it('delegates to the admin service with the parsed ids', async () => {
      const response = { message: 'Availability window deleted successfully' };
      adminService.deleteDoctorAvailability.mockResolvedValue(response);

      const result = await controller.deleteDoctorAvailability(5, 1);

      expect(
        adminService.deleteDoctorAvailability,
      ).toHaveBeenCalledWith(5, 1);
      expect(result).toEqual(response);
    });
  });
});
