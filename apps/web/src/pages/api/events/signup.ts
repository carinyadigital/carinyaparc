import type { APIRoute } from 'astro';

import { handleEventSignupPost } from '@/lib/api/events-signup';
import { methodNotAllowed } from '@/lib/api/json';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => handleEventSignupPost(request);

export const GET: APIRoute = () => methodNotAllowed();
