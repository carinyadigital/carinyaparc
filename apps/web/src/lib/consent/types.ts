export type ConsentChoiceValue = 'accepted' | 'rejected' | null;

export type ConsentChoice = Exclude<ConsentChoiceValue, null>;

export type ConsentStatusResponse = {
  choice: ConsentChoiceValue;
};

export const CONSENT_COOKIE_NAME = 'cp_consent';

export function normalizeConsentChoice(value: unknown): ConsentChoiceValue {
  if (value === 'accepted' || value === 'rejected') {
    return value;
  }

  return null;
}
