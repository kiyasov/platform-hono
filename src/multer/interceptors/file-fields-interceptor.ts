import {
  CallHandler,
  ExecutionContext,
  mixin,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { finalize } from 'rxjs';

import {
  handleMultipartFileFields,
  UploadField,
  UploadFieldMapEntry,
  uploadFieldsToMap,
} from '../multipart/handlers/file-fields';
import { transformUploadOptions, UploadOptions } from '../multipart/options';
import { getMultipartRequest } from '../multipart/request';

export function FileFieldsInterceptor(
  uploadFields: UploadField[],
  options?: UploadOptions,
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    private readonly options: UploadOptions;

    private readonly fieldsMap: Map<string, UploadFieldMapEntry>;

    constructor() {
      this.options = transformUploadOptions(options);
      this.fieldsMap = uploadFieldsToMap(uploadFields);
    }

    async intercept(context: ExecutionContext, next: CallHandler) {
      const ctx = context.switchToHttp();
      const req = getMultipartRequest(ctx);

      if (!req.header('content-type')?.startsWith('multipart/form-data')) {
        return next.handle();
      }

      const { body, files, remove } = await handleMultipartFileFields(
        req,
        this.fieldsMap,
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
