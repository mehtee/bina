import { createHash } from "node:crypto";

type GlyphForms = readonly [isolated: string, final: string, initial: string | null, medial: string | null];

const GLYPH_MAP: Readonly<Record<string, GlyphForms>> = {
  "\u0622": ["\uFE81", "\uFE82", null, null], // آ
  "\u0627": ["\uFE8D", "\uFE8E", null, null], // ا
  "\u0623": ["\uFE83", "\uFE84", null, null], // أ
  "\u0625": ["\uFE87", "\uFE88", null, null], // إ
  "\u0624": ["\uFE85", "\uFE86", null, null], // ؤ
  "\u0626": ["\uFE89", "\uFE8A", "\uFE8B", "\uFE8C"], // ئ
  "\u0628": ["\uFE8F", "\uFE90", "\uFE91", "\uFE92"], // ب
  "\u067E": ["\uFB56", "\uFB57", "\uFB58", "\uFB59"], // پ
  "\u062A": ["\uFE95", "\uFE96", "\uFE97", "\uFE98"], // ت
  "\u062B": ["\uFE99", "\uFE9A", "\uFE9B", "\uFE9C"], // ث
  "\u062C": ["\uFE9D", "\uFE9E", "\uFE9F", "\uFEA0"], // ج
  "\u0686": ["\uFB7A", "\uFB7B", "\uFB7C", "\uFB7D"], // چ
  "\u062D": ["\uFEA1", "\uFEA2", "\uFEA3", "\uFEA4"], // ح
  "\u062E": ["\uFEA5", "\uFEA6", "\uFEA7", "\uFEA8"], // خ
  "\u062F": ["\uFEA9", "\uFEAA", null, null], // د
  "\u0630": ["\uFEAB", "\uFEAC", null, null], // ذ
  "\u0631": ["\uFEAD", "\uFEAE", null, null], // ر
  "\u0632": ["\uFEAF", "\uFEB0", null, null], // ز
  "\u0698": ["\uFB8A", "\uFB8B", null, null], // ژ
  "\u0633": ["\uFEB1", "\uFEB2", "\uFEB3", "\uFEB4"], // س
  "\u0634": ["\uFEB5", "\uFEB6", "\uFEB7", "\uFEB8"], // ش
  "\u0635": ["\uFEB9", "\uFEBA", "\uFEBB", "\uFEBC"], // ص
  "\u0636": ["\uFEBD", "\uFEBE", "\uFEBF", "\uFEC0"], // ض
  "\u0637": ["\uFEC1", "\uFEC2", "\uFEC3", "\uFEC4"], // ط
  "\u0638": ["\uFEC5", "\uFEC6", "\uFEC7", "\uFEC8"], // ظ
  "\u0639": ["\uFEC9", "\uFECA", "\uFECB", "\uFECC"], // ع
  "\u063A": ["\uFECD", "\uFECE", "\uFECF", "\uFED0"], // غ
  "\u0641": ["\uFED1", "\uFED2", "\uFED3", "\uFED4"], // ف
  "\u0642": ["\uFED5", "\uFED6", "\uFED7", "\uFED8"], // ق
  "\u06A9": ["\uFB8E", "\uFB8F", "\uFB90", "\uFB91"], // ک
  "\u0643": ["\uFED9", "\uFEDA", "\uFEDB", "\uFEDC"], // ك
  "\u06AF": ["\uFB92", "\uFB93", "\uFB94", "\uFB95"], // گ
  "\u0644": ["\uFEDD", "\uFEDE", "\uFEDF", "\uFEE0"], // ل
  "\u0645": ["\uFEE1", "\uFEE2", "\uFEE3", "\uFEE4"], // م
  "\u0646": ["\uFEE5", "\uFEE6", "\uFEE7", "\uFEE8"], // ن
  "\u0648": ["\uFEED", "\uFEEE", null, null], // و
  "\u0647": ["\uFEE9", "\uFEEA", "\uFEEB", "\uFEEC"], // ه
  "\u0629": ["\uFE93", "\uFE94", null, null], // ة
  "\u06CC": ["\uFBFC", "\uFBFD", "\uFBFE", "\uFBFF"], // ی
  "\u064A": ["\uFEF1", "\uFEF2", "\uFEF3", "\uFEF4"], // ي
  "\u0649": ["\uFEEF", "\uFEF0", null, null], // ى
};

const LAM_ALEF_LIGATURES: Readonly<Record<string, [string, string]>> = {
  "\u0622": ["\uFEF5", "\uFEF6"], // لآ
  "\u0623": ["\uFEF7", "\uFEF8"], // لأ
  "\u0625": ["\uFEF9", "\uFEFA"], // لإ
  "\u0627": ["\uFEFB", "\uFEFC"], // لا
};

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const RTL_CHAR_RX = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function toPersianDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

function canJoinNext(ch: string | undefined): boolean {
  if (!ch) return false;
  const forms = GLYPH_MAP[ch];
  return Boolean(forms && forms[2] !== null);
}

function canJoinPrev(ch: string | undefined): boolean {
  if (!ch) return false;
  return ch in GLYPH_MAP;
}

function shapePersianWord(word: string): string {
  const chars = [...word];
  const shaped: string[] = [];

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]!;
    if (ch === "\u200C" || ch === "\u200D") {
      continue;
    }

    const prev = i > 0 ? chars[i - 1] : undefined;
    const prevJoins = prev !== undefined && prev !== "\u200C" && canJoinNext(prev);

    if (ch === "\u0644" && i + 1 < chars.length) {
      const next = chars[i + 1]!;
      const lig = LAM_ALEF_LIGATURES[next];
      if (lig) {
        shaped.push(prevJoins ? lig[1] : lig[0]);
        i += 1;
        continue;
      }
    }

    const forms = GLYPH_MAP[ch];
    if (!forms) {
      shaped.push(ch);
      continue;
    }

    let nextIdx = i + 1;
    while (nextIdx < chars.length && chars[nextIdx] === "\u200D") nextIdx += 1;
    const next = nextIdx < chars.length ? chars[nextIdx] : undefined;
    const nextJoins = next !== undefined && next !== "\u200C" && canJoinPrev(next) && forms[2] !== null;

    if (prevJoins && nextJoins && forms[3] !== null) {
      shaped.push(forms[3]);
    } else if (prevJoins) {
      shaped.push(forms[1]);
    } else if (nextJoins && forms[2] !== null) {
      shaped.push(forms[2]);
    } else {
      shaped.push(forms[0]);
    }
  }

  return shaped.reverse().join("");
}

/**
 * Shapes logical Persian+LTR text into visual RTL presentation-form runs suitable
 * for PDFKit rendering while keeping embedded English drug/metric/OD-OS substrings intact in LTR.
 */
export function shapePersianLineForPdf(logicalText: string): string {
  const tokens =
    logicalText.match(
      /[\u0600-\u06FF\u200C]+|[A-Za-z0-9+][A-Za-z0-9_.:/+%\-]*(?:\s+[A-Za-z0-9+][A-Za-z0-9_.:/+%\-]*)*|\s+|./g
    ) ?? [];
  const visualRuns = tokens.map((tok) => {
    if (RTL_CHAR_RX.test(tok)) {
      return shapePersianWord(tok);
    }
    if (tok === "(") return ")";
    if (tok === ")") return "(";
    return tok;
  });
  return visualRuns.reverse().join("");
}

export function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJsonStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJsonStringify(v)}`).join(",")}}`;
}

export function computeSha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
