export type PublicEvent = {
  slug: string;
  title: string;
  startsAt: Date;
  location: string;
  isFull: boolean;
  signupTarget?: string;
};

/**
 * Load a published event by slug. Drafts are treated as missing so the
 * signup endpoint cannot register people against unpublished days.
 */
export async function getPublicEventBySlug(slug: string): Promise<PublicEvent | null> {
  const { getEntry } = await import('astro:content');
  const entry = await getEntry('events', slug);

  if (!entry || entry.data.draft) {
    return null;
  }

  return {
    slug: entry.id,
    title: entry.data.title,
    startsAt: entry.data.startsAt,
    location: entry.data.location,
    isFull: entry.data.isFull,
    signupTarget: entry.data.signupTarget,
  };
}
