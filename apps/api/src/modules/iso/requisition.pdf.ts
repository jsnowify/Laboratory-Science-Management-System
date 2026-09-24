import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type PdfData = {
  formNumber: string;
  requestNumber: string;
  borrower: string;
  institutionalId: string;
  purpose: string;
  requestedBorrowAt: string;
  requestedDueAt: string;
  generatedAt: string;
  items: {
    equipmentName: string;
    quantityApproved: number | null;
    assetCodes: string[];
  }[];
};

export async function renderDevelopmentRequisition(data: PdfData) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const width = 595;
  const height = 842;
  let page = doc.addPage([width, height]);
  let y = height - 56;
  const line = (value: string, size = 10, strong = false) => {
    if (y < 70) {
      page = doc.addPage([width, height]);
      y = height - 55;
    }
    page.drawText(value.slice(0, 105), {
      x: 48,
      y,
      size,
      font: strong ? bold : font,
      color: rgb(0.08, 0.16, 0.2),
    });
    y -= size + 11;
  };
  line("LSMS DEVELOPMENT REQUISITION RECORD", 16, true);
  line(
    "Unofficial layout for FM-DSSC-RLS-002. Replace with the approved template when supplied.",
    9,
  );
  y -= 10;
  line(`Form number: ${data.formNumber}`, 11, true);
  line(`Request number: ${data.requestNumber}`);
  line(`Borrower: ${data.borrower}`);
  line(`Institutional ID: ${data.institutionalId}`);
  line(`Purpose: ${data.purpose}`);
  line(
    `Borrow schedule: ${new Date(data.requestedBorrowAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`,
  );
  line(
    `Due schedule: ${new Date(data.requestedDueAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`,
  );
  line(
    `Generated: ${new Date(data.generatedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`,
  );
  y -= 10;
  line("Approved equipment", 12, true);
  for (const item of data.items) {
    if (!item.quantityApproved) continue;
    line(`${item.equipmentName} x ${item.quantityApproved}`, 10, true);
    line(
      `Allocated asset codes: ${item.assetCodes.join(", ") || "Not yet allocated"}`,
      9,
    );
  }
  return doc.save();
}
