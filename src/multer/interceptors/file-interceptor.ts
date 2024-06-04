import { Observable, tap } from 'rxjs';
import {
  CallHandler,
  ExecutionContext,
  mixin,
  NestInterceptor,
  Type,
} from '@nestjs/common';

import { getMultipartRequest } from '../multipart/request';
import { transformUploadOptions, UploadOptions } from '../multipart/options';
import { handleMultipartSingleFile } from '../multipart/handlers/single-file';

export function FileInterceptor(
  fieldname: string,
  options?: UploadOptions,
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    private readonly options: UploadOptions;

    constructor() {
      this.options = transformUploadOptions(options);
    }

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const ctx = context.switchToHttp();
      const req = getMultipartRequest(ctx);

      const { file, body, remove } = await handleMultipartSingleFile(
        req,
        fieldname,
        this.options,
      );

      req.body = body;
      req.storageFile = file;

      return next.handle().pipe(tap(remove));
    }
  }

  const Interceptor = mixin(MixinInterceptor);

  return Interceptor;
}
