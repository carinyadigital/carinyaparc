import { resolveSubscribeInterest, type SubscribeInterest } from '@/lib/newsletter/schema';

const MAILERLITE_API_BASE = 'https://connect.mailerlite.com/api';

export type MailerLiteFields = {
  name?: string;
  interest?: string;
  interests?: string;
  source?: string;
  [key: string]: string | undefined;
};

export type MailerLiteSubscriberPayload = {
  email: string;
  fields?: MailerLiteFields;
  groups?: string[];
};

export type MailerLiteResult =
  { ok: true; status: number } | { ok: false; status: number; error: string };

/**
 * Build the MailerLite upsert body from validated subscribe input.
 * Persists canonical `interest` + `source` as custom fields; keeps `interests`
 * populated for existing MailerLite automations that still read that field.
 */
export function buildMailerLiteSubscriberPayload(input: {
  email: string;
  name?: string;
  interest?: SubscribeInterest;
  interests?: string;
  source?: string;
  groups?: string[];
}): MailerLiteSubscriberPayload {
  const resolvedInterest = resolveSubscribeInterest(input.interest, input.interests);

  const fields: MailerLiteFields = {};

  if (input.name && input.name.trim() !== '') {
    fields.name = input.name;
  }

  if (resolvedInterest) {
    fields.interest = resolvedInterest;
    fields.interests = resolvedInterest;
  } else if (input.interests && input.interests !== '') {
    fields.interests = input.interests;
  }

  if (input.source && input.source.trim() !== '') {
    fields.source = input.source.trim();
  }

  const payload: MailerLiteSubscriberPayload = { email: input.email };
  if (Object.keys(fields).length > 0) {
    payload.fields = fields;
  }
  if (input.groups && input.groups.length > 0) {
    payload.groups = input.groups;
  }
  return payload;
}

function mailerLiteHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${process.env.MAILERLITE_API_KEY ?? ''}`,
  };
}

function missingApiKeyResult(): MailerLiteResult {
  return {
    ok: false,
    status: 500,
    error: 'Newsletter service not configured. Please add MAILERLITE_API_KEY to .env.local',
  };
}

async function parseMailerLiteError(response: Response): Promise<string> {
  let data: { message?: string; errors?: unknown };
  try {
    data = (await response.json()) as { message?: string; errors?: unknown };
  } catch {
    data = {};
  }

  if (data.message) {
    return data.message;
  }
  if (response.status === 401) {
    return 'Invalid API key';
  }
  if (response.status === 429) {
    return 'Rate limit exceeded';
  }
  if (response.status === 422) {
    return data.errors ? JSON.stringify(data.errors) : 'Validation error';
  }
  return 'Unknown error';
}

/** Upsert a subscriber. Optionally assign MailerLite group IDs. */
export async function upsertMailerLiteSubscriber(
  payload: MailerLiteSubscriberPayload,
): Promise<MailerLiteResult> {
  if (!process.env.MAILERLITE_API_KEY) {
    console.error('MAILERLITE_API_KEY is not defined in environment variables');
    return missingApiKeyResult();
  }

  try {
    const response = await fetch(`${MAILERLITE_API_BASE}/subscribers`, {
      method: 'POST',
      headers: mailerLiteHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await parseMailerLiteError(response);
      console.error('MailerLite API error:', error);
      return { ok: false, status: response.status, error: `Subscription failed: ${error}` };
    }

    return { ok: true, status: response.status };
  } catch (error) {
    console.error('Fetch error:', error);
    return { ok: false, status: 500, error: 'Network error. Please try again later.' };
  }
}

type GroupCache = Map<string, string>;

const groupIdCache: GroupCache = new Map();

/** Test helper — clears the in-memory MailerLite group id cache. */
export function resetMailerLiteGroupCache(): void {
  groupIdCache.clear();
}

/**
 * Find or create a MailerLite group with the given name.
 * The name is used exactly as given. Group ids are cached for this process
 * so a repeat signup for the same list skips the lookup.
 */
export async function resolveGroupId(
  name: string,
): Promise<MailerLiteResult & { groupId?: string }> {
  if (!process.env.MAILERLITE_API_KEY) {
    return missingApiKeyResult();
  }

  const cached = groupIdCache.get(name);
  if (cached) {
    return { ok: true, status: 200, groupId: cached };
  }

  try {
    const listUrl = new URL(`${MAILERLITE_API_BASE}/groups`);
    listUrl.searchParams.set('filter[name]', name);

    const listResponse = await fetch(listUrl, { headers: mailerLiteHeaders() });
    if (!listResponse.ok) {
      const error = await parseMailerLiteError(listResponse);
      return { ok: false, status: listResponse.status, error: `Subscription failed: ${error}` };
    }

    const listBody = (await listResponse.json()) as {
      data?: Array<{ id: string | number; name?: string }>;
    };
    const existing = listBody.data?.find((group) => group.name === name);
    if (existing) {
      const groupId = String(existing.id);
      groupIdCache.set(name, groupId);
      return { ok: true, status: 200, groupId };
    }

    const createResponse = await fetch(`${MAILERLITE_API_BASE}/groups`, {
      method: 'POST',
      headers: mailerLiteHeaders(),
      body: JSON.stringify({ name }),
    });

    if (!createResponse.ok) {
      const error = await parseMailerLiteError(createResponse);
      return { ok: false, status: createResponse.status, error: `Subscription failed: ${error}` };
    }

    const created = (await createResponse.json()) as { data?: { id: string | number } };
    const groupId = created.data?.id ? String(created.data.id) : undefined;
    if (!groupId) {
      return { ok: false, status: 500, error: 'Subscription failed: Missing group id' };
    }

    groupIdCache.set(name, groupId);
    return { ok: true, status: 201, groupId };
  } catch (error) {
    console.error('Fetch error:', error);
    return { ok: false, status: 500, error: 'Network error. Please try again later.' };
  }
}

export type NewsletterSubscriber = {
  email: string;
  name?: string;
  interest?: SubscribeInterest;
  interests?: string;
  source?: string;
};

/** Upsert a newsletter subscriber. */
export function subscribeWithMailerLite(input: NewsletterSubscriber): Promise<MailerLiteResult> {
  return upsertMailerLiteSubscriber(buildMailerLiteSubscriberPayload(input));
}

/**
 * Add a subscriber to the MailerLite group named `list`.
 * The list name is the group name, used exactly as given.
 */
export async function addToMailerLiteList(
  input: NewsletterSubscriber & { list: string },
): Promise<MailerLiteResult> {
  const group = await resolveGroupId(input.list);
  if (!group.ok) {
    return group;
  }
  if (!group.groupId) {
    return { ok: false, status: 500, error: 'Subscription failed: Missing group id' };
  }

  return upsertMailerLiteSubscriber(
    buildMailerLiteSubscriberPayload({
      email: input.email,
      name: input.name,
      interest: input.interest,
      interests: input.interests,
      source: input.source,
      groups: [group.groupId],
    }),
  );
}
