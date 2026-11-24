import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import { getAppBrand } from "../../../packages/domain-kernel/index.js";
import {
  canonicalJsonStringify,
  computeSha256Hex,
  shapePersianLineForPdf,
} from "../domain/persian-shaper.js";
import type { PersianPdfDocumentPayload } from "../ports/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveFontFile(filename: string): string {
  const candidates = [
    path.resolve(__dirname, "../../../../assets/fonts", filename),
    path.resolve(__dirname, "../../../../../assets/fonts", filename),
    path.resolve(process.cwd(), "assets/fonts", filename),
    path.resolve(process.cwd(), "apps/backend/assets/fonts", filename),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Missing self-hosted Vazirmatn font asset '${filename}'. Checked: ${candidates.join(", ")}`);
}

export async function renderPersianReportPdf(payload: PersianPdfDocumentPayload): Promise<{
  pdfBuffer: Buffer;
  sourceSha256: string;
  pdfSha256: string;
}> {
  const sourceSha256 = computeSha256Hex(canonicalJsonStringify(payload));
  const regularFont = resolveFontFile("Vazirmatn-Regular.ttf");
  const boldFont = resolveFontFile("Vazirmatn-Bold.ttf");

  const brand = getAppBrand();
  const doc = new PDFDocument({
    size: "A4",
    margin: 44,
    compress: false,
    info: {
      Title: `${brand.nameEn} Clinical Document`,
      Author: brand.nameEn,
      Creator: `${brand.nameEn} Reporting`,
      Producer: brand.nameEn,
      CreationDate: new Date(0),
      ModDate: new Date(0),
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.registerFont("VazirReg", regularFont);
  doc.registerFont("VazirBold", boldFont);

  doc.font("VazirBold").fontSize(18).text(shapePersianLineForPdf(payload.titleFa), { align: "right" });
  doc.moveDown(0.3);
  doc
    .font("VazirReg")
    .fontSize(12)
    .text(shapePersianLineForPdf(`${payload.clinicNameFa} | تاریخ صدور: ${payload.issuedAtJalali}`), {
      align: "right",
    });
  doc.moveDown(0.8);

  const bodySize = payload.reportType === "patient_schedule" ? 14 : 12;

  for (const section of payload.sections) {
    doc.font("VazirBold").fontSize(bodySize + 1).text(shapePersianLineForPdf(section.headingFa), {
      align: "right",
    });
    doc.moveDown(0.2);
    doc.font("VazirReg").fontSize(bodySize);
    for (const line of section.linesFa) {
      doc.text(shapePersianLineForPdf(line), { align: "right" });
    }
    doc.moveDown(0.6);
  }

  doc.moveDown(0.4);
  doc
    .font("VazirBold")
    .fontSize(13)
    .text(shapePersianLineForPdf(`خط تماس فوری کلینیک: ${payload.emergencyHotlinePhone}`), {
      align: "right",
    });
  doc
    .font("VazirReg")
    .fontSize(9)
    .text(`source_sha256: ${sourceSha256}`, { align: "left" });

  doc.end();
  const pdfBuffer = await done;
  const pdfSha256 = computeSha256Hex(pdfBuffer);

  return { pdfBuffer, sourceSha256, pdfSha256 };
}
