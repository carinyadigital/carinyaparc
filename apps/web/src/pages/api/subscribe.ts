import type { APIRoute } from 'astro';

import { methodNotAllowed } from '@/lib/api/json';
import { handleSubscribePost } from '@/lib/api/subscribe';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => handleSubscribePost(request);

export const GET: APIRoute = () => methodNotAllowed();
