// Provider adapter. Replace this import to send mail through a different service.
import { deliverEmail, verifyEmailServiceConfig } from '@/lib/email/resend';
import type { EmailSendResult, OutboundEmail } from '@/lib/email/types';

export type { EmailSendResult, OutboundEmail };
export { verifyEmailServiceConfig };

/** Send one message. The caller chooses the recipient, the from address and the body. */
export function send(message: OutboundEmail): Promise<EmailSendResult> {
  return deliverEmail(message);
}
