import { ReadStream, ReadStreamOptions, WriteStream } from './fs-capacitor';

export interface FileUpload {
  filename: string;
  fieldName: string;
  mimetype: string;
  encoding: string;

  createReadStream(options?: ReadStreamOptions): ReadStream;

  capacitor: WriteStream;
}

export class Upload {
  promise: Promise<FileUpload>;
  resolve: (file?: FileUpload) => void;
  reject: (error?: Error | string) => void;
  file?: FileUpload;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = (file) => {
        this.file = file;

        resolve(file);
      };

      this.reject = reject;
    });

    // Prevent errors crashing Node.js, see:
    // https://github.com/nodejs/node/issues/20392
    this.promise.catch(() => {});
  }
}
