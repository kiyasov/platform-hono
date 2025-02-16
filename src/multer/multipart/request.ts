import { BadRequestException } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { HonoRequest } from 'hono';
import { BodyData } from 'hono/utils/body';

import { StorageFile } from '../storage';
import { MultipartFile } from './file';
import { UploadOptions } from './options';

export type THonoRequest = HonoRequest & {
  files: Record<string, File[]>;
  body: BodyData;
  storageFile?: StorageFile;
  storageFiles?: StorageFile[] | Record<string, StorageFile[]>;
};

/**
 * Retrieves the multipart request from the given context.
 * @param ctx - The HTTP arguments host.
 * @returns The request object extended with THonoRequest.
 */
export const getMultipartRequest = (ctx: HttpArgumentsHost): THonoRequest => {
  return ctx.getRequest<THonoRequest>();
};

/**
 * Validates and extracts file parts from the request body.
 * @param req - The request object containing multipart data.
 * @param options - Upload options with file size limits.
 * @returns The request body containing validated file parts.
 * @throws {BadRequestException} If any file exceeds the allowed size limit.
 */
export const getParts = (
  req: THonoRequest,
  options: UploadOptions,
): BodyData => {
  const parts = req.body;

  for (const [key, file] of Object.entries(parts)) {
    if (file instanceof File) {
      const maxSize = options?.limits?.fileSize;
      if (maxSize && file.size > maxSize) {
        throw new BadRequestException(
          `File "${key}" is too large. Maximum size is ${maxSize} bytes.`,
        );
      }
    }
  }

  return parts;
};

export type MultipartsIterator = AsyncIterableIterator<MultipartFile>;
