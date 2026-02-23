# PDFKit Invoice & User-List API

This project provides a Node.js API to dynamically generate PDF documents using [PDFKit](https://pdfkit.org/). It supports:

- **Invoice PDFs** with dynamic items.
- **User-list PDFs** with dynamic users.
- Dynamic generation of dummy users/items if counts are provided in the request.
- Optional **page numbers** and **image/logo headers**.

---

## Base Endpoint


POST /print-pdfkit


### Query Parameters

| Parameter      | Type     | Description |
|----------------|----------|-------------|
| `design`       | string   | `invoice` (default) or `user-list`. |
| `size`         | string   | Page size: `A4` (default), `A3`, `A5`, etc. |
| `orientation`  | string   | `portrait` (default) or `landscape`. |
| `filename`     | string   | Output PDF file name (default: `document`). |
| `pageNumber`   | boolean  | `true` to show page numbers at bottom-right. |

---

### Request Body

#### Invoice Example

```json
{
  "invoice": {
    "number": "INV-00002",
    "total": 999999,
    "subtotal": 100,
    "fromName": "2024",
    "fromAddress": "ktm",
    "toName": "2025",
    "toAddress": "brt",
    "issueDate": "2025-01-02",
    "dueDate": "2026-01-02",
    "poNumber": "123"
  },
  "imageUrl": "https://imagedelivery.net/f0nW4MWjcqRd6k4ezHI6EQ/velorona.com/2025/09/logo-velorona-white-text-with-logo-455x98-2.png/w=455",
  "itemsCount": 10,
  "usersCount": 10
}
```
Notes on Dynamic Generation

itemsCount: Generates items dynamically if items array is empty.
Each item will have:

Field	Example
name	"Product 1"
description	"Awesome item 1"
quantity	1–5
price	50, 100, 150…

usersCount: Generates users dynamically if users array is empty.
Each user will have:

Field	Example
name	"test1"
email	"test1@gmail.com"
gender	"male" / "female" (alternating)
role	"Admin" / "User" (alternating)
Response

Returns a PDF file inline with Content-Type: application/pdf.

Example response headers:

Content-Type: application/pdf
Content-Disposition: inline; filename="invoicings.pdf"

No JSON body — the PDF is streamed directly in the response.

Example curl Request
```json
curl --location 'http://localhost:6000/print-pdfkit?size=A4&orientation=portrait&filename=invoicings&pageNumber=true&design=user-list' \
--header 'Content-Type: application/json' \
--data '{
    "invoice": {
        "number": "INV-00002",
        "total": 999999,
        "subtotal": 100,
        "fromName": "2024",
        "fromAddress": "ktm",
        "toName": "2025",
        "toAddress": "brt",
        "issueDate": "2025-01-02",
        "dueDate": "2026-01-02",
        "poNumber": "123"
    },
    "imageUrl": "https://imagedelivery.net/f0nW4MWjcqRd6k4ezHI6EQ/velorona.com/2025/09/logo-velorona-white-text-with-logo-455x98-2.png/w=455",
    "itemsCount": 10,
    "usersCount": 10
}'
```
Notes:

If design=invoice → invoice PDF is generated with items and totals.

If design=user-list → user-list PDF is generated with table of users.

Page numbers are optional, controlled via pageNumber=true.

Images are loaded from URLs via HTTPS.

Dependencies:
PDFKit
 — PDF generation library(https://pdfkit.org/)