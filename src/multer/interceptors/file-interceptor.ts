import {
  CallHandler,
  ExecutionContext,
  mixin,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { finalize } from 'rxjs';

import { handleMultipartSingleFile } from '../multipart/handlers/single-file';
import { transformUploadOptions, UploadOptions } from '../multipart/options';
import { getMultipartRequest } from '../multipart/request';

export function FileInterceptor(
  fieldname: string,
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

      const { file, body, remove } = await handleMultipartSingleFile(
        req,
        fieldname,
        this.options,
      );

      req.body = body;
      req.storageFile = file;

      return next.handle().pipe(finalize(remove));
    }
  }

  const Interceptor = mixin(MixinInterceptor);

  return Interceptor;
}
