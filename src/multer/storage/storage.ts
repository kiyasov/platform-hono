import { HonoRequest } from 'hono';

export interface StorageFile {
  /** Field name in the multipart form */
  fieldName: string;
  /** Original filename provided by client */
  originalFilename: string;
  /** MIME type of the file */
  mimetype: string;
  /** Encoding type (e.g., '7bit', '8bit', 'binary') */
  encoding: string;
  /** Size of the file in bytes */
  size: number;
  /** Timestamp when file was uploaded (ISO 8601) */
  uploadedAt?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Storage<T extends StorageFile = StorageFile, K = any> {
  handleFile: (file: File, req: HonoRequest, fieldName: string) => Promise<T>;
  removeFile: (file: T | StorageFile, force?: boolean) => Promise<void> | void;
  options?: K;
}
