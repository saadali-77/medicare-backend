import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;
  let appointmentsService: {
    createAppointment: jest.Mock;
    getMyAppointments: jest.Mock;
    getAvailableSlots: jest.Mock;
  };

  beforeEach(async () => {
    appointmentsService = {
      createAppointment: jest.fn(),
      getMyAppointments: jest.fn(),
      getAvailableSlots: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentsController],
      providers: [
        { provide: AppointmentsService, useValue: appointmentsService },
      ],
    }).compile();

    controller = module.get<AppointmentsController>(
      AppointmentsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createAppointment', () => {
    it('delegates to the appointments service with the authenticated patient id', async () => {
      const dto = {
        doctorId: 5,
        appointmentDate: '2026-10-01T10:00:00.000Z',
      };
      const created = { id: 1, patientId: 1, doctorId: 5 };
      appointmentsService.createAppointment.mockResolvedValue(created);

      const req = { user: { id: 1 } } as any;
      const result = await controller.createAppointment(req, dto);

      expect(
        appointmentsService.createAppointment,
      ).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(created);
    });
  });

  describe('getMyAppointments', () => {
    it('delegates to the appointments service with the authenticated patient id', async () => {
      const appointments = [{ id: 1, patientId: 1 }];
      appointmentsService.getMyAppointments.mockResolvedValue(
        appointments,
      );

      const req = { user: { id: 1 } } as any;
      const result = await controller.getMyAppointments(req);

      expect(
        appointmentsService.getMyAppointments,
      ).toHaveBeenCalledWith(1);
      expect(result).toEqual(appointments);
    });
  });

  describe('getAvailableSlots', () => {
    it('delegates to the appointments service with the query', async () => {
      const query = { doctorId: 5, date: '2026-10-05' };
      const slots = [{ time: '09:00', isBooked: false }];
      appointmentsService.getAvailableSlots.mockResolvedValue(slots);

      const result = await controller.getAvailableSlots(query);

      expect(
        appointmentsService.getAvailableSlots,
      ).toHaveBeenCalledWith(query);
      expect(result).toEqual(slots);
    });
  });
});
