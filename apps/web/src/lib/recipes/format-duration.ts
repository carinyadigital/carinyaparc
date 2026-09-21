export function formatIsoDuration(isoDuration?: string | null): string | null {
  if (!isoDuration) {
    return null;
  }

  const minutes = isoDuration.match(/(\d+)M/)?.[1];
  const hours = isoDuration.match(/(\d+)H/)?.[1];

  if (hours && minutes) {
    return `${hours} hr ${minutes} min`;
  }

  if (hours) {
    return `${hours} hr`;
  }

  if (minutes) {
    return `${minutes} min`;
  }

  return isoDuration;
}
