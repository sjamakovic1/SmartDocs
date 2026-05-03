# SmartDocs API Documentation

## Base URL

Local development:

```text
http://localhost:5000/api
```

Production:

```text
https://<your-render-service>.onrender.com/api
```

All API routes are served under `/api`.

---

## Authentication

Authentication is not implemented in this MVP.

The API does not require access tokens or session cookies. Supabase service credentials are used only on the server side for private file storage operations and must never be exposed to the client.

---

## Response Format

Successful responses are returned as JSON. Most document endpoints return one of the following shapes:

```json
{
  "document": {}
}
```

```json
{
  "documents": []
}
```

```json
{
  "success": true
}
```

```json
{
  "signedUrl": "https://...",
  "expiresIn": 3600
}
```

---

## Error Format

Standard API errors use this shape:

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document not found."
  }
}
```

Some endpoint-specific errors may include additional response fields, such as `document` and `validationIssues` when confirmation is blocked.

### Common Error Codes

| Code | Meaning |
|---|---|
| `UPLOAD_NO_FILE` | No file was provided in the upload request. |
| `UPLOAD_UNSUPPORTED_TYPE` | Uploaded file type is not supported. |
| `DOCUMENT_PARSE_FAILED` | Document parsing failed. |
| `DOCUMENT_SAVE_FAILED` | Document could not be saved after parsing. |
| `FILE_STORAGE_UPLOAD_FAILED` | Original file could not be uploaded to storage. |
| `DOCUMENT_ID_REQUIRED` | Document ID is missing. |
| `DOCUMENT_NOT_FOUND` | Document does not exist. |
| `DOCUMENT_UPDATE_FAILED` | Document update failed. |
| `DOCUMENT_REJECTED_LOCKED` | Rejected document must be reopened before editing or confirming. |
| `DOCUMENT_CONFIRM_BLOCKED` | Document cannot be confirmed while validation issues remain. |
| `DOCUMENT_CONFIRM_FAILED` | Document confirmation failed. |
| `REJECT_REASON_REQUIRED` | Reject reason is required. |
| `ORIGINAL_FILE_NOT_FOUND` | Original file metadata is missing for the document. |
| `SIGNED_URL_FAILED` | Signed URL could not be generated. |
| `ROUTE_NOT_FOUND` | API route does not exist. |
| `INTERNAL_SERVER_ERROR` | Unexpected server error. |

---

# Endpoints

## Health Check

### `GET /api/health`

Checks whether the API is running.

#### Response

```json
{
  "message": "SmartDocs API is running",
  "status": "ok"
}
```

#### Example

```bash
curl http://localhost:5000/api/health
```

---

## Upload Document

### `POST /api/documents/upload`

Uploads a document file for extraction, validation, persistence, and review.

#### Content Type

```text
multipart/form-data
```

#### Form Data

| Field | Type | Required | Description |
|---|---|---:|---|
| `file` | File | Yes | Document file to process. |

#### Supported File Types

```text
PDF, CSV, TXT, PNG, JPG, JPEG
```

#### Behavior

- Parses the uploaded file.
- Extracts document fields where possible.
- Runs validation.
- Saves extracted data and validation issues to the database.
- Saves the original file to private Supabase Storage.
- Creates the document with initial status `UPLOADED`.

Validation issues may exist even when the status is `UPLOADED`.

#### Success Response

Status: `201 Created`

```json
{
  "document": {
    "id": "doc_abc123",
    "fileName": "invoice.pdf",
    "mimeType": "application/pdf",
    "fileSize": 12345,
    "fileStorageBucket": "Documents",
    "fileStoragePath": "documents/doc_abc123/20260502T120000Z-invoice.pdf",
    "documentType": "INVOICE",
    "status": "UPLOADED",
    "supplierName": "Company Name",
    "documentNumber": "INV-1001",
    "issueDate": "2026-04-28",
    "dueDate": "2026-05-28",
    "currency": "EUR",
    "subtotal": 100,
    "taxRate": 17,
    "tax": 17,
    "total": 117,
    "rawText": "...",
    "ocrConfidence": null,
    "imageWidth": null,
    "imageHeight": null,
    "lineItems": [],
    "validationIssues": [],
    "createdAt": "2026-05-02T12:00:00.000Z",
    "updatedAt": "2026-05-02T12:00:00.000Z"
  }
}
```

#### Possible Errors

| Status | Code |
|---:|---|
| 400 | `UPLOAD_NO_FILE` |
| 400 | `UPLOAD_UNSUPPORTED_TYPE` |
| 500 | `DOCUMENT_PARSE_FAILED` |
| 500 | `DOCUMENT_SAVE_FAILED` |
| 500 | `FILE_STORAGE_UPLOAD_FAILED` |

#### Example

```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@./invoice.pdf"
```

---

## List Documents

### `GET /api/documents`

Returns stored documents.

#### Response

```json
{
  "documents": [
    {
      "id": "doc_abc123",
      "fileName": "invoice.pdf",
      "documentType": "INVOICE",
      "status": "UPLOADED",
      "supplierName": "Company Name",
      "documentNumber": "INV-1001",
      "currency": "EUR",
      "total": 117,
      "lineItems": [],
      "validationIssues": [],
      "createdAt": "2026-05-02T12:00:00.000Z",
      "updatedAt": "2026-05-02T12:00:00.000Z"
    }
  ]
}
```

#### Example

```bash
curl http://localhost:5000/api/documents
```

---

## Get Document

### `GET /api/documents/:id`

Returns a single document by ID.

#### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Document ID. |

#### Response

```json
{
  "document": {
    "id": "doc_abc123",
    "documentType": "INVOICE",
    "status": "NEEDS_REVIEW",
    "supplierName": "Company Name",
    "documentNumber": "INV-1001",
    "issueDate": "2026-04-28",
    "dueDate": "2026-05-28",
    "currency": "EUR",
    "subtotal": 100,
    "taxRate": 17,
    "tax": 17,
    "total": 117,
    "lineItems": [],
    "validationIssues": []
  }
}
```

#### Possible Errors

| Status | Code |
|---:|---|
| 400 | `DOCUMENT_ID_REQUIRED` |
| 404 | `DOCUMENT_NOT_FOUND` |

#### Example

```bash
curl http://localhost:5000/api/documents/doc_abc123
```

---

## Update Document

### `PUT /api/documents/:id`

Saves manual corrections for a document.

#### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---:|---|
| `id` | string | Yes | Document ID. |

#### Request Body

The request body may include any editable document fields:

```json
{
  "documentType": "INVOICE",
  "documentNumber": "INV-1001",
  "supplierName": "Company Name",
  "issueDate": "2026-04-28",
  "dueDate": "2026-05-28",
  "currency": "EUR",
  "subtotal": 100,
  "taxRate": 17,
  "tax": 17,
  "total": 117,
  "lineItems": [
    {
      "description": "Service A",
      "quantity": 5,
      "unitPrice": 20,
      "lineTotal": 100
    }
  ]
}
```

Fields not included in the request remain unchanged.

#### Behavior

- Saves edited extracted fields.
- Replaces line items if `lineItems` is provided.
- Re-runs validation.
- Replaces validation issues.
- If the document status is `UPLOADED`, saving changes moves it to `NEEDS_REVIEW`.
- If the document status is `VALIDATED`, saving keeps it `VALIDATED`.
- If the document status is `REJECTED`, editing is blocked until the document is reopened.

#### Response

```json
{
  "document": {
    "id": "doc_abc123",
    "status": "NEEDS_REVIEW",
    "documentType": "INVOICE",
    "supplierName": "Company Name",
    "documentNumber": "INV-1001",
    "validationIssues": []
  }
}
```

#### Possible Errors

| Status | Code |
|---:|---|
| 400 | `DOCUMENT_ID_REQUIRED` |
| 400 | `DOCUMENT_REJECTED_LOCKED` |
| 404 | `DOCUMENT_NOT_FOUND` |
| 500 | `DOCUMENT_UPDATE_FAILED` |

#### Example

```bash
curl -X PUT http://localhost:5000/api/documents/doc_abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "supplierName": "Updated Supplier",
    "total": 117
  }'
```

---

## Re-run Validation

### `POST /api/documents/:id/validate`

Re-runs validation for a stored document.

#### Behavior

- Loads the stored document.
- Runs validation rules again.
- Replaces stored validation issues.
- Does not automatically mark the document as `VALIDATED`.
- If the document is `REJECTED`, the document is returned without changing validation state.

#### Response

```json
{
  "document": {
    "id": "doc_abc123",
    "status": "NEEDS_REVIEW",
    "validationIssues": []
  }
}
```

#### Possible Errors

| Status | Code |
|---:|---|
| 400 | `DOCUMENT_ID_REQUIRED` |
| 404 | `DOCUMENT_NOT_FOUND` |

#### Example

```bash
curl -X POST http://localhost:5000/api/documents/doc_abc123/validate
```

---

## Confirm Document

### `POST /api/documents/:id/confirm`

Confirms a reviewed document as valid.

#### Behavior

- Re-runs validation before confirmation.
- If blocking validation issues remain, confirmation is blocked.
- If validation passes, status becomes `VALIDATED`.
- `REJECTED` documents must be reopened before confirmation.

#### Success Response

```json
{
  "document": {
    "id": "doc_abc123",
    "status": "VALIDATED",
    "validationIssues": []
  }
}
```

#### Blocked Confirmation Response

Status: `400 Bad Request`

```json
{
  "error": {
    "code": "DOCUMENT_CONFIRM_BLOCKED",
    "message": "Document cannot be confirmed while validation errors remain."
  },
  "document": {
    "id": "doc_abc123",
    "status": "NEEDS_REVIEW"
  },
  "validationIssues": [
    {
      "id": "issue_1",
      "field": "supplierName",
      "code": "MISSING_FIELD",
      "message": "Supplier/company name is required.",
      "severity": "WARNING",
      "resolved": false
    }
  ]
}
```

#### Possible Errors

| Status | Code |
|---:|---|
| 400 | `DOCUMENT_ID_REQUIRED` |
| 400 | `DOCUMENT_CONFIRM_BLOCKED` |
| 400 | `DOCUMENT_REJECTED_LOCKED` |
| 404 | `DOCUMENT_NOT_FOUND` |
| 500 | `DOCUMENT_CONFIRM_FAILED` |

#### Example

```bash
curl -X POST http://localhost:5000/api/documents/doc_abc123/confirm
```

---

## Reject Document

### `POST /api/documents/:id/reject`

Rejects a document.

#### Request Body

```json
{
  "rejectReason": "The uploaded file is not a valid invoice or purchase order."
}
```

#### Behavior

- Requires a non-empty `rejectReason`.
- Sets document status to `REJECTED`.
- Stores the reject reason.

#### Response

```json
{
  "document": {
    "id": "doc_abc123",
    "status": "REJECTED",
    "rejectReason": "The uploaded file is not a valid invoice or purchase order."
  }
}
```

#### Possible Errors

| Status | Code |
|---:|---|
| 400 | `DOCUMENT_ID_REQUIRED` |
| 400 | `REJECT_REASON_REQUIRED` |
| 404 | `DOCUMENT_NOT_FOUND` |

#### Example

```bash
curl -X POST http://localhost:5000/api/documents/doc_abc123/reject \
  -H "Content-Type: application/json" \
  -d '{
    "rejectReason": "Incorrect document type."
  }'
```

---

## Reopen Document

### `POST /api/documents/:id/reopen`

Reopens a rejected document for review.

#### Behavior

- Clears `rejectReason`.
- Sets status to `NEEDS_REVIEW`.
- Re-runs validation.

#### Response

```json
{
  "document": {
    "id": "doc_abc123",
    "status": "NEEDS_REVIEW",
    "rejectReason": null,
    "validationIssues": []
  }
}
```

#### Possible Errors

| Status | Code |
|---:|---|
| 400 | `DOCUMENT_ID_REQUIRED` |
| 404 | `DOCUMENT_NOT_FOUND` |

#### Example

```bash
curl -X POST http://localhost:5000/api/documents/doc_abc123/reopen
```

---

## Get Original File Signed URL

### `GET /api/documents/:id/file-url`

Generates a temporary signed URL for the original uploaded file.

Original files are stored in a private Supabase Storage bucket and are not exposed through permanent public URLs.

#### Behavior

- Loads the document by ID.
- Checks whether original file storage metadata exists.
- Generates a signed URL.
- Signed URL expires after `3600` seconds.

#### Response

```json
{
  "signedUrl": "https://example.supabase.co/storage/v1/object/sign/...",
  "expiresIn": 3600
}
```

#### Possible Errors

| Status | Code |
|---:|---|
| 400 | `DOCUMENT_ID_REQUIRED` |
| 404 | `ORIGINAL_FILE_NOT_FOUND` |
| 500 | `SIGNED_URL_FAILED` |

#### Example

```bash
curl http://localhost:5000/api/documents/doc_abc123/file-url
```

---

## Delete Document

### `DELETE /api/documents/:id`

Deletes a document.

#### Behavior

- Removes the database record.
- Removes the original file from Supabase Storage if storage metadata exists.

#### Response

```json
{
  "success": true
}
```

#### Possible Errors

| Status | Code |
|---:|---|
| 400 | `DOCUMENT_ID_REQUIRED` |
| 404 | `DOCUMENT_NOT_FOUND` |

#### Example

```bash
curl -X DELETE http://localhost:5000/api/documents/doc_abc123
```

---

# Data Models

## Document Object

Document responses use the following general shape:

```json
{
  "id": "doc_abc123",
  "documentType": "INVOICE",
  "documentNumber": "INV-1001",
  "supplierName": "Company Name",
  "issueDate": "2026-04-28",
  "dueDate": "2026-05-28",
  "currency": "EUR",
  "subtotal": 100,
  "taxRate": 17,
  "tax": 17,
  "total": 117,
  "status": "UPLOADED",
  "rejectReason": null,
  "rawText": "...",
  "ocrConfidence": 82,
  "imageWidth": 1200,
  "imageHeight": 800,
  "fileName": "invoice.pdf",
  "fileUrl": null,
  "mimeType": "application/pdf",
  "fileSize": 12345,
  "fileStorageBucket": "Documents",
  "fileStoragePath": "documents/doc_abc123/20260502T120000Z-invoice.pdf",
  "lineItems": [],
  "validationIssues": [],
  "createdAt": "2026-05-02T12:00:00.000Z",
  "updatedAt": "2026-05-02T12:00:00.000Z"
}
```

Some fields may be `null` when extraction or OCR cannot identify them confidently.

### Document Types

```text
INVOICE
PURCHASE_ORDER
UNKNOWN
```

### Document Statuses

```text
UPLOADED
NEEDS_REVIEW
VALIDATED
REJECTED
```

---

## Line Item Object

```json
{
  "id": "line_1",
  "description": "Service A",
  "quantity": 5,
  "unitPrice": 20,
  "lineTotal": 100
}
```

---

## Validation Issue Object

```json
{
  "id": "issue_1",
  "field": "total",
  "code": "TOTAL_MISMATCH",
  "message": "Total does not match subtotal plus tax.",
  "severity": "ERROR",
  "resolved": false,
  "expectedValue": 117,
  "actualValue": 120
}
```

### Validation Severities

```text
INFO
WARNING
ERROR
```

### Validation Issue Codes

```text
MISSING_FIELD
INVALID_DATE
UNSUPPORTED_CURRENCY
CURRENCY_INFERRED
OCR_LOW_CONFIDENCE
OCR_NO_TEXT_DETECTED
IMAGE_LOW_RESOLUTION
UNSUPPORTED_DOCUMENT_TYPE
OCR_CURRENCY_CORRECTED
OCR_LIMITED_EXTRACTION
MULTIPLE_DOCUMENTS_DETECTED
TAX_RATE_DERIVED
PLACEHOLDER_VALUE_DETECTED
DUPLICATE_DOCUMENT_NUMBER
LINE_TOTAL_MISMATCH
SUBTOTAL_MISMATCH
TAX_MISMATCH
TOTAL_MISMATCH
```

---

# Workflow Through API

SmartDocs uses explicit user review actions.

```text
Upload document
→ UPLOADED

Save manual corrections
→ NEEDS_REVIEW

Confirm as validated
→ VALIDATED

Reject document
→ REJECTED

Reopen rejected document
→ NEEDS_REVIEW
```

Notes:

- Documents are not automatically marked as `VALIDATED`.
- A user must explicitly confirm a document.
- Validation issues can exist while the document status is `UPLOADED`.
- Rejected documents are locked from editing until reopened.
