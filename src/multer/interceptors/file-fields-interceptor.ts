import {
  handleMultipartFileFields,
  UploadField,
  uploadFieldsToMap,
} from '../multipart/handlers/file-fields';
import { UploadOptions } from '../multipart/options';
import { createInterceptor } from './base-interceptor';

export function FileFieldsInterceptor(
  uploadFields: UploadField[],
  localOptions?: UploadOptions,
): ReturnType<typeof createInterceptor> {
  const fieldsMap = uploadFieldsToMap(uploadFields);

  return createInterceptor(
    localOptions ?? {},
    (req, options) => handleMultipartFileFields(req, fieldsMap, options),
    (req, result) => {
      req.body = result.body;
      req.storageFiles = result.files;
    },
  );
}
