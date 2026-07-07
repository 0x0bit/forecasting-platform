import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { DepositDto } from './dto';
import type { UserListItem } from './interfaces/user.interface';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 查询所有预置用户及其当前余额。
   */
  @Get()
  list(): Promise<UserListItem[]> {
    return this.usersService.list();
  }

  /**
   * 处理用户充值请求，并通过响应对象保留幂等回放时的原始状态码。
   */
  @Post(':id/deposit')
  async deposit(
    @Param('id', ParseIntPipe) id: number,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: DepositDto,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.usersService.deposit(
      id,
      body.amount,
      idempotencyKey,
    );
    response.status(result.status).json(result.body);
  }
}
