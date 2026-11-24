export type EyeLaterality = "OD" | "OS";
export type StudyLaterality = "OD" | "OS" | "OU";

export const LATERALITY_FA = {
  OD: "چشم راست",
  OS: "چشم چپ",
  OU: "هر دو چشم",
} as const satisfies Record<StudyLaterality, string>;

export function formatLateralityFa(eye: StudyLaterality): string {
  return LATERALITY_FA[eye];
}

export function assertSingleEyeLaterality(raw: string): EyeLaterality {
  const normalized = raw.trim().toUpperCase();
  if (normalized === "OD" || normalized === "OS") {
    return normalized;
  }
  throw new RangeError(
    `Ambiguous or invalid single-eye laterality '${raw}'; expected explicit 'OD' (چشم راست) or 'OS' (چشم چپ).`
  );
}
