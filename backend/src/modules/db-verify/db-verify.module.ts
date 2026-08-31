import { Module } from '@nestjs/common';
import { DbVerifyController } from './db-verify.controller';
import { DbVerifyRepository } from './db-verify.repository';
import { DbVerifyService } from './db-verify.service';

@Module({
  controllers: [DbVerifyController],
  providers: [DbVerifyService, DbVerifyRepository],
})
export class DbVerifyModule {}
