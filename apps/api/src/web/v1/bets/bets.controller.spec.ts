import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { BetsController } from './bets.controller';
import { BetsService } from './bets.service';

describe('BetsController', () => {
  let controller: BetsController;
  let betsService: jest.Mocked<
    Pick<BetsService, 'list' | 'create' | 'settle' | 'cancel'>
  >;

  beforeEach(async () => {
    betsService = {
      list: jest.fn(),
      create: jest.fn(),
      settle: jest.fn(),
      cancel: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [BetsController],
      providers: [
        {
          provide: BetsService,
          useValue: betsService,
        },
      ],
    }).compile();

    controller = moduleRef.get(BetsController);
  });

  describe('list', () => {
    it('passes undefined userId when query is omitted', async () => {
      const bets = [
        {
          id: 1,
          userId: 1,
          gameId: 'game-1',
          amount: 100,
          status: 'PLACED' as const,
          createdAt: '2026-01-01 00:00:00',
        },
      ];
      betsService.list.mockResolvedValue(bets);

      await expect(controller.list()).resolves.toBe(bets);
      expect(betsService.list).toHaveBeenCalledWith(undefined);
    });

    it('converts userId query to number before calling BetsService', async () => {
      betsService.list.mockResolvedValue([]);

      await expect(controller.list('2')).resolves.toEqual([]);
      expect(betsService.list).toHaveBeenCalledWith(2);
    });
  });

  describe('create', () => {
    it('passes idempotency key and body to BetsService and writes the returned response', async () => {
      const response = createResponseMock();
      const body = {
        userId: 1,
        gameId: 'game-1',
        amount: 100,
      };
      const serviceResult = {
        status: 201,
        body: {
          id: 10,
          userId: 1,
          gameId: 'game-1',
          amount: 100,
          status: 'PLACED' as const,
          balance: 900,
        },
      };
      betsService.create.mockResolvedValue(serviceResult);

      await controller.create('bet-key', body, response);

      expect(betsService.create).toHaveBeenCalledWith(body, 'bet-key');
      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith(serviceResult.body);
    });
  });

  describe('settle', () => {
    it('passes bet id and result to BetsService', async () => {
      const settledBet = {
        id: 10,
        userId: 1,
        gameId: 'game-1',
        amount: 100,
        status: 'SETTLED' as const,
        result: 'WIN' as const,
        payoutAmount: 200,
        balance: 1100,
      };
      betsService.settle.mockResolvedValue(settledBet);

      await expect(controller.settle(10, { result: 'WIN' })).resolves.toBe(
        settledBet,
      );
      expect(betsService.settle).toHaveBeenCalledWith(10, 'WIN');
    });
  });

  describe('cancel', () => {
    it('passes bet id to BetsService', async () => {
      const cancelledBet = {
        id: 10,
        userId: 1,
        gameId: 'game-1',
        amount: 100,
        status: 'CANCELLED' as const,
        balance: 1000,
      };
      betsService.cancel.mockResolvedValue(cancelledBet);

      await expect(controller.cancel(10)).resolves.toBe(cancelledBet);
      expect(betsService.cancel).toHaveBeenCalledWith(10);
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
