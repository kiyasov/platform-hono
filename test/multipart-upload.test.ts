import { describe, expect, test } from 'bun:test';

import { THonoRequest } from '../src/multer/multipart/request';
import { MemoryStorage } from '../src/multer/storage/memory-storage';
import { StorageFile } from '../src/multer/storage/storage';

describe('Multipart Upload Handlers', () => {
  describe('FileHandler', () => {
    test('should process single file upload', async () => {
      const { FileHandler } =
        await import('../src/multer/multipart/handlers/base-handler');
      const storage = new MemoryStorage();
      const options = {
        storage,
      };

      // Create mock file
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      const mockReq = {
        body: {
          file,
          otherField: 'value',
        },
        header: (name: string) =>
          name === 'content-type' ? 'multipart/form-data' : null,
      } as unknown as THonoRequest;

      const handler = new FileHandler(mockReq, options);
      let uploadedFile: StorageFile | undefined;

      await handler.process(async (fieldName, part) => {
        if (part instanceof File) {
          const storageFile = await handler.handleSingleFile(fieldName, part);
          if (storageFile) {
            uploadedFile = storageFile;
            handler.addFile(fieldName, storageFile);
          }
        }
      });

      expect(uploadedFile).toBeDefined();
      expect(uploadedFile?.fieldName).toBe('file');
      expect(uploadedFile?.originalFilename).toBe('test.txt');
      expect(uploadedFile?.mimetype).toContain('text/plain');
      expect(uploadedFile?.size).toBe(12); // 'test content' length

      // Check body
      const body = handler.getBody();
      expect(body.otherField).toBe('value');
      // Note: file is removed from body during processing

      // Cleanup
      await handler.cleanup();
    });

    test('should validate field name', async () => {
      const { FileHandler } =
        await import('../src/multer/multipart/handlers/base-handler');
      const storage = new MemoryStorage();
      const options = { storage };

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockReq = {
        body: { wrongField: file },
        header: () => 'multipart/form-data',
      } as unknown as THonoRequest;

      const handler = new FileHandler(mockReq, options);

      let errorThrown = false;
      try {
        await handler.process(async (fieldName) => {
          handler.validateFieldName(fieldName, 'correctField');
        });
      } catch (err) {
        errorThrown = true;
        expect(err instanceof Error && err.message).toContain(
          "doesn't accept file",
        );
      }

      expect(errorThrown).toBe(true);
    });

    test('should validate max count', async () => {
      const { FileHandler } =
        await import('../src/multer/multipart/handlers/base-handler');
      const storage = new MemoryStorage();
      const options = { storage };

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockReq = {
        body: { files: [file, file] },
        header: () => 'multipart/form-data',
      } as unknown as THonoRequest;

      const handler = new FileHandler(mockReq, options);
      let fileCount = 0;
      const maxCount = 1;

      let errorThrown = false;
      try {
        await handler.process(async (fieldName) => {
          handler.validateMaxCount(fieldName, fileCount, maxCount);
          fileCount++;
        });
      } catch (err) {
        errorThrown = true;
        expect(err instanceof Error && err.message).toContain(
          'accepts max 1 files',
        );
      }

      expect(errorThrown).toBe(true);
    });

    test('should prevent double cleanup', async () => {
      const { FileHandler } =
        await import('../src/multer/multipart/handlers/base-handler');
      const storage = new MemoryStorage();
      const options = { storage };

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockReq = {
        body: { file },
        header: () => 'multipart/form-data',
      } as unknown as THonoRequest;

      const handler = new FileHandler(mockReq, options);

      await handler.process(async (fieldName, part) => {
        const storageFile = await handler.handleSingleFile(fieldName, part);
        if (storageFile) {
          handler.addFile(fieldName, storageFile);
        }
      });

      const removeFn = handler.createRemoveFunction();

      // First cleanup
      await removeFn();

      // Second cleanup should be no-op
      await removeFn();

      // Files array should be cleared
      expect(handler.getFiles()).toHaveLength(0);
    });

    test('should handle filtered file', async () => {
      const { FileHandler } =
        await import('../src/multer/multipart/handlers/base-handler');
      const storage = new MemoryStorage();
      const options = {
        storage,
        filter: () => {
          return false; // Reject file
        },
      };

      const file = new File(['test'], 'test.exe', {
        type: 'application/x-executable',
      });
      const mockReq = {
        body: { file },
        header: () => 'multipart/form-data',
      } as unknown as THonoRequest;

      const handler = new FileHandler(mockReq, options);

      await handler.process(async (fieldName, part) => {
        await handler.handleSingleFile(fieldName, part);
      });

      // File should not be in the list (filtered out)
      expect(handler.getFiles()).toHaveLength(0);
    });
  });

  describe('handleMultipartSingleFile', () => {
    test('should handle single file upload successfully', async () => {
      const { handleMultipartSingleFile } =
        await import('../src/multer/multipart/handlers/single-file');

      const storage = new MemoryStorage();
      const options = { storage };

      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const mockReq = {
        body: { photo: file, name: 'John' },
        header: () => 'multipart/form-data',
      } as unknown as THonoRequest;

      const result = await handleMultipartSingleFile(mockReq, 'photo', options);

      expect(result.file).toBeDefined();
      expect(result.file?.fieldName).toBe('photo');
      expect(result.file?.originalFilename).toBe('photo.jpg');
      expect(result.body.name).toBe('John');
      // Note: The file is removed from body during processing, so this is expected
    });
  });

  describe('handleMultipartMultipleFiles', () => {
    test('should handle multiple files upload', async () => {
      const { handleMultipartMultipleFiles } =
        await import('../src/multer/multipart/handlers/multiple-files');

      const storage = new MemoryStorage();
      const options = { storage };

      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });
      const mockReq = {
        body: { files: [file1, file2] },
        header: () => 'multipart/form-data',
      } as unknown as THonoRequest;

      const result = await handleMultipartMultipleFiles(
        mockReq,
        'files',
        5,
        options,
      );

      expect(result.files).toHaveLength(2);
      expect(result.files[0].fieldName).toBe('files');
      expect(result.files[1].fieldName).toBe('files');
    });

    test('should enforce max count limit', async () => {
      const { handleMultipartMultipleFiles } =
        await import('../src/multer/multipart/handlers/multiple-files');

      const storage = new MemoryStorage();
      const options = { storage };

      const file1 = new File(['content1'], 'file1.txt', {
        type: 'text/plain',
      });
      const file2 = new File(['content2'], 'file2.txt', {
        type: 'text/plain',
      });
      const file3 = new File(['content3'], 'file3.txt', {
        type: 'text/plain',
      });

      const mockReq = {
        body: { files: [file1, file2, file3] },
        header: () => 'multipart/form-data',
      } as unknown as THonoRequest;

      let errorThrown = false;
      try {
        await handleMultipartMultipleFiles(mockReq, 'files', 2, options);
      } catch (err) {
        errorThrown = true;
        expect(err instanceof Error && err.message).toContain(
          'accepts max 2 files',
        );
      }

      expect(errorThrown).toBe(true);
    });
  });

  describe('handleMultipartFileFields', () => {
    test('should handle multiple file fields', async () => {
      const { handleMultipartFileFields, uploadFieldsToMap } =
        await import('../src/multer/multipart/handlers/file-fields');

      const storage = new MemoryStorage();
      const options = { storage };

      const avatar = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      const document = new File(['doc'], 'doc.pdf', {
        type: 'application/pdf',
      });
      const mockReq = {
        body: { avatar, document },
        header: () => 'multipart/form-data',
      } as unknown as THonoRequest;

      const fieldsMap = uploadFieldsToMap([
        { name: 'avatar', maxCount: 1 },
        { name: 'document', maxCount: 1 },
      ]);

      const result = await handleMultipartFileFields(
        mockReq,
        fieldsMap,
        options,
      );

      expect(result.files.avatar).toHaveLength(1);
      expect(result.files.document).toHaveLength(1);
      expect(result.files.avatar[0].originalFilename).toBe('avatar.jpg');
      expect(result.files.document[0].originalFilename).toBe('doc.pdf');
    });

    test('should reject unknown file fields', async () => {
      const { handleMultipartFileFields, uploadFieldsToMap } =
        await import('../src/multer/multipart/handlers/file-fields');

      const storage = new MemoryStorage();
      const options = { storage };

      const file = new File(['content'], 'unknown.txt', { type: 'text/plain' });
      const mockReq = {
        body: { unknown: file },
        header: () => 'multipart/form-data',
      } as unknown as THonoRequest;

      const fieldsMap = uploadFieldsToMap([{ name: 'allowed', maxCount: 1 }]);

      let errorThrown = false;
      try {
        await handleMultipartFileFields(mockReq, fieldsMap, options);
      } catch (err) {
        errorThrown = true;
        expect(err instanceof Error && err.message).toContain(
          "doesn't accept files",
        );
      }

      expect(errorThrown).toBe(true);
    });
  });

  describe('handleMultipartAnyFiles', () => {
    test('should accept any files', async () => {
      const { handleMultipartAnyFiles } =
        await import('../src/multer/multipart/handlers/any-files');

      const storage = new MemoryStorage();
      const options = { storage };

      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.jpg', { type: 'image/jpeg' });
      const mockReq = {
        body: { file1, file2, name: 'test' },
        header: () => 'multipart/form-data',
      } as unknown as THonoRequest;

      const result = await handleMultipartAnyFiles(mockReq, options);

      expect(result.files).toHaveLength(2);
      expect(result.body.name).toBe('test');
    });
  });
});
