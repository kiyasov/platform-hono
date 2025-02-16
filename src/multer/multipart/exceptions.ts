import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';

export const transformException = (err: Error | undefined) => {
  if (!err || err instanceof HttpException) {
    return err;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const code: string = (err as any).code;

  switch (code) {
    case 'REQ_FILE_TOO_LARGE':
      return new PayloadTooLargeException();
    case 'PARTS_LIMIT':
    case 'FILES_LIMIT':
    case 'PROTO_VIOLATION':
    case 'INVALID_MULTIPART_CONTENT_TYPE':
      return new BadRequestException(err.message);
  }

  return err;
};
