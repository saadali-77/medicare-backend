import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { register: jest.Mock; login: jest.Mock };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('delegates to the auth service', async () => {
      const dto = {
        name: 'Jane',
        email: 'jane@example.com',
        password: 'Password1!',
      };
      authService.register.mockResolvedValue({ message: 'ok' });

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('login', () => {
    it('delegates to the auth service', async () => {
      const dto = { email: 'jane@example.com', password: 'Password1!' };
      authService.login.mockResolvedValue({ accessToken: 'token' });

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(
        dto.email,
        dto.password,
      );
      expect(result).toEqual({ accessToken: 'token' });
    });
  });
});
