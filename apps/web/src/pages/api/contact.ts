import type { APIRoute } from 'astro';

import { methodNotAllowed } from '@/lib/api/json';
import { handleContact } from '@/lib/contact/handler';

export const prerender = false;

export const POST: APIRoute = ({ request }) => handleContact(request);

export const GET: APIRoute = () => methodNotAllowed();
