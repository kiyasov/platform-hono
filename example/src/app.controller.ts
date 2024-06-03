import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { AppService } from './app.service';
import { HonoRequest } from 'hono';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @HttpCode(HttpStatus.UNAUTHORIZED)
  @Get('/faq')
  faq(): string {
    throw new Error('Not implemented');
  }

  @Post('/post')
  async post(
    @Body() body: Record<string, unknown>,
    @Req() req: RawBodyRequest<HonoRequest>,
  ) {
    console.log(body);
    return 'Post';
  }
}
