import { createHash, randomUUID } from "node:crypto";
import type {
  NotificationDeliveryReceipt,
  NotificationTransportPort,
  TemplatedNotification,
} from "../../../packages/domain-kernel/index.js";
import type { Pool } from "pg";
import { withTenantTransaction } from "../../../packages/db/index.js";
import { renderAndValidatePhiFreeSms } from "../domain/phi-sms-guard.js";
import type { SmsProviderSender } from "../ports/index.js";

export class DomesticIranSmsAdapter implements NotificationTransportPort {
  constructor(
    private readonly sender: SmsProviderSender,
    private readonly dbPool?: Pool | undefined,
    private readonly phoneSalt = "sms_audit_salt"
  ) {}

  async send(msg: TemplatedNotification): Promise<NotificationDeliveryReceipt> {
    const safeBodyFa = renderAndValidatePhiFreeSms(msg);
    const dispatch = await this.sender.dispatchSms(msg.recipientPhoneE164, safeBodyFa);
    const sentAtIso = new Date().toISOString();

    if (this.dbPool) {
      const phoneHash = createHash("sha256")
        .update(`${this.phoneSalt}:${msg.recipientPhoneE164}`)
        .digest("hex");
      await withTenantTransaction(this.dbPool, msg.tenantId, async (tx) => {
        await tx.query(
          `INSERT INTO notification_deliveries
            (tenant_id, clinic_id, channel, template_key, recipient_phone_hash, provider_message_id, status)
           VALUES ($1, $2, 'sms_ir', $3, $4, $5, $6)`,
          [
            msg.tenantId,
            msg.clinicId,
            msg.templateKey,
            phoneHash,
            dispatch.providerMessageId,
            dispatch.accepted ? "accepted" : "failed",
          ]
        );
      });
    }

    return {
      providerMessageId: dispatch.providerMessageId,
      accepted: dispatch.accepted,
      sentAtIso,
    };
  }
}

export class InMemoryMockIranSmsSender implements SmsProviderSender {
  public readonly sentMessages: Array<{ recipientE164: string; bodyFa: string; providerMessageId: string }> = [];

  async dispatchSms(recipientE164: string, bodyFa: string): Promise<{ providerMessageId: string; accepted: boolean }> {
    const providerMessageId = `mock-ir-sms-${randomUUID()}`;
    this.sentMessages.push({ recipientE164, bodyFa, providerMessageId });
    return { providerMessageId, accepted: true };
  }
}
