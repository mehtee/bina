import type { DbTx } from "../../../packages/db/index.js";

export type IntegrationEndpointType =
  | "dicom_dimse"
  | "dicomweb"
  | "fhir_his"
  | "icare_home2"
  | "sms_gateway";

export type IntegrationAuthMode = "none" | "mtls" | "bearer" | "basic";

export type IntegrationDeliveryStatus = "queued" | "delivered" | "failed" | "retrying";

export interface IntegrationEndpointRecord {
  readonly endpointId: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly integrationType: IntegrationEndpointType;
  readonly nameFa: string;
  readonly endpointUrl: string;
  readonly aeTitle: string | null;
  readonly authMode: IntegrationAuthMode;
  readonly secretMasked: string | null;
  readonly enabled: boolean;
  readonly lastTestedAtIso: string | null;
  readonly lastTestStatus: "ok" | "failed" | null;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

export interface IntegrationDeliveryRecord {
  readonly deliveryId: string;
  readonly clinicId: string;
  readonly endpointId: string | null;
  readonly endpointNameFa: string | null;
  readonly direction: "inbound" | "outbound";
  readonly payloadType: string;
  readonly referenceId: string | null;
  readonly status: IntegrationDeliveryStatus;
  readonly httpStatus: number | null;
  readonly errorCode: string | null;
  readonly errorMessageFa: string | null;
  readonly attemptCount: number;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

export interface IntegrationsRepoPort {
  listEndpoints(tx: DbTx, clinicId: string): Promise<IntegrationEndpointRecord[]>;
  findEndpointById(tx: DbTx, endpointId: string): Promise<IntegrationEndpointRecord | null>;
  insertEndpoint(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      integrationType: IntegrationEndpointType;
      nameFa: string;
      endpointUrl: string;
      aeTitle?: string | undefined;
      authMode: IntegrationAuthMode;
      secretMasked?: string | undefined;
      enabled: boolean;
    }
  ): Promise<IntegrationEndpointRecord>;
  updateEndpoint(
    tx: DbTx,
    endpointId: string,
    patch: {
      nameFa?: string | undefined;
      endpointUrl?: string | undefined;
      aeTitle?: string | null | undefined;
      authMode?: IntegrationAuthMode | undefined;
      secretMasked?: string | null | undefined;
      enabled?: boolean | undefined;
    }
  ): Promise<IntegrationEndpointRecord | null>;
  recordEndpointTestResult(
    tx: DbTx,
    endpointId: string,
    status: "ok" | "failed"
  ): Promise<IntegrationEndpointRecord | null>;
  insertDelivery(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      endpointId?: string | undefined;
      direction: "inbound" | "outbound";
      payloadType: string;
      referenceId?: string | undefined;
      status: IntegrationDeliveryStatus;
      httpStatus?: number | undefined;
      errorCode?: string | undefined;
      errorMessageFa?: string | undefined;
    }
  ): Promise<IntegrationDeliveryRecord>;
  listDeliveries(
    tx: DbTx,
    filter: {
      clinicId: string;
      endpointId?: string | undefined;
      status?: IntegrationDeliveryStatus | undefined;
      direction?: "inbound" | "outbound" | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: IntegrationDeliveryRecord[]; total: number }>;
}
