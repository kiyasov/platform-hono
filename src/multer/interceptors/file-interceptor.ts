import { handleMultipartSingleFile } from '../multipart/handlers/single-file';
import { UploadOptions } from '../multipart/options';
import { createInterceptor } from './base-interceptor';

export function FileInterceptor(
  fieldname: string,
  localOptions?: UploadOptions,
): ReturnType<typeof createInterceptor> {
  return createInterceptor(
    localOptions ?? {},
    (req, options) => handleMultipartSingleFile(req, fieldname, options),
    (req, result) => {
      req.body = result.body;
      req.storageFile = result.file;
    },
  );
}
