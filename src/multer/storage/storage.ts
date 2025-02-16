import { HonoRequest } from 'hono';

export interface StorageFile {
  size: number;
  fieldname: string;
  encoding: string;
  mimetype: string;
  originalFilename: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Storage<T extends StorageFile = StorageFile, K = any> {
  handleFile: (file: File, req: HonoRequest, fieldName: string) => Promise<T>;
  removeFile: (file: T, force?: boolean) => Promise<void> | void;
  options?: K;
}
