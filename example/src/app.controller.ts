import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UseInterceptors,
  Headers,
  Param,
  Query,
  Ip,
  HostParam,
  All,
  Res,
  Header,
} from '@nestjs/common';
import { AppService } from './app.service';
import { readFile } from 'fs/promises';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
  UploadedFile,
  UploadedFiles,
  HonoRequest,
} from '../../dist/cjs';
import { Context } from 'hono';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/json')
  getJson(): Record<string, unknown> {
    return { message: 'Hello World!' };
  }

  @Get('/download')
  @Header('Content-Type', 'application/octet-stream')
  async download() {
    const fileBuffer = await readFile(process.cwd() + '/uploads/ff.png');

    return fileBuffer;
  }

  @HttpCode(HttpStatus.UNAUTHORIZED)
  @Get('/noAuth')
  noAuth(): string {
    throw new Error('Not implemented');
  }

  @Get('/user/:userId')
  getUser(@Param('userId') userId: string): string {
    return `User ${userId}`;
  }

  @Get('/ip')
  getIP(@Ip() ip: string): string {
    return `IP ${ip}`;
  }

  @Get('/query')
  getQuery(@Query() query: Record<string, unknown>): string {
    return `Query ${JSON.stringify(query)}`;
  }

  @Post('/post')
  async post(
    @Body() body: Record<string, unknown>,
    @Req() req: RawBodyRequest<HonoRequest>,
    @Headers('user-agent') userAgent: string,
  ) {
    this.logger.debug({ body, userAgent });
    return 'Post';
  }

  @Post('/uploadFileFields')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: 'file',
          maxCount: 1,
        },
      ],
      {
        limits: {
          fileSize: 100 * 1024 * 1024, // Maximum file size in bytes (100MB)
        },
      },
    ),
  )
  uploadFileFields(
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files: File[],
  ): string {
    this.logger.debug({ body, files });
    return 'uploadFileFields';
  }

  @Post('/uploadFiles')
  @UseInterceptors(FilesInterceptor('files'))
  uploadFiles(
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files: File[],
  ): string {
    this.logger.debug({ body, files });
    return 'uploadFiles';
  }

  @Post('/uploadFile')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // Maximum file size in bytes (5MB)
      },
    }),
  )
  uploadFile(
    @Body() body: Record<string, unknown>,
    @UploadedFile() file: File,
  ): string {
    this.logger.debug({ body, file });
    return 'uploadFile';
  }

  @Post('/uploadFileStorage')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: 'uploads',
    }),
  )
  uploadFileStorage(
    @Body() body: Record<string, unknown>,
    @UploadedFile() file: File,
  ): string {
    this.logger.debug({ body, file });
    return 'uploadFile';
  }

  @All('/all')
  all(): string {
    return `Al`;
  }
}
