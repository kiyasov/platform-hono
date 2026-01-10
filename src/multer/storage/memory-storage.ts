import { HonoRequest } from 'hono';

import { StorageFile, Storage } from './storage';

export interface MemoryStorageFile extends StorageFile {
  buffer: Buffer;
  stream: () => ReadableStream<Uint8Array>;
}

export class MemoryStorage implements Storage<MemoryStorageFile> {
  public async handleFile(
    file: File,
    _req: HonoRequest,
    fieldName: string,
  ): Promise<MemoryStorageFile> {
    const buffer = await file
      .stream()
      .pipeTo(new WritableStream())
      .then(() => file.arrayBuffer())
      .then((buf) => Buffer.from(buf));

    return {
      buffer,
      size: buffer.length,
      encoding: 'utf-8',
      mimetype: file.type,
      fieldName: fieldName,
      originalFilename: file.name,
      uploadedAt: new Date().toISOString(),
      stream: () => file.stream(),
    };
  }

  public async removeFile(file: StorageFile): Promise<void> {
    // Check if it's a MemoryStorageFile before deleting buffer
    if ('buffer' in file) {
      delete (file as MemoryStorageFile).buffer;
    }
  }
}
