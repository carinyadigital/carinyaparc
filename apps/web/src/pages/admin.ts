import type { APIRoute } from 'astro';

import { goneResponse } from '@/lib/security/gone';

export const prerender = false;

export const ALL: APIRoute = () => goneResponse();
