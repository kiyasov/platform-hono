import { handleMultipartAnyFiles } from '../multipart/handlers/any-files';
import { UploadOptions } from '../multipart/options';
import { createInterceptor } from './base-interceptor';

export function AnyFilesInterceptor(
  localOptions?: UploadOptions,
): ReturnType<typeof createInterceptor> {
  return createInterceptor(
    localOptions ?? {},
    (req, options) => handleMultipartAnyFiles(req, options),
    (req, result) => {
      req.body = result.body;
      req.storageFiles = result.files;
    },
  );
}
