import { afterEach, vi } from 'vitest';

process.env.PUBLIC_SITE_URL ??= 'http://localhost:4321';
process.env.NODE_ENV ??= 'test';

afterEach(() => {
  vi.clearAllMocks();
});
