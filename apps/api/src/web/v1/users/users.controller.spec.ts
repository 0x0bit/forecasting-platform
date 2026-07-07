import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<Pick<UsersService, 'list' | 'deposit'>>;

  beforeEach(async () => {
    usersService = {
      list: jest.fn(),
      deposit: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  describe('list', () => {
    it('returns users from UsersService', async () => {
      const users = [
        {
          id: 1,
          username: 'alice',
          balance: 1000,
          initialBalance: 1000,
          createdAt: '2026-01-01 00:00:00',
        },
      ];
      usersService.list.mockResolvedValue(users);

      await expect(controller.list()).resolves.toBe(users);
      expect(usersService.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('deposit', () => {
    it('passes request values to UsersService and writes the returned response', async () => {
      const response = createResponseMock();
      const body = { amount: 100 };
      const serviceResult = {
        status: 201,
        body: {
          userId: 1,
          balance: 1100,
          ledgerEntryId: 9,
        },
      };
      usersService.deposit.mockResolvedValue(serviceResult);

      await controller.deposit(1, 'deposit-key', body, response);

      expect(usersService.deposit).toHaveBeenCalledWith(1, 100, 'deposit-key');
      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith(serviceResult.body);
    });
  });
});

/**
 * 创建只包含 Controller 需要的方法的 Express 响应对象替身。
 */
function createResponseMock(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;
}
