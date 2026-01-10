import {
  CallHandler,
  ExecutionContext,
  mixin,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { finalize } from 'rxjs';
import { Observable } from 'rxjs/internal/Observable';

import { FileProcessResult } from '../multipart/handlers/base-handler';
import { transformUploadOptions, UploadOptions } from '../multipart/options';
import { getMultipartRequest } from '../multipart/request';

export type HandlerFunction<T extends FileProcessResult> = (
  req: ReturnType<typeof getMultipartRequest>,
  options: UploadOptions,
) => Promise<T>;

export function createInterceptor<T extends FileProcessResult>(
  rawOptions: UploadOptions,
  handlerFn: HandlerFunction<T>,
  resultProcessor: (
    req: ReturnType<typeof getMultipartRequest>,
    result: T,
  ) => void,
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    private readonly options: UploadOptions;

    constructor() {
      this.options = transformUploadOptions(rawOptions);
    }

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<unknown>> {
      const ctx = context.switchToHttp();
      const req = getMultipartRequest(ctx);

      if (!req.header('content-type')?.startsWith('multipart/form-data')) {
        return next.handle();
      }

      const result = await handlerFn(req, this.options);
      resultProcessor(req, result);

      return next.handle().pipe(finalize(result.remove));
    }
  }

  return mixin(MixinInterceptor);
}
