import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { DbVerifyService } from './db-verify.service';
import { TestDbConnectionDto } from './dto/test-connection.dto';

@ApiTags('db-verify')
@ApiSecurity('internal-api-key')
@Controller('db-verify')
export class DbVerifyController {
  constructor(private readonly dbVerifyService: DbVerifyService) {}

  @Post('test')
  @HttpCode(HttpStatus.OK)
  testConnection(@Body() body: TestDbConnectionDto) {
    return this.dbVerifyService.verify({
      host: body.host,
      port: body.port,
      database: body.database,
      username: body.username,
      password: body.password,
    });
  }
}
