import { BadRequestException } from '@nestjs/common';

import { StorageFile } from '../../storage/storage';
import { UploadOptions } from '../options';
import { THonoRequest } from '../request';
import { FileHandler, FileFieldsResult } from './base-handler';

export interface UploadField {
  name: string;
  maxCount?: number;
}

export type UploadFieldMapEntry = Required<Pick<UploadField, 'maxCount'>>;

/**
 * Converts an array of upload fields into a map for easy lookup.
 */
export const uploadFieldsToMap = (
  uploadFields: UploadField[],
): Map<string, UploadFieldMapEntry> =>
  new Map(
    uploadFields.map(({ name, ...opts }) => [name, { maxCount: 1, ...opts }]),
  );

/**
 * Handles multipart file fields by processing form-data parts.
 */
export const handleMultipartFileFields = async (
  req: THonoRequest,
  fieldsMap: Map<string, UploadFieldMapEntry>,
  options: UploadOptions,
): Promise<FileFieldsResult> => {
  const handler = new FileHandler(req, options);
  const files: Record<string, StorageFile[]> = {};

  await handler.process(async (fieldName, part) => {
    const fieldOptions = fieldsMap.get(fieldName);
    if (!fieldOptions) {
      throw new BadRequestException(`Field ${fieldName} doesn't accept files`);
    }

    files[fieldName] = files[fieldName] || [];
    handler.validateMaxCount(
      fieldName,
      files[fieldName].length,
      fieldOptions.maxCount,
    );

    const storageFile = await handler.handleSingleFile(fieldName, part);
    if (storageFile) {
      files[fieldName].push(storageFile);
      handler.addFile(fieldName, storageFile);
    }
  });

  return {
    body: handler.getBody(),
    files,
    remove: handler.createRemoveFunction(),
  };
};
