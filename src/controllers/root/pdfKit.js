import PDFDocument from "pdfkit";
import https from "https";


//Loading image from URL
function loadImage(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

//pagenumber at bottom of page
function drawPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(10).fillColor("#555").text(
      `Page ${i + 1} of ${range.count}`,
      doc.page.width - 120,
      doc.page.height - 76
    );
  }
}

//table header for invoice
function drawInvoiceTableHeader(doc, y) {
  const margin = 40;
  const pageWidth = doc.page.width;

  doc.rect(margin, y, pageWidth - margin * 2, 25).fill("#f0f2f5");
  doc.fillColor("#333").fontSize(11);

  doc.text("#", margin + 5, y + 7);
  doc.text("Description", margin + 30, y + 7);
  doc.text("Qty", pageWidth - 220, y + 7);
  doc.text("Unit", pageWidth - 160, y + 7);
  doc.text("Total", pageWidth - 80, y + 7);

  return y + 30;
}

//table header for user list
function drawUserTableHeader(doc, y) {
  const margin = 40;
  const pageWidth = doc.page.width;

  doc.rect(margin, y, pageWidth - margin * 2, 25).fill("#f0f2f5");
  doc.fillColor("#333").fontSize(11);

  doc.text("SN", margin + 5, y + 7);
  doc.text("Name", margin + 50, y + 7);
  doc.text("Email", margin + 200, y + 7);
  doc.text("Gender", margin + 400, y + 7);
  doc.text("Role", margin + 470, y + 7);

  return y + 30;
}

//pdf generation logic
export const printPdfKit = async (req, res) => {
  let doc;

  try {
    const {
      invoice = {},
      imageUrl,
    } = req.body;
    let users;

    //dynamic users generation
    const userCount = parseInt(req.body.usersCount || 10);
    if (userCount > 0) {
        users = Array.from({ length: userCount }, (_, i) => ({
            name: `test${i + 1}`,
            email: `test${i + 1}@gmail.com`,
            gender: i % 2 === 0 ? "male" : "female",
            role: i % 2 === 0 ? "Admin" : "User",
        }));
    }

    //dynamic items generation
    let items = req.body.items || [];
    const itemsCount = parseInt(req.body.itemsCount || "10", 10);
    if (!items.length && itemsCount > 0) {
    items = Array.from({ length: itemsCount }, (_, i) => ({
        name: `Product ${i + 1}`,
        description: `Awesome item ${i + 1}`,
        quantity: (i % 5) + 1,
        price: ((i % 5) + 1) * 50,
    }));
    }

    const design = req.query.design || "invoice";
    const size = req.query.size || "A4";
    const orientation = req.query.orientation === "landscape" ? "landscape" : "portrait";
    const filename = req.query.filename || "document";
    const showPageNumbers = req.query.pageNumber === "true";

    doc = new PDFDocument({
      size,
      layout: orientation,
      margins: { top: 40, left: 40, right: 40, bottom: 40 },
      bufferPages: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}.pdf"`);
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;
    let tableY = 40;

    //invoice designe here
    if (design === "invoice") {
    
      if (imageUrl) {
        try {
          const img = await loadImage(imageUrl);
          doc.image(img, margin, 40, { width: 120 });
        } catch {}
      }

      doc.fontSize(20).text(invoice.number || "-", margin, 45, {
        align: "right",
        width: pageWidth - margin * 2,
      });

      tableY = 90;

      // FROM/TO section
      const startY = tableY;
      doc.fontSize(10).fillColor("#777").text("Invoice From", margin, startY);
      doc.fillColor("#000").fontSize(12).text(invoice.fromName || "-", margin, startY + 15);
      doc.fontSize(10).fillColor("#555").text(invoice.fromAddress || "-", margin, startY + 32, { width: 220 });

      doc.fontSize(10).fillColor("#777").text("Invoice To", pageWidth / 2, startY);
      doc.fillColor("#000").fontSize(12).text(invoice.toName || "-", pageWidth / 2, startY + 15);
      doc.fontSize(10).fillColor("#555").text(invoice.toAddress || "-", pageWidth / 2, startY + 32, { width: 220 });

      // Issue Date, Due Date, PO Number section
      const infoY = startY + 65;
      const info = [
        ["Issue Date", invoice.issueDate || "-"],
        ["Due Date", invoice.dueDate || "-"],
        ["PO Number", invoice.poNumber || "-"],
      ];
      let infoX = margin;
      const colWidth = (pageWidth - margin * 2) / info.length;
      info.forEach(([label, value]) => {
        doc.fontSize(10).fillColor("#777").text(label, infoX, infoY);
        doc.fillColor("#000").fontSize(11).text(value, infoX, infoY + 15);
        infoX += colWidth;
      });

      tableY = infoY + 60;

      // Table columns
      tableY = drawInvoiceTableHeader(doc, tableY);
      let subtotal = 0;
      items.forEach((item, idx) => {
        const rowHeight = 24;

        if (tableY + rowHeight > pageHeight - 180) {
          doc.addPage();
          tableY = drawInvoiceTableHeader(doc, margin);
        }

        const total = item.quantity * item.price;
        subtotal += total;

        doc.fillColor("#000").fontSize(10);
        doc.text(idx + 1, margin + 5, tableY);
        doc.text(`${item.name}\n${item.description || ""}`, margin + 30, tableY, { width: pageWidth - 300 });
        doc.text(item.quantity, pageWidth - 220, tableY);
        doc.text(`Rs. ${item.price}`, pageWidth - 160, tableY);
        doc.text(`Rs. ${total}`, pageWidth - 80, tableY);

        tableY += rowHeight + 6;
      });

      // Totals
      let ty = tableY + 20;
      const boxX = pageWidth - 260;
      const totals = [
        ["Total Qty", items.reduce((a, b) => a + b.quantity, 0)],
        ["Subtotal", `Rs. ${invoice.subtotal ?? subtotal}`],
        ["Discount", `Rs. ${invoice.discount ?? 0}`],
        ["Taxes", `Rs. ${invoice.tax ?? 0}`],
        ["Shipping", `Rs. ${invoice.shipping ?? 0}`],
        ["Total", `Rs. ${invoice.total ?? subtotal}`],
      ];
      totals.forEach(([label, value], i) => {
        doc.fontSize(i === totals.length - 1 ? 13 : 11)
          .fillColor(i === totals.length - 1 ? "#000" : "#555")
          .text(label, boxX, ty);
        doc.fillColor("#000").text(value, pageWidth - 120, ty, { width: 80, align: "right" });
        ty += 20;
      });
    }

    //user-list design here
    if (design === "user-list") {
      tableY = drawUserTableHeader(doc, tableY);

      users.forEach((user, idx) => {
        const rowHeight = 20;

        if (tableY + rowHeight > pageHeight - 80) {
          doc.addPage();
          tableY = drawUserTableHeader(doc, 40);
        }

        doc.fillColor("#000").fontSize(10);
        doc.text(idx + 1, margin + 5, tableY);
        doc.text(user.name, margin + 50, tableY);
        doc.text(user.email, margin + 200, tableY);
        doc.text(user.gender || "-", margin + 400, tableY);
        doc.text(user.role || "-", margin + 470, tableY);

        tableY += rowHeight;
      });
    }

    //page numbers section here
    if (showPageNumbers) drawPageNumbers(doc);

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).send("PDF generation failed");
    if (doc) try { doc.end(); } catch {}
  }
};