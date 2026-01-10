import { UploadOptions } from '../options';
import { THonoRequest } from '../request';
import { FileHandler, MultipleFilesResult } from './base-handler';

export const handleMultipartAnyFiles = async (
  req: THonoRequest,
  options: UploadOptions,
): Promise<MultipleFilesResult> => {
  const handler = new FileHandler(req, options);

  await handler.process(async (fieldName, part) => {
    const storageFile = await handler.handleSingleFile(fieldName, part);
    if (storageFile) {
      handler.addFile(fieldName, storageFile);
    }
  });

  return {
    body: handler.getBody(),
    files: handler.getFiles(),
    remove: handler.createRemoveFunction(),
  };
};
