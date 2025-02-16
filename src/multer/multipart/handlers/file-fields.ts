import { BadRequestException } from '@nestjs/common';
import { BodyData } from 'hono/utils/body';

import { StorageFile } from '../../storage/storage';
import { removeStorageFiles } from '../file';
import { filterUpload } from '../filter';
import { UploadOptions } from '../options';
import { THonoRequest, getParts } from '../request';

export interface UploadField {
  name: string;
  maxCount?: number;
}

export type UploadFieldMapEntry = Required<Pick<UploadField, 'maxCount'>>;

/**
 * Converts an array of upload fields into a map for easy lookup.
 * @param {UploadField[]} uploadFields - Array of upload field definitions.
 * @returns {Map<string, UploadFieldMapEntry>} A map of field names to their max count settings.
 */
export const uploadFieldsToMap = (uploadFields: UploadField[]) =>
  new Map(
    uploadFields.map(({ name, ...opts }) => [name, { maxCount: 1, ...opts }]),
  );

/**
 * Handles multipart file fields by processing form-data parts.
 * @param {THonoRequest} req - The incoming request object.
 * @param {Map<string, UploadFieldMapEntry>} fieldsMap - A map of allowed upload fields.
 * @param {UploadOptions} options - Upload options including storage handler.
 * @returns {Promise<{ body: BodyData, files: Record<string, StorageFile[]>, remove: () => Promise<void> }>} The parsed body and files with a removal function.
 */
export const handleMultipartFileFields = async (
  req: THonoRequest,
  fieldsMap: Map<string, UploadFieldMapEntry>,
  options: UploadOptions,
): Promise<{
  body: BodyData;
  files: Record<string, StorageFile[]>;
  remove: () => Promise<void>;
}> => {
  const parts = getParts(req, options);
  const body: BodyData = {};
  const files: Record<string, StorageFile[]> = {};

  /**
   * Removes stored files in case of an error or cleanup.
   * @param {boolean} [error=false] - Whether the removal is due to an error.
   * @returns {Promise<void>} Resolves after files are removed.
   */
  const removeFiles = async (error?: boolean): Promise<void> => {
    const allFiles = Object.values(files).flat();
    return removeStorageFiles(options.storage!, allFiles, error);
  };

  try {
    for await (const [fieldName, part] of Object.entries(parts)) {
      if (!(part instanceof File)) {
        body[fieldName] = part;
        continue;
      }

      const fieldOptions = fieldsMap.get(fieldName);
      if (!fieldOptions) {
        throw new BadRequestException(
          `Field ${fieldName} doesn't accept files`,
        );
      }

      files[fieldName] = files[fieldName] || [];
      if (files[fieldName].length >= fieldOptions.maxCount) {
        throw new BadRequestException(
          `Field ${fieldName} accepts max ${fieldOptions.maxCount} files`,
        );
      }

      const file = await options.storage!.handleFile(part, req, fieldName);
      if (await filterUpload(options, req, file)) {
        files[fieldName].push(file);
      }
    }
  } catch (error) {
    await removeFiles(true);
    throw error;
  }

  return { body, files, remove: removeFiles };
};
