import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { close, closeSync, open, read, unlink, unlinkSync, write } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable, ReadableOptions, Writable, WritableOptions } from 'stream';

/**
 * Error thrown when attempting to create a ReadStream from a destroyed WriteStream.
 */
export class ReadAfterDestroyedError extends Error {
  constructor() {
    super('A ReadStream cannot be created from a destroyed WriteStream.');
    this.name = 'ReadAfterDestroyedError';
  }
}

/**
 * Error thrown when attempting to create a ReadStream from a released WriteStream.
 */
export class ReadAfterReleasedError extends Error {
  constructor() {
    super('A ReadStream cannot be created from a released WriteStream.');
    this.name = 'ReadAfterReleasedError';
  }
}

/**
 * Options for creating a ReadStream.
 */
export interface ReadStreamOptions {
  /** Maximum number of bytes to store in the internal buffer before ceasing to read from the underlying resource. */
  highWaterMark?: ReadableOptions['highWaterMark'];
  /** Encoding to use for the readable stream. */
  encoding?: ReadableOptions['encoding'];
}

/**
 * Proxy event emitter to handle process exit events without triggering max listeners warnings.
 */
const PROCESS_EXIT_PROXY = new EventEmitter();
PROCESS_EXIT_PROXY.setMaxListeners(Infinity);
process.once('exit', () => PROCESS_EXIT_PROXY.emit('exit'));

interface WritableState {
  finished: boolean;
}

/**
 * A readable stream that reads from a WriteStream's temporary file.
 * Allows multiple concurrent reads from the same WriteStream.
 */
export class ReadStream extends Readable {
  private _pos = 0;
  private readonly _writeStream: WriteStream;
  private _retryListenersAttached = false;

  /**
   * Creates a new ReadStream attached to a WriteStream.
   * @param writeStream - The WriteStream to read from.
   * @param options - Stream options.
   */
  constructor(writeStream: WriteStream, options?: ReadStreamOptions) {
    super({
      highWaterMark: options?.highWaterMark,
      encoding: options?.encoding,
      autoDestroy: true,
    });
    this._writeStream = writeStream;
  }

  /**
   * Retries reading from the write stream after data is available.
   */
  private _retry = (): void => {
    this._detachRetryListeners();
    this._read(this.readableHighWaterMark || 65536);
  };

  /**
   * Attaches retry listeners to wait for more data or stream completion.
   */
  private _attachRetryListeners(): void {
    if (this._retryListenersAttached) return;
    this._writeStream.on('finish', this._retry);
    this._writeStream.on('write', this._retry);
    this._retryListenersAttached = true;
  }

  /**
   * Detaches retry listeners when they are no longer needed.
   */
  private _detachRetryListeners(): void {
    if (!this._retryListenersAttached) return;
    this._writeStream.off('finish', this._retry);
    this._writeStream.off('write', this._retry);
    this._retryListenersAttached = false;
  }

  /**
   * Internal read implementation that fetches data from the temporary file.
   * @param n - Number of bytes to read.
   */
  _read(n: number): void {
    if (this.destroyed) {
      this._detachRetryListeners();
      return;
    }

    const fd = this._writeStream.getFd();
    if (fd === null) {
      this._writeStream.once('ready', () => this._read(n));
      return;
    }

    const buf = new Uint8Array(Buffer.allocUnsafe(n).buffer);
    read(fd, buf, 0, n, this._pos, (error, bytesRead) => {
      if (error) {
        this.destroy(error);
        this._detachRetryListeners();
        return;
      }

      if (bytesRead) {
        this._pos += bytesRead;
        this.push(buf.slice(0, bytesRead));
        return;
      }

      if (this._writeStream.isWritableFinished()) {
        const writePos = this._writeStream.getWritePosition();
        if (this._pos < writePos) {
          this._read(n);
        } else {
          this.push(null);
          this._detachRetryListeners();
        }
        return;
      }

      this._attachRetryListeners();
    });
  }

  /**
   * Cleanup when the stream is destroyed.
   */
  _destroy(
    error: Error | null,
    callback: (error?: Error | null) => void,
  ): void {
    this._detachRetryListeners();
    super._destroy(error, callback);
  }
}

/**
 * Options for creating a WriteStream.
 */
export interface WriteStreamOptions {
  /** Maximum number of bytes to store in the internal buffer before ceasing to write to the underlying resource. */
  highWaterMark?: WritableOptions['highWaterMark'];
  /** Default encoding to use for the writable stream. */
  defaultEncoding?: WritableOptions['defaultEncoding'];
  /** Function that returns the temporary directory path. */
  tmpdir?: () => string;
}

/**
 * A writable stream that stores data in a temporary file.
 * Supports multiple concurrent ReadStream instances reading from the same file.
 * Automatically cleans up the temporary file when all streams are closed.
 */
export class WriteStream extends Writable {
  private _fd: number | null = null;
  private _path: string | null = null;
  private _pos = 0;
  private readonly _readStreams = new Set<ReadStream>();
  private _released = false;
  private _tmpdir: () => string;

  /**
   * Creates a new WriteStream with a temporary file.
   * @param options - Stream options.
   */
  constructor(options: WriteStreamOptions = {}) {
    super({
      highWaterMark: options.highWaterMark,
      defaultEncoding: options.defaultEncoding,
      autoDestroy: false,
    });
    this._tmpdir = options.tmpdir ?? tmpdir;
    this._initFile();
  }

  /**
   * Initializes the temporary file with a random name.
   * Emits 'ready' when the file is ready for writing.
   */
  private _initFile(): void {
    randomBytes(16, (error, buffer) => {
      if (error) {
        this.destroy(error);
        return;
      }

      this._path = join(
        this._tmpdir(),
        `capacitor-${buffer.toString('hex')}.tmp`,
      );

      open(this._path, 'wx+', 0o600, (error, fd) => {
        if (error) {
          this.destroy(error);
          return;
        }

        PROCESS_EXIT_PROXY.once('exit', this._cleanupSync);
        this._fd = fd;
        this.emit('ready');
      });
    });
  }

  /**
   * Returns the file descriptor for the temporary file.
   * @returns The file descriptor or null if not yet initialized.
   */
  getFd(): number | null {
    return this._fd;
  }

  /**
   * Returns the current write position in the file.
   * @returns The number of bytes written so far.
   */
  getWritePosition(): number {
    return this._pos;
  }

  /**
   * Checks if the writable stream has finished.
   * @returns True if the stream is finished, false otherwise.
   */
  isWritableFinished(): boolean {
    return (this as unknown as { _writableState: WritableState })._writableState
      .finished;
  }

  /**
   * Asynchronously cleans up the temporary file.
   * Closes the file descriptor and deletes the file.
   */
  private _cleanup(callback: (error: Error | null) => void): void {
    const fd = this._fd;
    const path = this._path;

    if (typeof fd !== 'number' || typeof path !== 'string') {
      callback(null);
      return;
    }

    close(fd, (closeError) => {
      this._fd = null;
      PROCESS_EXIT_PROXY.off('exit', this._cleanupSync);

      unlink(path, (unlinkError) => {
        callback(unlinkError ?? closeError ?? null);
      });
    });
  }

  /**
   * Synchronously cleans up the temporary file.
   * Called on process exit to ensure cleanup even if async operations are interrupted.
   */
  private _cleanupSync = (): void => {
    PROCESS_EXIT_PROXY.off('exit', this._cleanupSync);

    if (typeof this._fd === 'number') {
      try {
        closeSync(this._fd);
      } catch {
        // File descriptor already closed
      }
    }

    if (this._path !== null) {
      try {
        unlinkSync(this._path);
      } catch {
        // File already deleted
      }
    }
  };

  /**
   * Called when the stream is finished writing.
   */
  _final(callback: (error?: Error | null) => void): void {
    if (this._fd === null) {
      this.once('ready', () => this._final(callback));
      return;
    }
    callback();
  }

  /**
   * Internal write implementation that writes data to the temporary file.
   */
  _write(
    chunk: Buffer,
    _encoding: string,
    callback: (error?: Error | null) => void,
  ): void {
    if (this._fd === null) {
      this.once('ready', () => this._write(chunk, _encoding, callback));
      return;
    }

    const uint8Array = new Uint8Array(
      chunk.buffer,
      chunk.byteOffset,
      chunk.byteLength,
    );

    write(this._fd, uint8Array, 0, chunk.length, this._pos, (error) => {
      if (error) {
        callback(error);
        return;
      }

      this._pos += chunk.length;
      this.emit('write');
      callback();
    });
  }

  /**
   * Cleanup when the stream is destroyed.
   * Destroys all associated ReadStreams and cleans up the temporary file.
   */
  _destroy(
    error: Error | null,
    callback: (error?: Error | null) => void,
  ): void {
    for (const readStream of this._readStreams) {
      readStream.destroy(error ?? undefined);
    }

    if (this._fd !== null && this._path !== null) {
      this._cleanup((cleanupError) => callback(cleanupError ?? error));
      return;
    }

    this.once('ready', () => {
      this._cleanup((cleanupError) => {
        if (cleanupError) {
          this.emit('error', cleanupError);
        }
      });
    });

    callback(error);
  }

  /**
   * Creates a new ReadStream that reads from this WriteStream.
   * Multiple ReadStreams can be created and will read independently.
   * @param options - Stream options for the ReadStream.
   * @returns A new ReadStream instance.
   * @throws {ReadAfterDestroyedError} If the WriteStream has been destroyed.
   * @throws {ReadAfterReleasedError} If the WriteStream has been released.
   */
  createReadStream(options?: ReadStreamOptions): ReadStream {
    if (this.destroyed) {
      throw new ReadAfterDestroyedError();
    }

    if (this._released) {
      throw new ReadAfterReleasedError();
    }

    const readStream = new ReadStream(this, options);
    this._readStreams.add(readStream);

    readStream.once('close', () => {
      this._readStreams.delete(readStream);

      if (this._released && this._readStreams.size === 0) {
        this.destroy();
      }
    });

    return readStream;
  }

  /**
   * Releases the WriteStream, marking it for cleanup.
   * The stream will be destroyed once all ReadStreams are closed.
   */
  release(): void {
    this._released = true;
    if (this._readStreams.size === 0) {
      this.destroy();
    }
  }
}

export default {
  WriteStream,
  ReadStream,
  ReadAfterDestroyedError,
  ReadAfterReleasedError,
};
