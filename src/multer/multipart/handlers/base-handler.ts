import { BadRequestException } from '@nestjs/common';
import { BodyData } from 'hono/utils/body';

import { StorageFile } from '../../storage/storage';
import { removeStorageFiles } from '../file';
import { filterUpload } from '../filter';
import { UploadOptions } from '../options';
import { THonoRequest, getParts } from '../request';

export interface ProcessedFile {
  file: StorageFile;
  fieldName: string;
}

export interface FileProcessResult {
  body: BodyData;
  remove: () => Promise<void>;
}

export interface SingleFileResult extends FileProcessResult {
  file?: StorageFile;
}

export interface MultipleFilesResult extends FileProcessResult {
  files: StorageFile[];
}

export interface FileFieldsResult extends FileProcessResult {
  files: Record<string, StorageFile[]>;
}

export class FileHandler {
  private readonly body: BodyData = {};
  private readonly files: StorageFile[] = [];
  private readonly filesByField: Record<string, StorageFile[]> = {};
  private processed = false;
  private cleanedUp = false;

  constructor(
    private readonly req: THonoRequest,
    private readonly options: UploadOptions,
  ) {}

  /**
   * Processes all parts in the multipart request.
   */
  async process(
    processor: (fieldName: string, file: File) => Promise<void>,
  ): Promise<void> {
    if (this.processed) {
      throw new Error('Request already processed');
    }

    this.processed = true;
    const parts = getParts(this.req, this.options);

    try {
      for await (const [fieldName, part] of Object.entries(parts)) {
        // Handle array of files (for multiple file uploads with same field name)
        if (Array.isArray(part) && part.every((item) => item instanceof File)) {
          for (const file of part) {
            await processor(fieldName, file);
          }
          continue;
        }

        if (!(part instanceof File)) {
          this.body[fieldName] = part;
          continue;
        }

        await processor(fieldName, part);
      }
    } catch (error) {
      await this.cleanup(true);
      throw error;
    }
  }

  /**
   * Handles a single file upload for a specific field.
   */
  async handleSingleFile(
    fieldName: string,
    file: File,
  ): Promise<StorageFile | undefined> {
    const storageFile = await this.options.storage!.handleFile(
      file,
      this.req,
      fieldName,
    );

    if (await filterUpload(this.options, this.req, storageFile)) {
      return storageFile;
    }

    // If file was filtered out, remove it from storage
    await this.options.storage!.removeFile(storageFile, true);
    return undefined;
  }

  /**
   * Validates that the field name matches the expected field name.
   */
  validateFieldName(fieldName: string, expectedFieldName: string): void {
    if (fieldName !== expectedFieldName) {
      throw new BadRequestException(
        `Field "${fieldName}" doesn't accept file.`,
      );
    }
  }

  /**
   * Validates that only one file is uploaded for a field.
   */
  validateSingleFile(currentFile: StorageFile | undefined): void {
    if (currentFile) {
      throw new BadRequestException('Field accepts only one file.');
    }
  }

  /**
   * Validates the maximum number of files for a field.
   */
  validateMaxCount(
    fieldName: string,
    currentCount: number,
    maxCount: number,
  ): void {
    if (currentCount >= maxCount) {
      throw new BadRequestException(
        `Field "${fieldName}" accepts max ${maxCount} files.`,
      );
    }
  }

  /**
   * Adds a file to the files collection.
   */
  addFile(fieldName: string, file: StorageFile): void {
    this.files.push(file);

    if (!this.filesByField[fieldName]) {
      this.filesByField[fieldName] = [];
    }
    this.filesByField[fieldName].push(file);
  }

  /**
   * Returns all processed files.
   */
  getFiles(): StorageFile[] {
    return [...this.files];
  }

  /**
   * Returns files grouped by field name.
   */
  getFilesByField(): Record<string, StorageFile[]> {
    return { ...this.filesByField };
  }

  /**
   * Returns the request body.
   */
  getBody(): BodyData {
    return { ...this.body };
  }

  /**
   * Cleans up all uploaded files.
   * Prevents multiple cleanups and clears references to avoid memory leaks.
   */
  async cleanup(error?: boolean): Promise<void> {
    if (this.cleanedUp) {
      return;
    }

    this.cleanedUp = true;

    await removeStorageFiles(this.options.storage!, this.files, error);

    // Clear references to allow garbage collection
    this.files.length = 0;
    for (const key of Object.keys(this.filesByField)) {
      delete this.filesByField[key];
    }
  }

  /**
   * Creates a remove function for cleanup that prevents multiple calls.
   */
  createRemoveFunction(): () => Promise<void> {
    let called = false;

    return async () => {
      if (called) {
        return;
      }
      called = true;
      await this.cleanup();
    };
  }
}
