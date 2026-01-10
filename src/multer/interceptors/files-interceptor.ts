import { handleMultipartMultipleFiles } from '../multipart/handlers/multiple-files';
import { UploadOptions } from '../multipart/options';
import { createInterceptor } from './base-interceptor';

export function FilesInterceptor(
  fieldname: string,
  maxCount = 1,
  localOptions?: UploadOptions,
): ReturnType<typeof createInterceptor> {
  return createInterceptor(
    localOptions ?? {},
    (req, options) =>
      handleMultipartMultipleFiles(req, fieldname, maxCount, options),
    (req, result) => {
      req.body = result.body;
      req.storageFiles = result.files;
    },
  );
}
