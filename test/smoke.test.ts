import { describe, expect, test } from 'bun:test';

import { THonoRequest } from '../src/multer/multipart/request';

/**
 * Simple smoke tests to verify core functionality works
 */
describe('File Upload Smoke Tests', () => {
  test('MemoryStorage should store and retrieve file', async () => {
    const { MemoryStorage } =
      await import('../src/multer/storage/memory-storage');
    const storage = new MemoryStorage();

    const file = new File(['test content'], 'test.txt', {
      type: 'text/plain',
    });
    const mockReq = {
      header: () => 'multipart/form-data',
    } as unknown as THonoRequest;

    const storedFile = await storage.handleFile(file, mockReq, 'file');

    expect(storedFile).toBeDefined();
    expect(storedFile.fieldName).toBe('file');
    expect(storedFile.originalFilename).toBe('test.txt');
    expect(storedFile.size).toBe(12);
    expect(storedFile.buffer).toBeInstanceOf(Buffer);
    expect(storedFile.buffer.byteLength).toBe(12);

    // Cleanup
    await storage.removeFile(storedFile);
  });

  test('FileHandler should process file without errors', async () => {
    const { FileHandler } =
      await import('../src/multer/multipart/handlers/base-handler');
    const { MemoryStorage } =
      await import('../src/multer/storage/memory-storage');

    const storage = new MemoryStorage();
    const options = { storage };

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const mockReq = {
      body: { file },
      header: () => 'multipart/form-data',
    } as unknown as THonoRequest;

    const handler = new FileHandler(mockReq, options);

    let processed = false;
    await handler.process(async (fieldName, part) => {
      if (part instanceof File) {
        const storageFile = await handler.handleSingleFile(fieldName, part);
        if (storageFile) {
          processed = true;
          expect(storageFile.fieldName).toBe('file');
          expect(storageFile.originalFilename).toBe('test.txt');
        }
      }
    });

    expect(processed).toBe(true);

    // Cleanup
    await handler.cleanup();
  });

  test('createRemoveFunction should prevent multiple calls', async () => {
    const { FileHandler } =
      await import('../src/multer/multipart/handlers/base-handler');
    const { MemoryStorage } =
      await import('../src/multer/storage/memory-storage');

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

    // First call should work
    await removeFn();

    // Verify files are cleared
    expect(handler.getFiles()).toHaveLength(0);

    // Second call should be no-op (should not throw)
    await removeFn();

    // Should still be empty
    expect(handler.getFiles()).toHaveLength(0);
  });

  test('cleanup should happen automatically on error', async () => {
    const { FileHandler } =
      await import('../src/multer/multipart/handlers/base-handler');
    const { MemoryStorage } =
      await import('../src/multer/storage/memory-storage');

    const storage = new MemoryStorage();
    const options = { storage };

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const mockReq = {
      body: { file },
      header: () => 'multipart/form-data',
    } as unknown as THonoRequest;

    const handler = new FileHandler(mockReq, options);

    let errorThrown = false;
    try {
      await handler.process(async (fieldName, part) => {
        const storageFile = await handler.handleSingleFile(fieldName, part);
        if (storageFile) {
          handler.addFile(fieldName, storageFile);
        }
        // Simulate error
        throw new Error('Test error');
      });
    } catch (err) {
      errorThrown = true;
      expect(err instanceof Error && err.message).toBe('Test error');
    }

    expect(errorThrown).toBe(true);

    // Cleanup should have happened automatically
    expect(handler.getFiles()).toHaveLength(0);
  });

  test('getParts should validate file size limits', async () => {
    const { getParts } = await import('../src/multer/multipart/request');

    const largeFile = new File(['x'.repeat(1000)], 'large.txt', {
      type: 'text/plain',
    });
    const smallFile = new File(['small'], 'small.txt', { type: 'text/plain' });

    const mockReq = {
      body: {
        largeFile,
        smallFile,
      },
      header: () => 'multipart/form-data',
    } as unknown as THonoRequest;

    // Should throw error for large file
    let errorThrown = false;
    try {
      getParts(mockReq, { limits: { fileSize: 100 } });
    } catch (err) {
      errorThrown = true;
      expect(err instanceof Error && err.message).toContain('too large');
    }

    expect(errorThrown).toBe(true);
  });

  test('uploadFieldsToMap should create proper map', async () => {
    const { uploadFieldsToMap } =
      await import('../src/multer/multipart/handlers/file-fields');

    const fields = uploadFieldsToMap([
      { name: 'avatar', maxCount: 1 },
      { name: 'photos', maxCount: 5 },
      { name: 'documents' },
    ]);

    expect(fields.get('avatar')).toEqual({ maxCount: 1 });
    expect(fields.get('photos')).toEqual({ maxCount: 5 });
    expect(fields.get('documents')).toEqual({ maxCount: 1 }); // default
  });

  test('handleMultipartSingleFile should return expected structure', async () => {
    const { handleMultipartSingleFile } =
      await import('../src/multer/multipart/handlers/single-file');
    const { MemoryStorage } =
      await import('../src/multer/storage/memory-storage');

    const storage = new MemoryStorage();
    const options = { storage };

    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    const mockReq = {
      body: { photo: file, title: 'My Photo' },
      header: () => 'multipart/form-data',
    } as unknown as THonoRequest;

    const result = await handleMultipartSingleFile(mockReq, 'photo', options);

    expect(result).toHaveProperty('body');
    expect(result).toHaveProperty('file');
    expect(result).toHaveProperty('remove');
    expect(result.file).toBeDefined();
    expect(result.body.title).toBe('My Photo');

    // Test remove function
    await result.remove();
  });

  test('transformUploadOptions should provide defaults', async () => {
    const { transformUploadOptions } =
      await import('../src/multer/multipart/options');

    const noOptions = transformUploadOptions();
    expect(noOptions.storage).toBeDefined();

    const withOptions = transformUploadOptions({ dest: '/tmp' });
    expect(withOptions.storage).toBeDefined();
    expect(withOptions.dest).toBe('/tmp');
  });
});
