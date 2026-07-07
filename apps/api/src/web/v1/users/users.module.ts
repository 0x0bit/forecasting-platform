import { Module } from '@nestjs/common';
import { HelperModule } from '@common/helpers/helper.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [HelperModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
