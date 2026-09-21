import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
  };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('throws a ConflictException when the email is already taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });

      await expect(
        service.register({
          name: 'Jane',
          email: 'jane@example.com',
          password: 'Password1!',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('hashes the password and creates the user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 1,
        name: 'Jane',
        email: 'jane@example.com',
        phone: undefined,
        role: 'PATIENT',
      });

      const result = await service.register({
        name: 'Jane',
        email: 'jane@example.com',
        password: 'Password1!',
      });

      const createArgs = prisma.user.create.mock.calls[0][0];
      expect(
        await bcrypt.compare('Password1!', createArgs.data.password),
      ).toBe(true);
      expect(result.user.email).toBe('jane@example.com');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login('missing@example.com', 'Password1!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'jane@example.com',
        password: await bcrypt.hash('Password1!', 10),
        role: 'PATIENT',
      });

      await expect(
        service.login('jane@example.com', 'WrongPassword1!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns an access token when credentials are valid', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'Jane',
        email: 'jane@example.com',
        phone: undefined,
        password: await bcrypt.hash('Password1!', 10),
        role: 'PATIENT',
      });
      jwtService.signAsync.mockResolvedValue('signed-token');

      const result = await service.login('jane@example.com', 'Password1!');

      expect(result.accessToken).toBe('signed-token');
      expect(result.user.email).toBe('jane@example.com');
    });
  });
});
