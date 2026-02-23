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
    doc
      .fontSize(10)
      .fillColor("#555")
      .text(
        `Page ${i + 1} of ${range.count}`,
        doc.page.width - 120,
        doc.page.height - 76,
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
    const { invoice = {}, imageUrl } = req.body;
    let users;

    //dynamic users generation
    const userCount = parseInt(req.body.usersCount || 10);
    if (userCount > 0) {
      users = Array.from({ length: userCount }, (_, i) => ({
        name: `Test${i + 1}`,
        email: `Test${i + 1}@gmail.com`,
        gender: i % 2 === 0 ? "Male" : "Female",
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
    const orientation =
      req.query.orientation === "landscape" ? "landscape" : "portrait";
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
      doc.font("Helvetica");
      doc.font("Helvetica-Bold");

      const FONT = "Helvetica";
      const FONT_BOLD = "Helvetica-Bold";

      const SMALL = 10;
      const NORMAL = 11;

      const GRAY = "#6b7280";
      const LIGHT = "#f3f4f6";
      const DARK = "#111827";

      let y = 40;

      if (imageUrl) {
        try {
          const img = await loadImage(imageUrl);
          doc.image(img, margin, 40, { width: 120 });
        } catch {}
      }

      //invoice number
      doc
        .font(FONT_BOLD)
        .fontSize(18)
        .fillColor(DARK)
        .text(invoice.number || "-", margin, y, {
          align: "right",
          width: pageWidth - margin * 2,
        });

      y += 50;

      // FROM/TO section
      doc.font(FONT).fontSize(SMALL).fillColor(GRAY);
      doc.text("Invoice From", margin, y);

      doc.font(FONT).text("Invoice To", pageWidth / 2, y);

      doc.font(FONT_BOLD).fontSize(NORMAL).fillColor(DARK);
      doc.text(invoice.fromName || "-", margin, y + 15);
      doc.text(invoice.toName || "-", pageWidth / 2, y + 15);

      doc.font(FONT).fontSize(SMALL).fillColor(GRAY);
      doc.text(invoice.fromAddress || "-", margin, y + 30, {
        width: 220,
        lineGap: 2,
      });
      doc.text(invoice.toAddress || "-", pageWidth / 2, y + 30, {
        width: 220,
        lineGap: 2,
      });

      y += 80;

      const info = [
        ["Issue Date", invoice.issueDate || "-"],
        ["Due Date", invoice.dueDate || "-"],
        ["PO Number", invoice.poNumber || "-"],
      ];

      const colWidth = (pageWidth - margin * 2) / 3;
      let x = margin;

      info.forEach(([label, value]) => {
        doc.font(FONT).fontSize(SMALL).fillColor(GRAY).text(label, x, y);
        doc
          .font(FONT_BOLD)
          .fontSize(NORMAL)
          .fillColor(DARK)
          .text(value, x, y + 14);
        x += colWidth;
      });

      y += 45;
      doc.rect(margin, y, pageWidth - margin * 2, 26).fill(LIGHT);

      doc.font(FONT_BOLD).fontSize(NORMAL).fillColor(DARK);

      doc.text("#", margin + 5, y + 8);
      doc.text("Description", margin + 30, y + 8);
      doc.text("Qty", pageWidth - 220, y + 8);
      doc.text("Unit Price", pageWidth - 160, y + 8);
      doc.text("Total", pageWidth - 80, y + 8);

      y += 34;

      let subtotal = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const rowHeight = 34;

        if (y + rowHeight > pageHeight - 170) {
          doc.addPage();
          y = drawInvoiceTableHeader(doc, margin);
        }

        const total = item.quantity * item.price;
        subtotal += total;

        doc.font(FONT).fontSize(SMALL).fillColor(DARK);
        doc.text(i + 1, margin + 5, y);
        doc.font(FONT_BOLD).fontSize(NORMAL);
        doc.text(item.name, margin + 30, y);
        doc.font(FONT).fontSize(SMALL).fillColor(GRAY);
        doc.text(item.description || "", margin + 30, y + 14, {
          width: pageWidth - 320,
          lineGap: 2,
        });

        doc.font(FONT).fillColor(DARK);
        doc.text(item.quantity, pageWidth - 220, y);
        doc.text(`Rs. ${item.price}`, pageWidth - 160, y);

        doc.font(FONT_BOLD);
        doc.text(`Rs. ${total}`, pageWidth - 80, y);

        //  divider
        doc
          .strokeColor("#e5e7eb")
          .dash(3, { space: 3 })
          .moveTo(margin, y + 28)
          .lineTo(pageWidth - margin, y + 28)
          .stroke()
          .undash();

        y += 34;
      }

      // Totals
      let ty = tableY + 20;
      const boxX = pageWidth - 260;
      const totals = [
        ["Total Qty", items.reduce((a, b) => a + b.quantity, 0)],
        ["Subtotal", `Rs. ${invoice.subtotal ?? subtotal}`],
        ["Shipping", `Rs. ${invoice.shipping ?? 0}`],
        ["Discount", `-Rs. ${invoice.discount ?? 0}`],
        ["Taxes", `Rs. ${invoice.tax ?? 0}`],
        ["Total", `Rs. ${invoice.total ?? subtotal}`],
      ];

      totals.forEach(([label, value], i) => {
        const isTotal = i === totals.length - 1;
        const isDiscount = label === "Discount";

        doc
          .font(isTotal ? FONT_BOLD : FONT)
          .fontSize(isTotal ? 13 : 11)
          .fillColor(isTotal ? DARK : GRAY)
          .text(label, boxX, ty);

        doc
          .font(FONT_BOLD)
          .fillColor(isDiscount ? "#DC2626" : DARK) //red for discount secction
          .text(value, pageWidth - 120, ty, {
            width: 80,
            align: "right",
          });

        ty += 20;
      });

      doc
        .strokeColor("#e5e7eb")
        .lineWidth(1)
        .dash(3, { space: 3 })
        .moveTo(margin, ty + 4) 
        .lineTo(pageWidth - margin, ty + 4)
        .stroke()
        .undash();
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