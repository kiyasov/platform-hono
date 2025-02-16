import { Readable } from 'stream';

import { Storage, StorageFile } from '../storage';

export type MultipartFile = Omit<File[], 'file'> & {
  value?: unknown;
  file: Readable & { truncated?: boolean };
};

export const removeStorageFiles = async (
  storage: Storage,
  files?: (StorageFile | undefined)[],
  force?: boolean,
) => {
  if (files == null) return;
  await Promise.all(
    files.map((file) => file && storage.removeFile(file, force)),
  );
};
