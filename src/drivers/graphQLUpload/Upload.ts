import { ReadStream, ReadStreamOptions, WriteStream } from './fs-capacitor';
import { StorageFile } from './storage';

/**
 * Represents a file upload with metadata and stream access.
 * Compatible with capacitor storage for streaming file content.
 *
 * Extends StorageFile with optional stream support for capacitor storage.
 */
export interface FileUpload extends StorageFile {
  /** Creates a readable stream for the file content (capacitor storage only) */
  createReadStream?(options?: ReadStreamOptions): ReadStream;
  /** The write stream capacitor (capacitor storage only) */
  capacitor?: WriteStream;
  /** Original File object if available */
  file?: File;
}

/**
 * Upload promise wrapper for GraphQL file uploads.
 * Manages the asynchronous file upload process with proper error handling.
 */
export class Upload {
  promise: Promise<FileUpload>;
  resolve: (file?: FileUpload) => void;
  reject: (error?: Error | string) => void;
  file?: FileUpload;

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
