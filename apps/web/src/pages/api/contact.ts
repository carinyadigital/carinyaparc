import type { APIRoute } from 'astro';

import { handleContactPost } from '@/lib/api/contact';
import { methodNotAllowed } from '@/lib/api/json';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => handleContactPost(request);

export const GET: APIRoute = () => methodNotAllowed();
