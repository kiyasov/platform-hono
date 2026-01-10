import { HonoRequest } from 'hono';

/**
 * Represents a file that has been uploaded and stored.
 * Provides metadata about the file and optionally access to its content.
 */
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

/**
 * Storage handler options
 */
export interface StorageOptions {
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Temporary directory path (for disk storage) */
  tmpDir?: string;
}

/**
 * Abstract storage interface for handling uploaded files.
 * Implementations can store files in memory, on disk, or in cloud storage.
 */
export interface Storage<TFile extends StorageFile = StorageFile> {
  /**
   * Handles an uploaded file, storing it according to the implementation strategy.
   * @param file - The file to store
   * @param req - The Hono request object
   * @param fieldName - The field name from the multipart form
   * @returns Information about the stored file
   */
  handleFile(file: File, req: HonoRequest, fieldName: string): Promise<TFile>;

  /**
   * Removes a previously stored file.
   * @param file - The file metadata to remove
   * @param force - Force removal even if storage options don't specify it
   */
  removeFile(file: TFile, force?: boolean): Promise<void>;
}
