import { promisify } from 'node:util';
import { pipeline } from 'node:stream';

export const pump = promisify(pipeline);
