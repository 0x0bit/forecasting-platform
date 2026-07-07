import { Module } from '@nestjs/common';
import { HelperModule } from '@common/helpers/helper.module';
import { UsersModule } from '../users/users.module';
import { BetsController } from './bets.controller';
import { BetsService } from './bets.service';

@Module({
  imports: [HelperModule, UsersModule],
  controllers: [BetsController],
  providers: [BetsService],
})
export class BetsModule {}
