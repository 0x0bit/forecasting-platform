import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import type { ReconcileResponse } from './interfaces/reconcile.interface';

@Controller('admin')
export class AdminController {
  /**
   * 注入管理服务，负责调用对账逻辑。
   */
  constructor(private readonly adminService: AdminService) {}

  /**
   * 返回指定用户的余额、账本推导结果、订单统计和异常列表。
   */
  @Get('reconcile')
  reconcile(
    @Query('userId', ParseIntPipe) userId: number,
  ): Promise<ReconcileResponse> {
    return this.adminService.reconcile(userId);
  }
}
