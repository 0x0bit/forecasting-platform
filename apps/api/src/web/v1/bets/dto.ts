import { IsIn, IsInt, IsString, Min } from 'class-validator';
import type { BetResult } from './interfaces/bet.interface';

export class CreateBetDto {
  @IsInt()
  userId!: number;

  @IsString()
  gameId!: string;

  @IsInt()
  @Min(1)
  amount!: number;
}

export class SettleBetDto {
  @IsIn(['WIN', 'LOSE'])
  result!: BetResult;
}
