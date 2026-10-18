// Provider adapter. Replace this import to send subscribers through a different service.
import { addToMailerLiteList, subscribeWithMailerLite } from '@/lib/newsletter/mailerlite';
import type { SubscribeInterest } from '@/lib/newsletter/schema';

export type SubscribeResult =
  { ok: true; status: number } | { ok: false; status: number; error: string };

export type SubscribeInput = {
  email: string;
  name?: string;
  interest?: SubscribeInterest;
  interests?: string;
  source?: string;
};

export type AddToListInput = SubscribeInput & {
  /** List key. Event signup passes the event slug. */
  list: string;
};

/** Add an address to the newsletter. */
export function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
  return subscribeWithMailerLite(input);
}

/** Add an address to a named list, such as one event's signup list. */
export function addToList(input: AddToListInput): Promise<SubscribeResult> {
  return addToMailerLiteList(input);
}
