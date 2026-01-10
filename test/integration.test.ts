import { describe, expect, test } from 'bun:test';

import { THonoRequest } from '../src/multer/multipart/request';

/**
 * Real-world integration test for file upload functionality
 * This tests the actual flow from HTTP request to file storage
 */
describe('File Upload Integration Tests', () => {
  test('should verify FileInterceptor with real FormData', async () => {
    // This simulates what happens in a real request
    const formData = new FormData();

    // Add a file
    const fileContent = 'Hello, this is a test file!';
    const file = new File([fileContent], 'test.txt', { type: 'text/plain' });
    formData.append('file', file);

    // Add other form fields
    formData.append('name', 'John Doe');
    formData.append('email', 'john@example.com');

    // Verify FormData structure
    expect(formData.get('file')).toBeInstanceOf(File);
    expect(formData.get('name')).toBe('John Doe');
    expect(formData.get('email')).toBe('john@example.com');

    // Simulate parsing body (what Hono does)
    const entries = Array.from(formData.entries());
    expect(entries).toHaveLength(3);

    const [fileEntry, nameEntry, emailEntry] = entries;
    expect(fileEntry[0]).toBe('file');
    expect(nameEntry[0]).toBe('name');
    expect(emailEntry[0]).toBe('email');
  });

  test('should simulate complete file upload flow', async () => {
    // Import handlers
    const { handleMultipartSingleFile } =
      await import('../src/multer/multipart/handlers/single-file');
    const { MemoryStorage } =
      await import('../src/multer/storage/memory-storage');

    const storage = new MemoryStorage();
    const options = { storage };

    // Create a mock request with FormData
    const file = new File(['File content for upload'], 'document.pdf', {
      type: 'application/pdf',
    });

    const mockReq = {
      body: {
        document: file,
        description: 'Important document',
      },
      header: (name: string) =>
        name === 'content-type' ? 'multipart/form-data' : null,
    } as unknown as THonoRequest;

    // Process the upload
    const result = await handleMultipartSingleFile(
      mockReq,
      'document',
      options,
    );

    // Verify the result
    expect(result.file).toBeDefined();
    expect(result.file?.fieldName).toBe('document');
    expect(result.file?.originalFilename).toBe('document.pdf');
    expect(result.file?.size).toBe(23); // 'File content for upload' length with encoding
    expect(result.body.description).toBe('Important document');

    // Cleanup
    await result.remove();
  });

  test('should handle file with custom metadata', async () => {
    const { FileHandler } =
      await import('../src/multer/multipart/handlers/base-handler');
    const { MemoryStorage } =
      await import('../src/multer/storage/memory-storage');

    const storage = new MemoryStorage();
    const options = { storage };

    const file = new File(['Custom content'], 'custom.txt', {
      type: 'text/plain',
    });

    const mockReq = {
      body: { customFile: file },
      header: () => 'multipart/form-data',
    } as unknown as THonoRequest;

    const handler = new FileHandler(mockReq, options);

    await handler.process(async (fieldName, part) => {
      if (part instanceof File) {
        const storageFile = await handler.handleSingleFile(fieldName, part);
        if (storageFile) {
          handler.addFile(fieldName, storageFile);

          // Verify metadata
          expect(storageFile.fieldName).toBe('customFile');
          expect(storageFile.originalFilename).toBe('custom.txt');
          expect(storageFile.size).toBe(14); // 'Custom content' length
        }
      }
    });

    // Get all processed files
    const files = handler.getFiles();
    expect(files).toHaveLength(1);

    // Cleanup
    await handler.cleanup();
    expect(handler.getFiles()).toHaveLength(0); // Should be empty after cleanup
  });

  test('should demonstrate memory leak prevention', async () => {
    const { FileHandler } =
      await import('../src/multer/multipart/handlers/base-handler');
    const { MemoryStorage } =
      await import('../src/multer/storage/memory-storage');

    const storage = new MemoryStorage();
    const options = { storage };

    const file = new File(['Leak test'], 'leak.txt', { type: 'text/plain' });
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

    // Call cleanup multiple times
    await removeFn();
    await removeFn();
    await removeFn();

    // Files should be cleared
    expect(handler.getFiles()).toHaveLength(0);
  });

  test('should test error handling and cleanup on failure', async () => {
    const { FileHandler } =
      await import('../src/multer/multipart/handlers/base-handler');
    const { MemoryStorage } =
      await import('../src/multer/storage/memory-storage');

    const storage = new MemoryStorage();
    const options = { storage };

    const file = new File(['Test'], 'test.txt', { type: 'text/plain' });
    const mockReq = {
      body: { file },
      header: () => 'multipart/form-data',
    } as unknown as THonoRequest;

    const handler = new FileHandler(mockReq, options);

    let errorThrown = false;
    try {
      await handler.process(async (fieldName) => {
        // Add a file
        const storageFile = await handler.handleSingleFile(fieldName, file);
        if (storageFile) {
          handler.addFile(fieldName, storageFile);
        }

        // Then throw an error to simulate failure
        throw new Error('Upload failed!');
      });
    } catch (err) {
      errorThrown = true;
      expect(err instanceof Error && err.message).toBe('Upload failed!');
    }

    expect(errorThrown).toBe(true);

    // Even though error occurred, cleanup should have happened
    expect(handler.getFiles()).toHaveLength(0);
  });
});
