import { Test, TestingModule } from '@nestjs/testing';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';

describe('DoctorsController', () => {
  let controller: DoctorsController;
  let doctorsService: { findAll: jest.Mock; findById: jest.Mock };

  beforeEach(async () => {
    doctorsService = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoctorsController],
      providers: [
        { provide: DoctorsService, useValue: doctorsService },
      ],
    }).compile();

    controller = module.get<DoctorsController>(DoctorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('delegates to the doctors service with the query', async () => {
      const query = { specialization: 'Cardiology' };
      const doctors = [{ id: 1, specialization: 'Cardiology' }];
      doctorsService.findAll.mockResolvedValue(doctors);

      const result = await controller.findAll(query);

      expect(doctorsService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(doctors);
    });
  });

  describe('findById', () => {
    it('delegates to the doctors service with the parsed id', async () => {
      const doctor = { id: 1, specialization: 'Cardiology' };
      doctorsService.findById.mockResolvedValue(doctor);

      const result = await controller.findById(1);

      expect(doctorsService.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(doctor);
    });
  });
});
