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
  All,
  Header,
  Redirect,
  Res,
} from '@nestjs/common';
import { readFile } from 'fs/promises';
import { Context } from 'hono';

import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
  UploadedFile,
  UploadedFiles,
  HonoRequest,
  MemoryStorageFile,
} from '../../dist/cjs';
import { AppService } from './app.service';

// setInterval(() => {
//   const body = new FormData();
//   const file = Bun.file('');
//   body.append('files', file);
//   fetch('http://localhost:3000/uploadFiles', {
//     method: 'POST',
//     body,
//   });
// }, 10);

// setInterval(() => {
//   const memoryUsage = process.memoryUsage();
//   console.log({
//     rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB', // Резерв памяти процесса
//     heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB', // Всего памяти для кучи
//     heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB', // Используемая память кучи
//     external: (memoryUsage.external / 1024 / 1024).toFixed(2) + ' MB', // Используемая память C++ объектов и буферов
//   });
// }, 5000);

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/error')
  error(@Res() res: Context) {
    res.res = res.body('Error', 404);
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

  @Get('/redirectCtx')
  redirectCtx(@Res() ctx: Context) {
    ctx.res = ctx.redirect('/', 302);
  }

  @Get('/redirect')
  @Redirect('/')
  redirect() {
    return { url: '/' };
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
    @UploadedFiles() files: MemoryStorageFile[],
  ): string {
    this.logger.debug({ body, files });
    return 'uploadFileFields';
  }

  @Post('/uploadFiles')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadFiles(
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files: MemoryStorageFile[],
  ) {
    return this.appService.uploadFiles(body, files);
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
    @UploadedFile() file: MemoryStorageFile,
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
    @UploadedFile() file: MemoryStorageFile,
  ): string {
    this.logger.debug({ body, file });
    return 'uploadFile';
  }

  @All('/all')
  all(): string {
    return `Al`;
  }
}
