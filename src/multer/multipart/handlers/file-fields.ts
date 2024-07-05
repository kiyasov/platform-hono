import { BadRequestException } from "@nestjs/common";

import { UploadOptions } from "../options";
import { StorageFile } from "../../storage/storage";
import { THonoRequest, getParts } from "../request";
import { removeStorageFiles } from "../file";
import { filterUpload } from "../filter";
import { HonoRequest } from "hono";

export interface UploadField {
  /**
   * Field name
   */
  name: string;
  /**
   * Max number of files in this field
   */
  maxCount?: number;
}

export type UploadFieldMapEntry = Required<Pick<UploadField, "maxCount">>;

export const uploadFieldsToMap = (uploadFields: UploadField[]) => {
  const map = new Map<string, UploadFieldMapEntry>();

  uploadFields.forEach(({ name, ...opts }) => {
    map.set(name, { maxCount: 1, ...opts });
  });

  return map;
};

export const handleMultipartFileFields = async (
  req: THonoRequest,
  fieldsMap: Map<string, UploadFieldMapEntry>,
  options: UploadOptions
) => {
  const parts = getParts(req, options);
  const body: Record<string, any> = {};

  const files: Record<string, StorageFile[]> = {};

  const removeFiles = async (error?: boolean) => {
    const allFiles = ([] as StorageFile[]).concat(...Object.values(files));
    return await removeStorageFiles(options.storage!, allFiles, error);
  };

  try {
    for await (const [fieldName, part] of Object.entries(parts)) {
      if (!(part instanceof File)) {
        body[fieldName] = part;
        continue;
      }

      const fieldOptions = fieldsMap.get(fieldName);

      if (fieldOptions == null) {
        throw new BadRequestException(
          `Field ${fieldName} doesn't accept files`
        );
      }

      if (files[fieldName] == null) {
        files[fieldName] = [];
      }

      if (files[fieldName].length + 1 > fieldOptions.maxCount) {
        throw new BadRequestException(
          `Field ${fieldName} accepts max ${fieldOptions.maxCount} files`
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

  return {
    body,
    files,
    remove: () => removeFiles(),
  };
};
