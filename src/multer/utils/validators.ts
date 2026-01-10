import { isAllowedFileType } from './file';

/**
 * Common file type groups for validation
 */
export const FileTypes = {
  // Images
  IMAGES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif',
    'image/heic',
    'image/heif',
    'image/tiff',
    'image/bmp',
    'image/x-icon',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.svg',
    '.avif',
    '.heic',
    '.heif',
    '.tiff',
    '.bmp',
    '.ico',
  ] as const,

  // Documents
  DOCUMENTS: [
    // PDF
    'application/pdf',
    '.pdf',
    // Microsoft Word
    'application/msword',
    '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.docx',
    // Microsoft Excel
    'application/vnd.ms-excel',
    '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xlsx',
    // Microsoft PowerPoint
    'application/vnd.ms-powerpoint',
    '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.pptx',
    // OpenDocument formats
    'application/vnd.oasis.opendocument.text',
    '.odt',
    'application/vnd.oasis.opendocument.spreadsheet',
    '.ods',
    'application/vnd.oasis.opendocument.presentation',
    '.odp',
    // Apple iWork
    'application/vnd.apple.pages',
    '.pages',
    'application/vnd.apple.numbers',
    '.numbers',
    'application/vnd.apple.keynote',
    '.key',
    // Rich text
    'application/rtf',
    '.rtf',
    'text/plain',
    '.txt',
    // CSV
    'text/csv',
    '.csv',
  ] as const,

  // Videos
  VIDEOS: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo',
    'video/x-matroska',
    'video/quicktime',
    'video/x-flv',
    '.mp4',
    '.mpeg',
    '.mov',
    '.webm',
    '.avi',
    '.mkv',
    '.flv',
  ] as const,

  // Audio
  AUDIO: [
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/flac',
    'audio/aac',
    'audio/x-m4a',
    'audio/x-wav',
    '.mp3',
    '.m4a',
    '.wav',
    '.ogg',
    '.flac',
    '.aac',
  ] as const,

  // Archives
  ARCHIVES: [
    'application/zip',
    'application/x-zip-compressed',
    '.zip',
    'application/x-rar-compressed',
    '.rar',
    'application/x-7z-compressed',
    '.7z',
    'application/x-tar',
    '.tar',
    'application/gzip',
    '.gz',
    'application/x-gzip',
    'application/x-bzip2',
    '.bz2',
    'application/x-compress',
    '.Z',
    'application/x-apple-diskimage',
    '.dmg',
    'application/x-iso9660-image',
    '.iso',
  ] as const,

  // 3D Models
  MODELS_3D: [
    'model/stl',
    '.stl',
    'model/obj',
    '.obj',
    'model/gltf-binary',
    '.glb',
    'model/gltf+json',
    '.gltf',
    'model/fbx',
    '.fbx',
    'model/dae',
    '.dae',
    'model/vnd.collada+xml',
  ] as const,

  // Fonts
  FONTS: [
    'font/ttf',
    '.ttf',
    'font/otf',
    '.otf',
    'font/woff',
    '.woff',
    'font/woff2',
    '.woff2',
    'application/x-font-ttf',
    'application/x-font-opentype',
  ] as const,
} as const;

/**
 * Validator configuration for file uploads
 */
export interface FileValidatorOptions {
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Allowed MIME types or extensions */
  allowedTypes?: string[];
  /** Denied MIME types or extensions */
  deniedTypes?: string[];
}

/**
 * Validates a file against the given options
 * @param file - File to validate
 * @param options - Validation options
 * @returns Object with isValid flag and error message
 */
export function validateFile(
  file: File,
  options: FileValidatorOptions,
): { isValid: boolean; error?: string } {
  // Check file size
  if (options.maxSize && file.size > options.maxSize) {
    return {
      isValid: false,
      error: `File "${file.name}" exceeds maximum size of ${options.maxSize} bytes`,
    };
  }

  // Check denied types
  if (options.deniedTypes && isAllowedFileType(file, options.deniedTypes)) {
    return {
      isValid: false,
      error: `File type "${file.type}" is not allowed`,
    };
  }

  // Check allowed types
  if (options.allowedTypes && !isAllowedFileType(file, options.allowedTypes)) {
    return {
      isValid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`,
    };
  }

  return { isValid: true };
}
