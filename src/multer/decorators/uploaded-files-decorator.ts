import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { getMultipartRequest } from '../multipart/request';
import { StorageFile } from '../storage/storage';

export const UploadedFiles = createParamDecorator(
  async (
    _data: unknown,
    ctx: ExecutionContext,
  ): Promise<Record<string, StorageFile[]> | StorageFile[] | undefined> => {
    const req = getMultipartRequest(ctx.switchToHttp());

    return req?.storageFiles;
  },
);
