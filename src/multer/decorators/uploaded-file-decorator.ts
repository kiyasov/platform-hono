import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { getMultipartRequest } from '../multipart/request';
import { StorageFile } from '../storage/storage';

export const UploadedFile = createParamDecorator(
  async (_data, ctx: ExecutionContext): Promise<StorageFile | undefined> => {
    const req = getMultipartRequest(ctx.switchToHttp());

    return req?.storageFile;
  },
);
