import { describe, expect, it } from "vitest";
import type { StaffPrincipal } from "../../../packages/authz/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import { BillingEvidenceService } from "../../billing-evidence/index.js";
import { IcareHome2Service } from "../../integrations/index.js";
import { ResearchExportError, ResearchExportService } from "../index.js";

describe("T-A28 Research CRO export, iCare HOME2 & Billing Evidence", () => {
  it("blocks CRO research export without step-up MFA and exports SHA-256 pseudonymized manifest when authorized", async () => {
    const service = new ResearchExportService(
      {
        async append(_tx, e) {
          return { ...e, id: "aud-1", occurredAtIso: new Date().toISOString() };
        },
        async listByResource() {
          return [];
        },
      },
      "research-salt"
    );

    const mockTx = {
      async query() {
        return {
          rows: [
            {
              patient_id: "11111111-1111-4111-8111-111111111111",
              eye_laterality: "OD",
              status: "signed_off",
              top_condition_code: "glaucoma",
              final_urgency: "urgent",
            },
          ],
          rowCount: 1,
        };
      },
    } as unknown as DbTx;

    const noStepUp: StaffPrincipal = {
      userId: "u1",
      tenantId: "t1",
      clinicId: "c1",
      role: "ophthalmologist",
      mfaVerified: true,
      stepUpVerified: false,
    };

    await expect(
      service.exportPseudonymizedCohort(mockTx, noStepUp, {
        irbProtocolCode: "IR.SBMU.1405.001",
        reasonFa: "تحلیل پژوهشی",
      })
    ).rejects.toThrow(ResearchExportError);

    const authorized: StaffPrincipal = { ...noStepUp, stepUpVerified: true };
    const bundle = await service.exportPseudonymizedCohort(mockTx, authorized, {
      irbProtocolCode: "IR.SBMU.1405.001",
      reasonFa: "مطالعه گلوکوم تاییدشده",
    });
    expect(bundle.recordCount).toBe(1);
    expect(bundle.manifestSha256).toHaveLength(64);
    expect(JSON.stringify(bundle.records)).not.toContain("11111111-1111-4111-8111-111111111111");
  });

  it("ingests iCare HOME2 IOP readings, rejects low quality, and generates non-diagnostic billing evidence", async () => {
    const icare = new IcareHome2Service();
    const rows: Array<{ iop_mm_hg: number }> = [{ iop_mm_hg: 31 }];
    const mockTx = {
      async query(sql: string) {
        if (sql.includes("INSERT INTO external_tonometry_readings")) {
          return { rows: [{ id: "r-1" }], rowCount: 1 };
        }
        return { rows, rowCount: rows.length };
      },
    } as unknown as DbTx;

    const lowQ = await icare.ingestReading(mockTx, {
      tenantId: "t1",
      clinicId: "c1",
      patientId: "p1",
      deviceSerial: "ICARE-001",
      eyeLaterality: "OD",
      iopMmHg: 31,
      qualityScore: 0.4,
      measuredAtIso: "2026-11-23T12:00:00Z",
    });
    expect(lowQ.accepted).toBe(false);

    const highIop = await icare.ingestReading(mockTx, {
      tenantId: "t1",
      clinicId: "c1",
      patientId: "p1",
      deviceSerial: "ICARE-001",
      eyeLaterality: "OD",
      iopMmHg: 31,
      qualityScore: 0.92,
      measuredAtIso: "2026-11-23T12:05:00Z",
    });
    expect(highIop.accepted).toBe(true);
    expect(highIop.alertTier).toBe("urgent");

    const billing = new BillingEvidenceService();
    const billingTx = {
      async query() {
        return { rows: [{ cnt: "4" }], rowCount: 1 };
      },
    } as unknown as DbTx;
    const ev = await billing.generatePatientEvidence(billingTx, {
      tenantId: "t1",
      patientId: "p1",
      periodStartJalali: "1405-09-01",
      periodEndJalali: "1405-09-30",
    });
    expect(ev.acceptedHomeVisionTestCount).toBe(4);
    expect(ev.disclaimerFa).toContain("جایگزین تشخیص بالینی");
  });
});
