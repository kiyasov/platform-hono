import { StorageFile, Storage } from './storage';
import { HonoRequest } from 'hono';

export interface MemoryStorageFile extends StorageFile {
  buffer: Buffer;
}

export class MemoryStorage implements Storage<MemoryStorageFile> {
  public async handleFile(file: File, _req: HonoRequest, fieldName: string) {
    const buffer = await file.arrayBuffer().then(Buffer.from);

    return {
      buffer,
      size: buffer.length,
      encoding: 'utf-8',
      mimetype: file.type,
      fieldname: fieldName,
      originalFilename: file.name,
    };
  }

  public async removeFile(file: MemoryStorageFile) {
    delete file.buffer;
  }
}
