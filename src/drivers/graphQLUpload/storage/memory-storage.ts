import { HonoRequest } from 'hono';

import { MemoryUploadFile } from '../Upload';
import { Storage, StorageOptions } from './storage';

/**
 * In-memory storage file with buffer
 */
export interface MemoryStorageFile extends MemoryUploadFile {
  /** Buffer containing the file data */
  buffer: Buffer;
  /** Original File object */
  file: File;
}

/**
 * In-memory storage implementation for file uploads.
 * Files are stored as buffers in memory. Suitable for small files and testing.
 */
export class MemoryStorage implements Storage<MemoryStorageFile> {
  public readonly options?: StorageOptions;

  constructor(options?: StorageOptions) {
    this.options = options;
  }

  public async handleFile(
    file: File,
    _req: HonoRequest,
    fieldName: string,
  ): Promise<MemoryStorageFile> {
    // Check file size limit
    if (this.options?.maxSize && file.size > this.options.maxSize) {
      throw new Error(
        `File "${file.name}" exceeds maximum size of ${this.options.maxSize} bytes`,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    return {
      fieldName: fieldName,
      originalFilename: file.name,
      mimetype: file.type,
      encoding: '7bit',
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
      buffer,
      file,
    };
  }

  public async removeFile(file: MemoryStorageFile): Promise<void> {
    if ('buffer' in file) {
      delete (file as MemoryStorageFile).buffer;
    }
  }
}
