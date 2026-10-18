import type { APIRoute } from 'astro';

import { methodNotAllowed } from '@/lib/api/json';
import { handleSubscribe } from '@/lib/newsletter/handler';

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleSubscribe(request);

export const GET: APIRoute = () => methodNotAllowed();
