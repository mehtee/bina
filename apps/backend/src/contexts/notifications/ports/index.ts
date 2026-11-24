import type { NotificationTransportPort } from "../../../packages/domain-kernel/index.js";

export interface SmsProviderSender {
  dispatchSms(recipientE164: string, bodyFa: string): Promise<{ providerMessageId: string; accepted: boolean }>;
}

export type DomesticNotificationServicePort = NotificationTransportPort;
