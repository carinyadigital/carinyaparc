import type { SubscribeInterest } from '@/lib/validation/subscribe-schema';
import { API_SUBSCRIBE_PATH } from '@/lib/urls';

export type SubscribeClientPayload = {
  email: string;
  name?: string;
  interest?: SubscribeInterest;
  interests?: string;
  source?: string;
  website?: string;
  submissionTime?: number;
};

export type SubscribeClientResult = { ok: true } | { ok: false; error: string };

/**
 * POST a subscribe payload to `/api/subscribe/`. Used by in-flow blog modules
 * and the standalone subscribe island.
 */
export async function postSubscribe(
  payload: SubscribeClientPayload,
): Promise<SubscribeClientResult> {
  try {
    const res = await fetch(API_SUBSCRIBE_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (res.ok) {
      return { ok: true };
    }

    return {
      ok: false,
      error: data.error || 'Failed to subscribe. Please try again later.',
    };
  } catch {
    return {
      ok: false,
      error: 'Network error. Please check your connection and try again.',
    };
  }
}
