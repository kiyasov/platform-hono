import { BadRequestException } from '@nestjs/common';
import { BodyData } from 'hono/utils/body';

import { StorageFile } from '../../storage';
import { removeStorageFiles } from '../file';
import { filterUpload } from '../filter';
import { UploadOptions } from '../options';
import { THonoRequest, getParts } from '../request';

export const handleMultipartMultipleFiles = async (
  req: THonoRequest,
  fieldname: string,
  maxCount: number,
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

      if (partFieldName !== fieldname) {
        throw new BadRequestException(
          `Field ${partFieldName} doesn't accept files`,
        );
      }

      if (files.length + 1 > maxCount) {
        throw new BadRequestException(
          `Field ${partFieldName} accepts max ${maxCount} files`,
        );
      }

      const file = await options.storage!.handleFile(part, req, partFieldName);

      if (await filterUpload(options, req, file)) {
        files.push(file);
      }
    }
  } catch (error) {
    await removeFiles(error);
    throw error;
  }

  return { body, files, remove: () => removeFiles() };
};
