import { promisify } from 'node:util';
import { randomBytes as cryptoRandomBytes } from 'node:crypto';

export const randomBytes = promisify(cryptoRandomBytes);
