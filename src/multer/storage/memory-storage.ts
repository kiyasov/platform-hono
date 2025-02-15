import { StorageFile, Storage } from "./storage";
import { HonoRequest } from "hono";

export interface MemoryStorageFile extends StorageFile {
  buffer: Buffer;
  stream: () => ReadableStream<Uint8Array>;
}

export class MemoryStorage implements Storage<MemoryStorageFile> {
  public async handleFile(file: File, _req: HonoRequest, fieldName: string) {
    const buffer = await file
      .stream()
      .pipeTo(new WritableStream())
      .then(() => file.arrayBuffer())
      .then((buffer) => Buffer.from(buffer));

    return {
      buffer,
      size: buffer.length,
      encoding: "utf-8",
      mimetype: file.type,
      fieldname: fieldName,
      originalFilename: file.name,
      stream: () => file.stream(),
      lastModified: file.lastModified,
    };
  }

  public async removeFile(file: MemoryStorageFile) {
    delete file.buffer;
  }
}
