import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns all users from prisma', async () => {
      const users = [{ id: 1, email: 'a@example.com' }];
      prisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        omit: { password: true },
      });
      expect(result).toEqual(users);
    });
  });

  describe('updateRole', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRole(1, UserRole.ADMIN),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('updates the role when the user exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      const updated = { id: 1, role: UserRole.ADMIN };
      prisma.user.update.mockResolvedValue(updated);

      const result = await service.updateRole(1, UserRole.ADMIN);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { role: UserRole.ADMIN },
        omit: { password: true },
      });
      expect(result).toEqual(updated);
    });
  });
});
