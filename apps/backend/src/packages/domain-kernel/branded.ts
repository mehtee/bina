declare const brandSymbol: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brandSymbol]: B };

export type TenantId = Brand<string, "TenantId">;
export type ClinicId = Brand<string, "ClinicId">;
export type PatientId = Brand<string, "PatientId">;
export type EpisodeId = Brand<string, "EpisodeId">;
export type StudyId = Brand<string, "StudyId">;
export type JobId = Brand<string, "JobId">;
export type UserId = Brand<string, "UserId">;
export type IdempotencyKey = Brand<string, "IdempotencyKey">;

function parseNonEmptyBrand<B extends string>(raw: string, label: string): Brand<string, B> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new RangeError(`${label} must be a non-empty identifier`);
  }
  return trimmed as Brand<string, B>;
}

export const asTenantId = (id: string): TenantId => parseNonEmptyBrand<"TenantId">(id, "TenantId");
export const asClinicId = (id: string): ClinicId => parseNonEmptyBrand<"ClinicId">(id, "ClinicId");
export const asPatientId = (id: string): PatientId => parseNonEmptyBrand<"PatientId">(id, "PatientId");
export const asEpisodeId = (id: string): EpisodeId => parseNonEmptyBrand<"EpisodeId">(id, "EpisodeId");
export const asStudyId = (id: string): StudyId => parseNonEmptyBrand<"StudyId">(id, "StudyId");
export const asJobId = (id: string): JobId => parseNonEmptyBrand<"JobId">(id, "JobId");
export const asUserId = (id: string): UserId => parseNonEmptyBrand<"UserId">(id, "UserId");
export const asIdempotencyKey = (key: string): IdempotencyKey =>
  parseNonEmptyBrand<"IdempotencyKey">(key, "IdempotencyKey");
