export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type OutboundEmail = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
  tags: { name: string; value: string }[];
};
