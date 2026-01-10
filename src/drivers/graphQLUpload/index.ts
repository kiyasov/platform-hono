// Core
export { Upload, MemoryUploadFile, StreamUploadFile } from './Upload';
export { GraphQLUpload } from './GraphQLUpload';
export { processRequest, ProcessRequestOptions } from './processRequest';

// Streams
export * from './fs-capacitor';

// Storage - re-export with GQL prefix to avoid conflicts
export type {
  StorageFile as GQLStorageFile,
  StorageOptions as GQLStorageOptions,
} from './storage';
export { Storage as GQLStorage } from './storage/storage';
export {
  CapacitorStorage as GQLCapacitorStorage,
  CapacitorStorageFile as GQLCapacitorStorageFile,
} from './storage/capacitor-storage';
export {
  MemoryStorage as GQLMemoryStorage,
  MemoryStorageFile as GQLMemoryStorageFile,
} from './storage/memory-storage';

// Utils - prefix to avoid conflicts with multer
export {
  formatBytes as gqlFormatBytes,
  validateFileSize as gqlValidateFileSize,
  getFileExtension as gqlGetFileExtension,
  isAllowedFileType as gqlIsAllowedFileType,
  sanitizeFilename as gqlSanitizeFilename,
  getUniqueFilename as gqlGetUniqueFilename,
} from './utils/file';

export {
  FileTypes as GQLFileTypes,
  FileValidatorOptions as GQLFileValidatorOptions,
  validateFile as gqlValidateFile,
} from './utils/validators';
