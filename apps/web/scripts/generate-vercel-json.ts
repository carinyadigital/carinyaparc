import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateVercelJson } from '../src/lib/security/vercel-config';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'vercel.json');

writeFileSync(target, `${JSON.stringify(generateVercelJson(), null, 2)}\n`);
