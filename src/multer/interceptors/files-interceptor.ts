import {
  CallHandler,
  ExecutionContext,
  mixin,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { finalize } from 'rxjs';

import { handleMultipartMultipleFiles } from '../multipart/handlers/multiple-files';
import { transformUploadOptions, UploadOptions } from '../multipart/options';
import { getMultipartRequest } from '../multipart/request';

export function FilesInterceptor(
  fieldname: string,
  maxCount = 1,
  options?: UploadOptions,
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    private readonly options: UploadOptions;

    constructor() {
      this.options = transformUploadOptions(options);
    }

    async intercept(context: ExecutionContext, next: CallHandler) {
      const ctx = context.switchToHttp();
      const req = getMultipartRequest(ctx);

      if (!req.header('content-type')?.startsWith('multipart/form-data')) {
        return next.handle();
      }

      const { body, files, remove } = await handleMultipartMultipleFiles(
        req,
        fieldname,
        maxCount,
        this.options,
      );

      req.body = body;
      req.storageFiles = files;

      return next.handle().pipe(finalize(remove));
    }
  }

  const Interceptor = mixin(MixinInterceptor);

  return Interceptor;
}
