import { describe, expect, test } from 'bun:test';

import {
  processRequest,
  ProcessRequestOptions,
} from '../src/drivers/graphQLUpload/processRequest';
import {
  CapacitorStorage,
  type CapacitorStorageFile,
} from '../src/drivers/graphQLUpload/storage/capacitor-storage';
import {
  MemoryStorage,
  type MemoryStorageFile,
} from '../src/drivers/graphQLUpload/storage/memory-storage';
import { Storage } from '../src/drivers/graphQLUpload/storage/storage';
import { FileUpload, Upload } from '../src/drivers/graphQLUpload/Upload';
import {
  asContext,
  asHonoRequest,
  type MockContext,
  type MockRequest,
} from './helpers';

describe('GraphQL Upload', () => {
  describe('Upload class', () => {
    test('should create upload promise', () => {
      const upload = new Upload();

      expect(upload.promise).toBeInstanceOf(Promise);
      expect(upload.resolve).toBeInstanceOf(Function);
      expect(upload.reject).toBeInstanceOf(Function);
      expect(upload.file).toBeUndefined();
    });

    test('should resolve upload with file', async () => {
      const upload = new Upload();
      const mockFile: FileUpload = {
        fieldName: 'file',
        originalFilename: 'test.txt',
        mimetype: 'text/plain',
        encoding: '7bit',
        size: 4,
        uploadedAt: new Date().toISOString(),
      };

      upload.resolve(mockFile);

      const result = await upload.promise;
      expect(result).toEqual(mockFile);
      expect(upload.file).toEqual(mockFile);
    });

    test('should reject upload with error', async () => {
      const upload = new Upload();
      const error = new Error('Upload failed');

      upload.reject(error);

      let caughtError: Error | undefined;
      try {
        await upload.promise;
      } catch (e) {
        caughtError = e as Error;
      }

      expect(caughtError).toEqual(error);
    });

    test('should handle unhandled rejections gracefully', async () => {
      const upload = new Upload();
      upload.reject(new Error('Test error'));

      // Should not throw unhandled rejection
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(true).toBe(true);
    });
  });

  describe('MemoryStorage', () => {
    test('should store file in memory', async () => {
      const storage = new MemoryStorage();
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      const mockReq: MockRequest = {
        header: () => 'multipart/form-data',
      };

      const result = await storage.handleFile(
        file,
        asHonoRequest(mockReq),
        'file',
      );

      expect(result.fieldName).toBe('file');
      expect(result.originalFilename).toBe('test.txt');
      expect(result.mimetype).toContain('text/plain');
      expect(result.encoding).toBe('7bit');
      expect(result.size).toBe(12);
      expect(result.uploadedAt).toBeDefined();
      expect((result as MemoryStorageFile).buffer).toBeInstanceOf(Buffer);
      expect((result as MemoryStorageFile).buffer?.toString()).toBe(
        'test content',
      );
    });

    test('should enforce max file size', async () => {
      const storage = new MemoryStorage({ maxSize: 10 });
      const file = new File(['this is too large'], 'test.txt', {
        type: 'text/plain',
      });

      const mockReq: MockRequest = {
        header: () => 'multipart/form-data',
      };

      let errorThrown = false;
      try {
        await storage.handleFile(file, asHonoRequest(mockReq), 'file');
      } catch (err) {
        errorThrown = true;
        expect(err instanceof Error && err.message).toContain(
          'exceeds maximum size',
        );
      }

      expect(errorThrown).toBe(true);
    });

    test('should remove file buffer', async () => {
      const storage = new MemoryStorage();
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      const mockReq: MockRequest = {
        header: () => 'multipart/form-data',
      };

      const result = await storage.handleFile(
        file,
        asHonoRequest(mockReq),
        'file',
      );

      expect((result as MemoryStorageFile).buffer).toBeDefined();

      await storage.removeFile(result);

      // Buffer should be deleted
      expect((result as MemoryStorageFile).buffer).toBeUndefined();
    });
  });

  describe('CapacitorStorage', () => {
    test('should store file with capacitor', async () => {
      const storage = new CapacitorStorage();
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      const mockReq: MockRequest = {
        header: () => 'multipart/form-data',
      };

      const result = await storage.handleFile(
        file,
        asHonoRequest(mockReq),
        'file',
      );

      expect(result.fieldName).toBe('file');
      expect(result.originalFilename).toBe('test.txt');
      expect(result.mimetype).toContain('text/plain');
      expect(result.encoding).toBe('7bit');
      expect(result.size).toBe(12);
      expect(result.uploadedAt).toBeDefined();
      expect(result.capacitor).toBeDefined();
      expect(result.createReadStream).toBeInstanceOf(Function);
    });

    test('should enforce max file size', async () => {
      const storage = new CapacitorStorage({ maxSize: 10 });
      const file = new File(['this is too large'], 'test.txt', {
        type: 'text/plain',
      });

      const mockReq: MockRequest = {
        header: () => 'multipart/form-data',
      };

      let errorThrown = false;
      try {
        await storage.handleFile(file, asHonoRequest(mockReq), 'file');
      } catch (err) {
        errorThrown = true;
        expect(err instanceof Error && err.message).toContain(
          'exceeds maximum size',
        );
      }

      expect(errorThrown).toBe(true);
    });

    test('should release capacitor on remove', async () => {
      const storage = new CapacitorStorage();
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      const mockReq: MockRequest = {
        header: () => 'multipart/form-data',
      };

      const result = await storage.handleFile(
        file,
        asHonoRequest(mockReq),
        'file',
      );

      // Release should not throw
      await storage.removeFile(result);

      // Verify capacitor is released (no throw = success)
      expect(true).toBe(true);
    });
  });

  describe('processRequest', () => {
    test('should process single file upload', async () => {
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      const mockCtx: MockContext = {
        req: {
          parseBody: async () => ({
            operations: JSON.stringify({
              query: 'mutation ($file: Upload!) { uploadFile(file: $file) }',
              variables: { file: null },
            }),
            map: JSON.stringify({ '0': ['variables.file'] }),
            '0': file,
          }),
          header: () => 'multipart/form-data',
        },
      };

      const result = await processRequest(asContext(mockCtx));

      expect((result as { variables: unknown }).variables).toBeDefined();
      expect(
        (result as { variables: { file: unknown } }).variables.file,
      ).toBeInstanceOf(Upload);
    });

    test('should process multiple files upload', async () => {
      const file1 = new File(['content1'], 'file1.txt', {
        type: 'text/plain',
      });
      const file2 = new File(['content2'], 'file2.txt', {
        type: 'text/plain',
      });

      const mockCtx: MockContext = {
        req: {
          parseBody: async () => ({
            operations: JSON.stringify({
              query:
                'mutation ($files: [Upload!]!) { uploadFiles(files: $files) }',
              variables: { files: [null, null] },
            }),
            map: JSON.stringify({
              '0': ['variables.files.0'],
              '1': ['variables.files.1'],
            }),
            '0': file1,
            '1': file2,
          }),
          header: () => 'multipart/form-data',
        },
      };

      const result = await processRequest(asContext(mockCtx));

      expect((result as { variables: unknown }).variables).toBeDefined();
      expect(
        (result as { variables: { files: unknown[] } }).variables.files,
      ).toHaveLength(2);
      expect(
        (result as { variables: { files: unknown[] } }).variables.files[0],
      ).toBeInstanceOf(Upload);
      expect(
        (result as { variables: { files: unknown[] } }).variables.files[1],
      ).toBeInstanceOf(Upload);

      // Verify fieldname is extracted correctly from array paths
      const upload1 = (result as { variables: { files: Upload[] } }).variables
        .files[0] as Upload;
      const upload2 = (result as { variables: { files: Upload[] } }).variables
        .files[1] as Upload;
      const uploadedFile1 = await upload1.promise;
      const uploadedFile2 = await upload2.promise;

      expect(uploadedFile1.fieldName).toBe('files');
      expect(uploadedFile1.fieldName).toBe('files');
      expect(uploadedFile2.fieldName).toBe('files');
      expect(uploadedFile2.fieldName).toBe('files');
    });

    test('should use CapacitorStorage by default', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      const mockCtx: MockContext = {
        req: {
          parseBody: async () => ({
            operations: JSON.stringify({
              variables: { file: null },
            }),
            map: JSON.stringify({ '0': ['variables.file'] }),
            '0': file,
          }),
          header: () => 'multipart/form-data',
        },
      };

      const result = await processRequest(asContext(mockCtx));
      const upload = (result as { variables: { file: Upload } }).variables
        .file as Upload;
      const uploadedFile = await upload.promise;

      // Default storage should be CapacitorStorage
      expect((uploadedFile as CapacitorStorageFile).capacitor).toBeDefined();
      expect(uploadedFile.createReadStream).toBeInstanceOf(Function);
      // fieldName should be extracted from GraphQL path, not from multipart index
      expect(uploadedFile.fieldName).toBe('file');
      expect(uploadedFile.fieldName).toBe('file');
    });

    test('should use CapacitorStorage when tmpDir is specified', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      const mockCtx: MockContext = {
        req: {
          parseBody: async () => ({
            operations: JSON.stringify({
              variables: { file: null },
            }),
            map: JSON.stringify({ '0': ['variables.file'] }),
            '0': file,
          }),
          header: () => 'multipart/form-data',
        },
      };

      const options: ProcessRequestOptions = {
        tmpDir: '/tmp',
      };

      const result = await processRequest(asContext(mockCtx), options);
      const upload = (result as { variables: { file: Upload } }).variables
        .file as Upload;
      const uploadedFile = await upload.promise;

      expect((uploadedFile as CapacitorStorageFile).capacitor).toBeDefined();
    });

    test('should use MemoryStorage when explicitly provided', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      const mockCtx: MockContext = {
        req: {
          parseBody: async () => ({
            operations: JSON.stringify({
              variables: { file: null },
            }),
            map: JSON.stringify({ '0': ['variables.file'] }),
            '0': file,
          }),
          header: () => 'multipart/form-data',
        },
      };

      const options: ProcessRequestOptions = {
        storage: new MemoryStorage(),
      };

      const result = await processRequest(asContext(mockCtx), options);
      const upload = (result as { variables: { file: Upload } }).variables
        .file as Upload;
      const uploadedFile = await upload.promise;

      // MemoryStorage should have buffer
      expect((uploadedFile as MemoryStorageFile).buffer).toBeInstanceOf(Buffer);
    });

    test('should use custom storage when provided', async () => {
      const customStorage: Storage<FileUpload> = {
        async handleFile(file, _req, fieldName): Promise<FileUpload> {
          return {
            fieldName,
            originalFilename: file.name,
            mimetype: file.type,
            encoding: '7bit',
            size: file.size,
            uploadedAt: new Date().toISOString(),
          };
        },
        async removeFile() {
          // Custom cleanup
        },
      };

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      const mockCtx: MockContext = {
        req: {
          parseBody: async () => ({
            operations: JSON.stringify({
              variables: { file: null },
            }),
            map: JSON.stringify({ '0': ['variables.file'] }),
            '0': file,
          }),
          header: () => 'multipart/form-data',
        },
      };

      const options: ProcessRequestOptions = {
        storage: customStorage,
      };

      const result = await processRequest(asContext(mockCtx), options);
      const upload = (result as { variables: { file: Upload } }).variables
        .file as Upload;
      const uploadedFile = await upload.promise;

      expect(uploadedFile.originalFilename).toBe('test.txt');
    });

    test('should enforce maxFileSize when specified', async () => {
      const file = new File(['this content is too large'], 'test.txt', {
        type: 'text/plain',
      });

      const mockCtx: MockContext = {
        req: {
          parseBody: async () => ({
            operations: JSON.stringify({
              variables: { file: null },
            }),
            map: JSON.stringify({ '0': ['variables.file'] }),
            '0': file,
          }),
          header: () => 'multipart/form-data',
        },
      };

      const options: ProcessRequestOptions = {
        maxFileSize: 10,
      };

      const result = await processRequest(asContext(mockCtx), options);
      const upload = (result as { variables: { file: Upload } }).variables
        .file as Upload;

      let errorThrown = false;
      try {
        await upload.promise;
      } catch (err) {
        errorThrown = true;
        expect(err instanceof Error && err.message).toContain(
          'exceeds maximum size',
        );
      }

      expect(errorThrown).toBe(true);
    });

    test('should handle complex nested paths', async () => {
      const file = new File(['avatar'], 'avatar.jpg', {
        type: 'image/jpeg',
      });

      const mockCtx: MockContext = {
        req: {
          parseBody: async () => ({
            operations: JSON.stringify({
              variables: {
                user: {
                  profile: {
                    avatar: null,
                  },
                },
              },
            }),
            map: JSON.stringify({ '0': ['variables.user.profile.avatar'] }),
            '0': file,
          }),
          header: () => 'multipart/form-data',
        },
      };

      const result = await processRequest(asContext(mockCtx));

      expect(
        (result as { variables: { user: { profile: { avatar: Upload } } } })
          .variables.user.profile.avatar,
      ).toBeInstanceOf(Upload);
    });
  });
});
