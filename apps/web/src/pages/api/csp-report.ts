import type { APIRoute } from 'astro';

import { handleCspReportGet, handleCspReportPost } from '@/lib/api/csp-report';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => handleCspReportPost(request);

export const GET: APIRoute = () => handleCspReportGet();
