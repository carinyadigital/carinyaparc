/**
 * Input sanitization utilities for contact forms and email templates.
 * Plain Node implementations — no jsdom/DOMPurify (avoids ESM/CJS issues on Vercel).
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
};

function decodeHtmlEntities(input: string): string {
  return input.replace(
    /&(?:amp|lt|gt|quot|#39|#x27);/g,
    (entity) => HTML_ENTITY_MAP[entity] ?? entity,
  );
}

function stripAngleBrackets(input: string): string {
  return input.replace(/[<>]/g, '');
}

function removeControlCharacters(input: string): string {
  // eslint-disable-next-line no-control-regex -- strip ASCII control characters from user input
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ALLOWED_EMAIL_TAGS = new Set(['br', 'p', 'strong', 'em']);

function sanitizeEmailHtml(input: string): string {
  return input.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tagName: string) => {
    const tag = tagName.toLowerCase();
    if (!ALLOWED_EMAIL_TAGS.has(tag)) {
      return '';
    }

    if (match.startsWith('</')) {
      return `</${tag}>`;
    }

    return `<${tag}>`;
  });
}

/**
 * Sanitize text input for plain text contexts (form fields, names, etc.)
 * Strips all HTML tags and dangerous characters
 */
export function sanitizePlainText(input: string | null | undefined): string {
  if (!input) return '';

  return removeControlCharacters(stripAngleBrackets(decodeHtmlEntities(input))).trim();
}

function sanitizePlainTextForHtml(input: string | null | undefined): string {
  if (!input) return '';

  return escapeHtml(removeControlCharacters(decodeHtmlEntities(input))).trim();
}

/**
 * Sanitize text for email body inclusion
 * Preserves line breaks and a small allowlist of safe tags
 */
export function sanitizeForEmail(input: string | null | undefined): string {
  if (!input) return '';

  const withBreaks = escapeHtml(input).replace(/\n/g, '<br>');

  return sanitizeEmailHtml(withBreaks).trim();
}

export interface ContactFormInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  inquiryType: string;
  message: string;
}

export function sanitizeContactFormData(data: ContactFormInput): ContactFormInput {
  return {
    firstName: sanitizePlainText(data.firstName),
    lastName: sanitizePlainText(data.lastName),
    email: sanitizePlainText(data.email),
    phone: data.phone ? sanitizePlainText(data.phone) : undefined,
    inquiryType: sanitizePlainText(data.inquiryType),
    message: sanitizePlainText(data.message),
  };
}

/**
 * Sanitize contact form data for email generation
 * Uses email-safe sanitization that preserves formatting
 */
export function sanitizeForEmailGeneration(data: ContactFormInput): ContactFormInput {
  return {
    firstName: sanitizePlainTextForHtml(data.firstName),
    lastName: sanitizePlainTextForHtml(data.lastName),
    email: sanitizePlainTextForHtml(data.email),
    phone: data.phone ? sanitizePlainTextForHtml(data.phone) : undefined,
    inquiryType: sanitizePlainTextForHtml(data.inquiryType),
    message: sanitizeForEmail(data.message),
  };
}
