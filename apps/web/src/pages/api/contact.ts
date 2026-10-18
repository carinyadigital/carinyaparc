import type { APIRoute } from 'astro';

import { handleContact } from '@/lib/email/handler';
import { methodNotAllowed } from '@/lib/api/json';

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleContact(request);

export const GET: APIRoute = () => methodNotAllowed();
