import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { MemoryStorageFile } from '../../dist/cjs';

@Injectable()
export class AppService {
  constructor(private moduleRef: ModuleRef) {
    // console.log({ moduleRef });
  }

  getHello(): string {
    return 'Hello World!';
  }

  async uploadFiles(body: Record<string, unknown>, files: MemoryStorageFile[]) {
    for (const file of files) {
      delete file.buffer;
    }

    return files;
  }
}
