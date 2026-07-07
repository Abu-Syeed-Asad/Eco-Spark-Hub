/* eslint-disable @typescript-eslint/no-unused-vars */
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

interface InvoiceData {
  invoiceId: string;
  userName: string;
  userEmail: string;
  amount: number;
  transactionId: string;
  paymentDate: string;
  description?: string;
  logoPath?: string;
}

export const generateInvoicePdf = async (
  data: InvoiceData,
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 48 });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Colors & layout
      const primary = "#0e4285"; // deep blue
      const accent = "#0ca678"; // green accent

      // HEADER
      const logoX = 52;
      const logoY = 48;
      const logoSize = 64;

      // If a logo path is provided and exists, render it
      if (data.logoPath) {
        try {
          const resolved = path.isAbsolute(data.logoPath)
            ? data.logoPath
            : path.join(process.cwd(), data.logoPath);
          if (fs.existsSync(resolved)) {
            doc.image(resolved, logoX, logoY, {
              width: logoSize,
              height: logoSize,
            });
          } else {
            // fallback: draw circular icon
            doc.save();
            doc
              .circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2)
              .fill(accent);
            doc
              .fillColor("white")
              .fontSize(18)
              .font("Helvetica-Bold")
              .text("ES", logoX + 12, logoY + 14);
            doc.restore();
          }
        } catch (err) {
          // silently ignore image issues and draw fallback
          doc.save();
          doc
            .circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2)
            .fill(accent);
          doc
            .fillColor("white")
            .fontSize(18)
            .font("Helvetica-Bold")
            .text("ES", logoX + 12, logoY + 14);
          doc.restore();
        }
      } else {
        // draw circular icon fallback
        doc.save();
        doc
          .circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2)
          .fill(accent);
        doc
          .fillColor("white")
          .fontSize(18)
          .font("Helvetica-Bold")
          .text("ES", logoX + 12, logoY + 14);
        doc.restore();
      }

      // Company name and contact
      doc
        .fillColor("black")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("ECO-SPARK-HUB", logoX + logoSize + 14, logoY + 10);
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("gray")
        .text("mda457956@gmail.com", logoX + logoSize + 14, logoY + 34);

      // Right: Invoice title
      doc
        .fontSize(34)
        .fillColor(primary)
        .font("Helvetica-Bold")
        .text("INVOICE", 380, logoY + 6, { align: "right" });
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("gray")
        .text("Thank you for your trust in Eco-Spark Hub", 380, logoY + 46, {
          align: "right",
        });

      doc.moveDown(2);

      // Horizontal line
      const startY = 120;
      doc
        .moveTo(48, startY)
        .lineTo(548, startY)
        .lineWidth(1)
        .strokeColor("#e6eef8")
        .stroke();

      // INFO BLOCK
      const leftX = 52;
      const rightX = 320;
      const infoTop = startY + 14;

      // Invoice Details (left)
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#0b2545")
        .text("Invoice Information", leftX, infoTop);
      doc.moveTo(leftX, doc.y + 4);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("black")
        .text(`Invoice ID: ${data.invoiceId}`);
      doc.text(
        `Payment Date: ${new Date(data.paymentDate).toLocaleDateString()}`,
      );
      doc.text(`Transaction ID: ${data.transactionId}`);

      // User Info (right)
      const userTop = infoTop;
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#0b2545")
        .text("User Information", rightX, userTop);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("black")
        .text(`Name: ${data.userName}`, rightX);
      doc.text(`Email: ${data.userEmail}`, rightX);

      doc.moveDown(1.5);

      // TABLE HEADER (dark band)
      const tableTop = doc.y + 6;
      const tableLeft = 48;
      const tableRight = 548;
      const rowHeight = 22;

      doc
        .rect(tableLeft, tableTop, tableRight - tableLeft, rowHeight)
        .fill(primary);
      doc
        .fillColor("white")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("Description", tableLeft + 8, tableTop + 6);
      doc.text("Amount", tableLeft + 360, tableTop + 6, { align: "right" });

      // Table row
      const contentY = tableTop + rowHeight + 8;
      doc
        .fillColor("black")
        .font("Helvetica")
        .fontSize(10)
        .text(data.description ?? "Consultation Fee", tableLeft + 8, contentY);
      doc.text(`${data.amount.toFixed(2)} BDT`, tableLeft + 360, contentY, {
        align: "right",
      });

      // Divider
      const afterRowY = contentY + 26;
      doc
        .moveTo(tableLeft, afterRowY)
        .lineTo(tableRight, afterRowY)
        .strokeColor("#e6eef8")
        .lineWidth(1)
        .stroke();

      // TOTAL BOX (highlighted)
      const totalBoxY = afterRowY + 12;
      const totalBoxHeight = 28;
      doc
        .rect(tableLeft, totalBoxY, tableRight - tableLeft, totalBoxHeight)
        .fill("#f3f6fb");
      doc
        .fillColor("#0b2545")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Total Amount", tableLeft + 8, totalBoxY + 7);
      doc.text(
        `${data.amount.toFixed(2)} BDT`,
        tableLeft + 360,
        totalBoxY + 7,
        { align: "right" },
      );

      // FOOTER
      doc.fontSize(9).fillColor("gray");
      doc.text("Thank you for choosing our platform.", 0, 760, {
        align: "center",
      });
      doc.text(
        "If you have any questions, please contact us at mda457956@gmail.com",
        0,
        774,
        { align: "center" },
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
