import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { BetsService } from './bets.service';
import { CreateBetDto, SettleBetDto } from './dto';
import type { BetListItem, BetResponse } from './interfaces/bet.interface';

@Controller('bets')
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  /**
   * 查询下注列表；传入 userId 时只返回该用户的订单。
   */
  @Get()
  list(@Query('userId') userId?: string): Promise<BetListItem[]> {
    return this.betsService.list(userId ? Number(userId) : undefined);
  }

  /**
   * 创建下注，并通过响应对象保留幂等回放时的原始状态码。
   */
  @Post()
  async create(
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: CreateBetDto,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.betsService.create(body, idempotencyKey);
    response.status(result.status).json(result.body);
  }

  /**
   * 将 PLACED 状态的下注结算为 WIN 或 LOSE。
   */
  @Post(':id/settle')
  settle(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SettleBetDto,
  ): Promise<BetResponse> {
    return this.betsService.settle(id, body.result);
  }

  /**
   * 取消 PLACED 状态的下注并触发退款。
   */
  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number): Promise<BetResponse> {
    return this.betsService.cancel(id);
  }
}
