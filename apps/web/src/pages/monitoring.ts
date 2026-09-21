import type { APIRoute } from 'astro';

import { handleSentryTunnelGet, handleSentryTunnelPost } from '@/lib/api/sentry-tunnel';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => handleSentryTunnelPost(request);

export const GET: APIRoute = () => handleSentryTunnelGet();
