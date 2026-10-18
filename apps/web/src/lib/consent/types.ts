export type ConsentChoiceValue = 'accepted' | 'rejected' | null;

export type ConsentChoice = Exclude<ConsentChoiceValue, null>;

export const CONSENT_COOKIE_NAME = 'cp_consent';
