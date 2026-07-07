import fs from "fs";
import { generateInvoicePdf } from "../src/app/modules/payment/payment.utils";

(async () => {
  try {
    const buffer = await generateInvoicePdf({
      invoiceId: "INV-2026-0001",
      userName: "John Doe",
      userEmail: "john.doe@example.com",
      amount: 500,
      transactionId: "TRX-9d8f7g6h5j4k3l2",
      paymentDate: new Date().toISOString(),
      description: "Consultation Fee",
      // pass the existing logo in the payment module folder
      logoPath: "src/app/modules/payment/logo.png",
    });

    const outDir = "./tmp";
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const outPath = `${outDir}/invoice_sample.pdf`;
    fs.writeFileSync(outPath, buffer);
    console.log("Generated sample invoice at", outPath);
  } catch (err) {
    console.error("Error generating invoice:", err);
    process.exit(1);
  }
})();
