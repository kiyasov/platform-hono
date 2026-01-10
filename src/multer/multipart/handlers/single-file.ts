import { StorageFile } from '../../storage/storage';
import { UploadOptions } from '../options';
import { THonoRequest } from '../request';
import { FileHandler, SingleFileResult } from './base-handler';

/**
 * Handles a single file upload in a multipart request.
 * @param req - The request object.
 * @param fieldname - The name of the field that should contain the file.
 * @param options - Upload options with storage configurations.
 * @returns An object containing the request body, uploaded file, and a remove function.
 */
export const handleMultipartSingleFile = async (
  req: THonoRequest,
  fieldname: string,
  options: UploadOptions,
): Promise<SingleFileResult> => {
  const handler = new FileHandler(req, options);
  let file: StorageFile | undefined;

  await handler.process(async (fieldName, part) => {
    handler.validateFieldName(fieldName, fieldname);
    handler.validateSingleFile(file);

    const storageFile = await handler.handleSingleFile(fieldName, part);
    if (storageFile) {
      file = storageFile;
    }
  });

  return {
    body: handler.getBody(),
    file,
    remove: handler.createRemoveFunction(),
  };
};
