import { BadRequestException } from "@nestjs/common";
import { HttpArgumentsHost } from "@nestjs/common/interfaces";

import { UploadOptions } from "./options";
import { StorageFile } from "../storage";
import { MultipartFile } from "./file";
import { HonoRequest } from "hono";

export type THonoRequest = HonoRequest & {
  files: Record<string, File[]>;
  body: Record<string, any>;
  storageFile?: StorageFile;
  storageFiles?: StorageFile[] | Record<string, StorageFile[]>;
};

export const getMultipartRequest = (ctx: HttpArgumentsHost) => {
  const req = ctx.getRequest<THonoRequest>();

  if (!req.header("content-type")?.startsWith("multipart/form-data")) {
    throw new BadRequestException("Not a multipart request");
  }

  return req;
};

export const getParts = async (req: THonoRequest, options: UploadOptions) => {
  const files = await req.parseBody({ all: true });

  for (const [key, file] of Object.entries(files)) {
    if (
      file instanceof File &&
      options?.limits?.fileSize &&
      file.size > options.limits.fileSize
    ) {
      throw new BadRequestException(
        `File ${key} is too large. Maximum size is ${options.limits.fileSize} bytes`
      );
    }
  }

  return files;
};

export type MultipartsIterator = AsyncIterableIterator<MultipartFile>;
