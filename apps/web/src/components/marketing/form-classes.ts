/**
 * Shared class strings for the static (Phase 3) marketing forms. Mirrors the DS Input,
 * Select and Textarea surfaces from apps/site so the React islands in Phase 4 can hydrate
 * the same markup without a visual change.
 */
const FIELD_BASE =
  'block w-full rounded-md bg-card px-4 py-[13px] text-[15px] text-foreground border-[1.5px] border-input outline-none transition-colors focus:border-eucalypt-600 focus:outline-2 focus:outline-offset-0 focus:outline-eucalypt-600/30 disabled:cursor-not-allowed disabled:opacity-50';

export const INPUT_CLASS = `${FIELD_BASE} placeholder:text-muted-foreground`;
export const SELECT_CLASS = FIELD_BASE;
export const TEXTAREA_CLASS = `${FIELD_BASE} min-h-[80px] resize-y placeholder:text-muted-foreground`;
export const LABEL_CLASS = 'block text-[13.5px] font-semibold text-foreground';
export const REQUIRED_MARK_CLASS = 'ml-1 text-destructive';
