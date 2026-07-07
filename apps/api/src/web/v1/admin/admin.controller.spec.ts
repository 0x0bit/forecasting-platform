import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<Pick<AdminService, 'reconcile'>>;

  beforeEach(async () => {
    adminService = {
      reconcile: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: adminService,
        },
      ],
    }).compile();

    controller = moduleRef.get(AdminController);
  });

  describe('reconcile', () => {
    it('passes user id to AdminService and returns reconciliation result', async () => {
      const result = {
        userId: 1,
        recordedBalance: 1000,
        calculatedBalance: 1000,
        betStatusCounts: {
          PLACED: 0,
          SETTLED: 0,
          CANCELLED: 0,
        },
        isConsistent: true,
        anomalies: [],
      };
      adminService.reconcile.mockResolvedValue(result);

      await expect(controller.reconcile(1)).resolves.toBe(result);
      expect(adminService.reconcile).toHaveBeenCalledWith(1);
    });
  });
});
