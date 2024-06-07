import { Observable, tap } from "rxjs";
import {
  CallHandler,
  ExecutionContext,
  mixin,
  NestInterceptor,
  Type,
} from "@nestjs/common";

import { getMultipartRequest } from "../multipart/request";
import { transformUploadOptions, UploadOptions } from "../multipart/options";
import { handleMultipartAnyFiles } from "../multipart/handlers/any-files";

export function AnyFilesInterceptor(
  options?: UploadOptions
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    private readonly options: UploadOptions;

    constructor() {
      this.options = transformUploadOptions(options);
    }

    async intercept(
      context: ExecutionContext,
      next: CallHandler
    ): Promise<Observable<any>> {
      const ctx = context.switchToHttp();
      const req = getMultipartRequest(ctx);

      if (!req.header("content-type")?.startsWith("multipart/form-data")) {
        return next.handle();
      }

      const { body, files, remove } = await handleMultipartAnyFiles(
        req,
        this.options
      );

      req.body = body;
      req.storageFiles = files;

      return next.handle().pipe(tap(remove));
    }
  }

  const Interceptor = mixin(MixinInterceptor);

  return Interceptor;
}
