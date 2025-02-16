import { BodyData } from 'hono/utils/body';

import { StorageFile } from '../../storage';
import { removeStorageFiles } from '../file';
import { filterUpload } from '../filter';
import { UploadOptions } from '../options';
import { THonoRequest, getParts } from '../request';

export const handleMultipartAnyFiles = async (
  req: THonoRequest,
  options: UploadOptions,
) => {
  const parts = getParts(req, options);

  const body: BodyData = {};

  const files: StorageFile[] = [];

  const removeFiles = async (error?: boolean) => {
    return await removeStorageFiles(options.storage!, files, error);
  };

  try {
    for await (const [partFieldName, part] of Object.entries(parts)) {
      if (!(part instanceof File)) {
        body[partFieldName] = part;
        continue;
      }
      const file = await options.storage!.handleFile(part, req, partFieldName);

      if (await filterUpload(options, req, file)) {
        files.push(file);
      }
    }
  } catch (error) {
    await removeFiles(true);
    throw error;
  }

  return { body, files, remove: () => removeFiles() };
};
