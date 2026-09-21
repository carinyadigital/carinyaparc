export function generateDescription(defaultDesc: string, override?: string): string {
  return override?.trim() || defaultDesc;
}
