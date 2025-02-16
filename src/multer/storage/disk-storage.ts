import { createWriteStream } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { HonoRequest } from 'hono';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { getUniqueFilename, pathExists } from '../fs';
import { StorageFile, Storage } from './storage';

export interface DiskStorageFile extends StorageFile {
  dest: string;
  filename: string;
  path: string;
}

type DiskStorageOptionHandler =
  | ((file: File, req: HonoRequest) => Promise<string> | string)
  | string;

export interface DiskStorageOptions {
  dest?: DiskStorageOptionHandler;
  filename?: DiskStorageOptionHandler;
  removeAfter?: boolean;
}

const excecuteStorageHandler = (
  file: File,
  req: HonoRequest,
  obj?: DiskStorageOptionHandler,
) => {
  if (typeof obj === 'function') {
    return obj(file, req);
  }

  if (obj != null) return obj;

  return null;
};

const ENV_TESTS_STORAGE_TMP_PATH = process.env.__TESTS_TMP_PATH__;
export class DiskStorage
  implements Storage<DiskStorageFile, DiskStorageOptions>
{
  public readonly options?: DiskStorageOptions;

  constructor(options?: DiskStorageOptions) {
    this.options = options;

    if (ENV_TESTS_STORAGE_TMP_PATH != null) {
      this.options = { ...this.options, dest: ENV_TESTS_STORAGE_TMP_PATH };
    }
  }

  public async handleFile(file: File, req: HonoRequest, fieldName: string) {
    const filename = await this.getFilename(file, req, this.options?.filename);
    const dest = await this.getFileDestination(file, req, this.options?.dest);

    if (!(await pathExists(dest))) {
      await mkdir(dest, { recursive: true });
    }

    const path = join(dest, filename);
    const stream = createWriteStream(path);

    const buffer = await file.arrayBuffer();
    const readableStream = Readable.from(Buffer.from(buffer));

    await pipeline(readableStream, stream);

    return {
      size: stream.bytesWritten,
      dest,
      filename,
      originalFilename: file.name,
      path,
      mimetype: file.type,
      encoding: 'utf-8',
      fieldname: fieldName,
    };
  }

  public async removeFile(file: DiskStorageFile, force?: boolean) {
    if (!this.options?.removeAfter && !force) return;

    await unlink(file.path);
  }

  protected async getFilename(
    file: File,
    req: HonoRequest,
    obj?: DiskStorageOptionHandler,
  ): Promise<string> {
    return (
      excecuteStorageHandler(file, req, obj) ?? getUniqueFilename(file.name)
    );
  }

  protected async getFileDestination(
    file: File,
    req: HonoRequest,
    obj?: DiskStorageOptionHandler,
  ): Promise<string> {
    return excecuteStorageHandler(file, req, obj) ?? tmpdir();
  }
}
