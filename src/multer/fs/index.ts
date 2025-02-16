import { randomBytes } from 'crypto';
import { stat } from 'fs/promises';
import { extname } from 'path';

export const pathExists = async (path: string) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

export const getUniqueFilename = async (filename: string) => {
  const buffer = randomBytes(16);
  const ext = extname(filename);
  return buffer.toString('hex') + ext;
};
