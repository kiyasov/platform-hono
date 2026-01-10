/**
 * File utilities for upload handling
 */

/**
 * Format bytes to human-readable size
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Validate file size against limit
 * @param file - File to validate
 * @param maxSize - Maximum size in bytes
 * @returns true if file size is within limit
 * @throws Error if file exceeds limit
 */
export function validateFileSize(file: File, maxSize: number): void {
  if (file.size > maxSize) {
    throw new Error(
      `File "${file.name}" (${formatBytes(file.size)}) exceeds maximum size of ${formatBytes(maxSize)}`,
    );
  }
}

/**
 * Get file extension from filename
 * @param filename - Name of the file
 * @returns File extension without dot, or empty string
 */
export function getFileExtension(filename: string): string {
  const ext = filename.lastIndexOf('.');
  return ext === -1 ? '' : filename.slice(ext + 1);
}

/**
 * Check if file is of expected type
 * @param file - File to check
 * @param allowedTypes - Array of allowed MIME types or extensions
 * @returns true if file type is allowed
 */
export function isAllowedFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some((type) => {
    if (type.startsWith('.')) {
      // Extension check
      return getFileExtension(file.name).toLowerCase() === type.slice(1);
    }
    // MIME type check (supports wildcards like 'image/*')
    if (type.endsWith('/*')) {
      const prefix = type.slice(0, -2);
      return file.type.startsWith(prefix);
    }
    return file.type === type;
  });
}

/**
 * Generate a safe filename from user input
 * @param filename - Original filename
 * @returns Safe filename without special characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^\.+|\.+$/g, '');
}

/**
 * Generate a unique filename if file already exists
 * @param filename - Original filename
 * @param existingFilenames - Set of existing filenames
 * @returns Unique filename
 */
export function getUniqueFilename(
  filename: string,
  existingFilenames?: Set<string>,
): string {
  if (!existingFilenames?.has(filename)) {
    return filename;
  }

  const name = filename.lastIndexOf('.');
  if (name === -1) {
    return `${filename}_1`;
  }

  const baseName = filename.slice(0, name);
  const ext = filename.slice(name);

  let counter = 1;
  let newFilename = `${baseName}_${counter}${ext}`;

  while (existingFilenames.has(newFilename)) {
    counter++;
    newFilename = `${baseName}_${counter}${ext}`;
  }

  return newFilename;
}
