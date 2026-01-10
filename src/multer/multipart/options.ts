import { DiskStorage, MemoryStorage, Storage, StorageFile } from '../storage';
import { UploadFilterHandler } from './filter';

/**
 * Upload limits configuration
 */
export interface UploadLimits {
  /** Maximum file size in bytes */
  fileSize?: number;
  /** Maximum number of files for a field */
  files?: number;
  /** Maximum number of fields (for file fields upload) */
  fields?: number;
}

/**
 * File upload options
 */
export type UploadOptions = {
  /** Destination directory for disk storage */
  dest?: string;
  /** Storage implementation */
  storage?: Storage<StorageFile>;
  /** File filter function */
  filter?: UploadFilterHandler;
  /** Upload limits */
  limits?: UploadLimits;
};

export const DEFAULT_UPLOAD_OPTIONS: Partial<UploadOptions> = {
  storage: new MemoryStorage(),
};

export const transformUploadOptions = (opts?: UploadOptions): UploadOptions => {
  if (opts == null) return DEFAULT_UPLOAD_OPTIONS as UploadOptions;

  if (opts.dest != null) {
    return {
      ...opts,
      storage: new DiskStorage({
        dest: opts.dest,
        ...opts.storage?.options,
      }),
    };
  }

  return { ...DEFAULT_UPLOAD_OPTIONS, ...opts } as UploadOptions;
};
