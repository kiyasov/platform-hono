import { BadRequestException } from '@nestjs/common';
import { BodyData } from 'hono/utils/body';

import { StorageFile } from '../../storage';
import { filterUpload } from '../filter';
import { UploadOptions } from '../options';
import { THonoRequest, getParts } from '../request';

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
) => {
  const parts = getParts(req, options);
  const body: BodyData = {};
  let file: StorageFile | undefined;

  /**
   * Removes uploaded file in case of an error or cleanup.
   * @param error - Whether the removal is due to an error.
   */
  const removeFiles = async (error?: boolean) => {
    if (!file) return;
    await options.storage!.removeFile(file, error);
  };

  try {
    for await (const [partFieldName, part] of Object.entries(parts)) {
      if (!(part instanceof File)) {
        body[partFieldName] = part;
        continue;
      }

      if (partFieldName !== fieldname) {
        throw new BadRequestException(
          `Field "${partFieldName}" doesn't accept file.`,
        );
      }

      if (file) {
        throw new BadRequestException(
          `Field "${fieldname}" accepts only one file.`,
        );
      }

      const _file = await options.storage!.handleFile(part, req, partFieldName);

      if (await filterUpload(options, req, _file)) {
        file = _file;
      }
    }
  } catch (error) {
    await removeFiles(true);
    throw error;
  }

  return {
    body,
    file,
    remove: () => removeFiles(),
  };
};
