import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DoctorsService } from './doctors.service';

describe('DoctorsService', () => {
  let service: DoctorsService;
  let prisma: {
    doctor: { findMany: jest.Mock; findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      doctor: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns only active and available doctors when no filters are given', async () => {
      const doctors = [{ id: 1, specialization: 'Cardiology' }];
      prisma.doctor.findMany.mockResolvedValue(doctors);

      const result = await service.findAll({});

      expect(prisma.doctor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isAvailable: true,
            user: { isActive: true },
          },
        }),
      );
      expect(result).toEqual(doctors);
    });

    it('filters by specialization and departmentId when provided', async () => {
      prisma.doctor.findMany.mockResolvedValue([]);

      await service.findAll({
        specialization: 'Cardiology',
        departmentId: 3,
      });

      expect(prisma.doctor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isAvailable: true,
            user: { isActive: true },
            specialization: {
              contains: 'Cardiology',
              mode: 'insensitive',
            },
            departmentId: 3,
          },
        }),
      );
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when the doctor does not exist', async () => {
      prisma.doctor.findUnique.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the doctor when found', async () => {
      const doctor = { id: 1, specialization: 'Cardiology' };
      prisma.doctor.findUnique.mockResolvedValue(doctor);

      const result = await service.findById(1);

      expect(result).toEqual(doctor);
    });
  });
});
