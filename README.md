# Document Processing Pipeline

A document processing system that handles invoice documents through multiple stages: upload, OCR processing, validation, and storage.

![Architecture Diagram](./document-processing-pipeline.drawio.svg)

## Overview

A document processing system using text input to focus on architecture over file handling. Upload documents via REST API, process them asynchronously with job queues, extract invoice data, validate, and store in PostgreSQL.

**Key Features:**

- Async processing with BullMQ and Redis
- Invoice metadata extraction and validation
- Database persistence and status tracking
- Structured logging and error handling
- Dead letter queue for failed jobs

## Technology Stack

- **Backend**: Node.js with TypeScript and Express
- **Database**: PostgreSQL with Prisma ORM
- **Queue System**: Redis with BullMQ for background jobs
- **Development**: Docker for local infrastructure

## Quick Start

### 1. Start Infrastructure

```bash
docker compose up -d
```

### 2. Install Dependencies and Setup Database

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

### 3. Create Environment File

Create a `.env` file:

```env
DATABASE_URL="postgresql://postgres:admin@localhost:5432/docprocessing"
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
NODE_ENV=development
```

### 4. Run the Application

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Document Processing Flow

1. **Upload**: Document is received via API and stored with "UPLOADED" status
2. **Queue**: Processing job is added to Redis queue with retry configuration
3. **OCR Processing**: Background worker simulates OCR extraction
4. **Metadata Extraction**: System extracts invoice number, customer, and amount
5. **Validation**: Checks if all required fields are present
6. **Storage**: Updates database with results and final status
7. **Dead Letter Handling**: Failed jobs after all retries are logged for manual review

## Project Structure

```
src/
├── config/          # Database and environment configuration
├── controllers/     # HTTP request handlers
├── middleware/      # Error handling and request processing
├── routes/          # API route definitions
├── services/        # Business logic (OCR, validation, queue management)
├── utils/           # Logging and error utilities
├── workers/         # Background job processors
└── index.ts         # Application entry point
```

## Configuration

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`: Redis server host (default: localhost)
- `REDIS_PORT`: Redis server port (default: 6379)
- `PORT`: API server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## Development Approach

The project was built iteratively through strategic commits to demonstrate my thought process and architectural evolution.

## Scaling and Production Considerations

### Current Limitations

- Single worker instance limits how many documents can be processed at once
- Basic retry strategy without intelligent failure analysis
- No queue monitoring dashboard or metrics
- No rate limiting or authentication

### Scaling Strategies

**Horizontal Scaling:**

- Deploy multiple worker instances to process more documents simultaneously
- Add more database servers to handle more users checking document status
- Use load balancers to distribute API requests across multiple servers
- Store actual files in S3 or cloud storage instead of text input

**Performance Optimizations:**

- Add queue priority levels to process urgent documents first
- Implement database connection pooling to handle more concurrent requests
- Add caching layer to avoid repeated database queries for document status

**Production Features:**

- Add input validation to prevent malformed requests
- Implement rate limiting to prevent users from overwhelming the system
- Add authentication to control who can upload documents
- Support multiple document types (PDF, images, Word documents)

**Testing:**

- Add unit tests for services (OCR, validation, metadata extraction)
- Add integration tests for API endpoints and database operations
- Add worker job testing to ensure queue processing works correctly
