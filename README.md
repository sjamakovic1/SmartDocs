# SmartDocs - Smart Document Processing System

SmartDocs is a full-stack document processing system built for a take-home engineering task. The application processes real-world business documents, extracts structured data, validates extracted values, stores the results, and provides a review interface for manual corrections and workflow actions.

The system focuses on invoices and purchase orders and supports PDF, image, CSV, and TXT inputs.

---

## Live Application

**Live application:**

```txt
https://smartdocs-ss9a.onrender.com
```

**GitHub repository:**

```txt
https://github.com/sjamakovic1/SmartDocs
```

---

## Core Features

- Upload and process business documents
- Supported input formats:
  - PDF
  - PNG, JPG, JPEG
  - CSV
  - TXT
- Extract structured document data:
  - Document type
  - Supplier / company name
  - Document number
  - Issue date
  - Due date
  - Currency
  - Line items
  - Subtotal
  - Tax rate
  - Tax amount
  - Total
- OCR support for image documents
- Backend validation engine for:
  - Missing required fields
  - Invalid dates
  - Due date before issue date
  - Duplicate document numbers
  - Line item calculation mismatches
  - Subtotal mismatches
  - Tax mismatches
  - Total mismatches
  - Unsupported or inferred currencies
  - OCR quality warnings
- Review interface for manual corrections
- Document workflow statuses:
  - Uploaded
  - Needs Review
  - Validated
  - Rejected
- Persistent document storage with PostgreSQL and Prisma
- Private original file storage using Supabase Storage
- Short-lived signed URLs for opening original uploaded files
- Dashboard with document status and validation issue overview
- Backend unit and API tests
- Docker-based production deployment support
- Separate API documentation in `API Documentation.md`

---

## Tech Stack

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- Axios
- React Router

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Supabase Storage
- Multer
- Tesseract.js
- Vitest
- Supertest

### Deployment

- Render
- Docker
- Supabase PostgreSQL / Storage

---

## Project Structure

```txt
SmartDocs/
  client/
    src/
      components/
      pages/
      services/
      types/
      utils/
    public/
    package.json

  server/
    src/
      config/
      controllers/
      extraction/
      parsers/
      routes/
      services/
      types/
      utils/
      validation/
      app.ts
      server.ts

    tests/
      api/
      unit/

    dev-scripts/
    prisma/
    package.json

  API Documentation.md
  Dockerfile
  package.json
```

---

## Setup Instructions

### Prerequisites

Install:

- Node.js 20+
- npm
- PostgreSQL database
- Supabase project for Storage
- Docker, optional

---

## Environment Variables

Create a `.env` file inside the `server` folder.

Example:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=Documents

PORT=5000
```

For local frontend development, create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

In production, `VITE_API_URL` is not required because the frontend uses same-origin `/api`.

---

## Installation

From the project root:

```bash
npm run install:all
```

This installs dependencies for both `client` and `server`.

Alternatively:

```bash
cd server
npm install

cd ../client
npm install
```

---

## Database Setup

Generate the Prisma client:

```bash
cd server
npx prisma generate
```

Run migrations locally:

```bash
npx prisma migrate dev
```

For production deployment:

```bash
npx prisma migrate deploy
```

---

## Running the Application Locally

### Development Mode

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

Frontend:

```txt
http://localhost:5173
```

Backend:

```txt
http://localhost:5000
```

---

## Running a Production Build Locally

From the project root:

```bash
npm run build
```

On PowerShell:

```powershell
$env:NODE_ENV="production"
npm run start
```

Then open:

```txt
http://localhost:5000
```

To clear the environment variable after testing:

```powershell
Remove-Item Env:NODE_ENV
```

---

## Testing

Run backend tests:

```bash
npm test --prefix server
```

Run backend build:

```bash
npm run build --prefix server
```

Run frontend build:

```bash
npm run build --prefix client
```

Run full production build from the root:

```bash
npm run build
```

The backend test suite includes:

- Validation engine tests
- Extraction helper tests
- Parser-related utility tests
- File type detection tests
- Document workflow tests
- API smoke tests with Supertest

---

## Docker

Build Docker image:

```bash
docker build -t smartdocs .
```

Run Docker container:

```bash
docker run --env-file server/.env -p 5000:5000 smartdocs
```

Open:

```txt
http://localhost:5000
```

---

## API Documentation

Detailed API documentation is available in:

```txt
API Documentation.md
```

It includes:

- Base URL
- Standard error response format
- Document upload endpoint
- Document listing endpoint
- Document review/update endpoint
- Validation endpoint
- Confirm/reject/reopen workflow endpoints
- Original file signed URL endpoint
- Delete endpoint
- Document, line item, and validation issue response shapes

---

## Explanation of Approach

The system was designed around a clear processing pipeline:

```txt
Upload
→ Parse / OCR
→ Extract structured fields
→ Validate extracted data
→ Store document and original file
→ Review and correct
→ Confirm, reject, or reopen
```

### 1. Document Ingestion

The backend accepts uploaded files through an Express API using Multer.

Supported formats are detected by extension and MIME type. The system supports PDF, CSV, TXT, PNG, JPG, and JPEG files.

Original files are uploaded to a private Supabase Storage bucket. The frontend can open original files only through short-lived signed URLs generated by the backend.

### 2. Data Extraction

Each file type has a dedicated parser:

- PDF parser extracts text from PDF documents
- Image parser uses OCR
- CSV parser reads structured line item data
- TXT parser handles semi-structured text documents

Common extraction helpers identify shared fields such as document type, supplier name, document number, dates, currency, subtotal, tax, total, and line items.

The extraction logic is intentionally best-effort because real-world business documents can vary significantly in structure.

### 3. Validation Engine

The validation engine is implemented on the backend.

It checks:

- Missing fields
- Unsupported currency
- Invalid dates
- Due date before issue date
- Duplicate document numbers
- Line item total mismatches
- Subtotal mismatches
- Tax mismatches
- Total mismatches

Validation issues are stored with the document and displayed in the review interface.

The frontend does not duplicate the main validation logic. It displays backend validation results and allows users to correct extracted values.

### 4. Review Interface

After upload, documents start with the `UPLOADED` status.

Users can:

- Review extracted values
- Edit document fields
- Edit line items
- Save changes
- Re-run validation
- Confirm valid documents
- Reject invalid documents
- Reopen rejected documents

Documents are not automatically marked as validated. Explicit user confirmation is required.

### 5. Persistence

The backend uses Prisma with PostgreSQL to store:

- Document metadata
- Extracted fields
- OCR/raw text data
- Line items
- Validation issues
- Workflow status
- Original file storage metadata

The original binary files are stored separately in Supabase Storage.

### 6. Deployment

The application is deployed as a single service.

In production:

- Express serves the React build
- API routes are available under `/api`
- React Router routes work on refresh through the Express fallback
- Runtime environment variables are configured on Render
- Original files remain private in Supabase Storage

---

## AI Tools Used

AI tools were used during development for planning, implementation support, debugging, refactoring, and documentation assistance.

Main AI-assisted areas included:

- Project planning and feature breakdown
- Backend parser and validation implementation support
- Prisma and persistence setup support
- Supabase Storage integration support
- API error handling cleanup
- Test strategy planning
- Unit and API test implementation guidance
- Docker and Render deployment troubleshooting
- Backend refactoring guidance
- Frontend refactoring guidance
- API documentation and README preparation

AI was used as a development assistant, but the implementation was reviewed, tested, and adjusted manually.

The validation engine and workflow behavior were implemented as project-specific logic and verified through automated and manual testing.

---

## Improvements I Would Make

Given more time, I would improve the system in the following areas.

### 1. Authentication and User Roles

Add authentication so documents are tied to users or organizations.

Possible roles:

- Admin
- Reviewer
- Viewer

### 2. Better OCR Pipeline

Improve OCR accuracy by adding:

- Better image preprocessing
- Rotation detection
- Table detection
- Multi-page image/PDF support
- More robust OCR confidence handling

### 3. Advanced Document Classification

Improve automatic detection of document type using a model or rule scoring system instead of only regex-based heuristics.

### 4. More Robust Extraction

Add stronger extraction support for:

- Different invoice layouts
- Multi-page invoices
- Multiple tax rates
- Discounts
- Shipping costs
- Purchase order-specific fields
- Vendor addresses and tax IDs

### 5. Batch Upload

Allow users to upload and process multiple documents at once.

### 6. Audit Trail

Track review changes:

- Who changed a field
- Previous value
- New value
- Timestamp

### 7. Export Features

Add export support for:

- CSV
- JSON
- PDF reports
- Accounting-system compatible formats

### 8. Better Test Coverage

Current backend tests cover the core validation, extraction, workflow, and API behavior.

Further improvements could include:

- Frontend component tests
- End-to-end tests
- More OCR edge case tests
- More real-world invoice and purchase order fixtures

### 9. OpenAPI / Swagger Documentation

The current API is documented in Markdown. A future improvement would be generating an OpenAPI specification and Swagger UI.

### 10. Production Hardening

Additional production improvements could include:

- Request rate limiting
- File size and virus scanning
- Background processing queue
- Better logging
- Monitoring and alerting
- Retry handling for OCR, storage, and database failures

---

## Known Limitations

- OCR extraction is best-effort.
- Some messy or low-quality images may produce incomplete extraction.
- No authentication is implemented in the MVP.
- Batch upload is not implemented.
- Original files are private and accessible only through temporary signed URLs.
- The application currently focuses on invoices and purchase orders only.

---

