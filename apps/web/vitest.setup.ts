import { afterEach, vi } from 'vitest';

process.env.PUBLIC_SITE_URL ??= 'http://localhost:4321';
process.env.NODE_ENV ??= 'test';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  vi.clearAllMocks();
});
