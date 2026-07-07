import { Module } from '@nestjs/common';
import { AdminModule } from './web/v1/admin/admin.module';
import { BetsModule } from './web/v1/bets/bets.module';
import { PrismaModule } from '@common/prisma/prisma.module';
import { UsersModule } from './web/v1/users/users.module';

@Module({
  imports: [PrismaModule, UsersModule, BetsModule, AdminModule],
})
export class AppModule {}
