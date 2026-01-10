import { ReadStream, ReadStreamOptions, WriteStream } from './fs-capacitor';
import { StorageFile } from './storage';

/**
 * Memory upload file with optional stream support.
 * Used for files stored in memory (buffer-based).
 * Stream and capacitor fields are optional since not all storage types support them.
 */
export interface MemoryUploadFile extends StorageFile {
  /** Creates a readable stream for the file content (capacitor storage only) */
  createReadStream?(options?: ReadStreamOptions): ReadStream;
  /** The write stream capacitor (capacitor storage only) */
  capacitor?: WriteStream;
  /** Original File object if available */
  file?: File;
}

/**
 * Stream upload file with guaranteed stream support.
 * Used in GraphQL resolvers when CapacitorStorage is the default storage.
 * Ensures createReadStream and capacitor are always available for streaming file content.
 */
export interface StreamUploadFile extends StorageFile {
  /** Creates a readable stream for the file content */
  createReadStream(options?: ReadStreamOptions): ReadStream;
  /** The write stream capacitor */
  capacitor: WriteStream;
  /** Original File object if available */
  file?: File;
}

/**
 * Upload promise wrapper for GraphQL file uploads.
 * Manages the asynchronous file upload process with proper error handling.
 */
export class Upload {
  promise: Promise<MemoryUploadFile>;
  resolve: (file?: MemoryUploadFile) => void;
  reject: (error?: Error | string) => void;
  file?: MemoryUploadFile;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = (file) => {
        this.file = file;
        resolve(file);
      };
      this.reject = reject;
    });

    // Prevent unhandled promise rejection errors
    // See: https://github.com/nodejs/node/issues/20392
    this.promise.catch(() => {});
  }
}
