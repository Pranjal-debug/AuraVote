import path from 'path';
import { fileURLToPath } from 'url';

export * from './managed/auravote/contract/index.js';
export * from './witnesses.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const contractZkConfigPath = path.resolve(
  currentDir,
  'managed',
  'auravote',
  'keys'
);

export const contractZkirPath = path.resolve(
  currentDir,
  'managed',
  'auravote',
  'zkir'
);
