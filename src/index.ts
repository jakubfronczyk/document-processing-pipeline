import express from 'express';
import { Queue, Worker, Job } from 'bullmq';

const app = express();
app.use(express.json());

const redisConfig = {
  host: 'localhost',
  port: 6379,
};

// types
type OCRResult = {
  text: string;
  confidence: number;
  language: string;
};

type InvoiceMetadata = {
  invoiceNumber: string | null;
  customer: string | null;
  amount: number;
};

type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'VALIDATED' | 'FAILED';

type Document = {
  id: string;
  filename: string;
  status: DocumentStatus;
  metadata?: InvoiceMetadata;
  ocrResult?: OCRResult;
  createdAt: Date;
};

// in-memory storage
const documents: Map<string, Document> = new Map();

// bullmq queue and worker
const documentQueue = new Queue('document-processing', {
  connection: redisConfig,
});

// handlers
function simulateOCR(text: string): Promise<OCRResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        text: text,
        confidence: 0.98,
        language: 'en',
      });
    }, 500);
  });
}

function extractMetadata(text: string): InvoiceMetadata {
  return {
    invoiceNumber: text.match(/Invoice #(\S+)/)?.[1] || null,
    customer: text.match(/Customer: ([^\n]+)/)?.[1] || null,
    amount: parseFloat(text.match(/Amount: \$([0-9.]+)/)?.[1] || '0'),
  };
}

function validateDocument(metadata: InvoiceMetadata) {
  const errors = [];
  if (!metadata.invoiceNumber) errors.push('Missing invoice number');
  if (!metadata.customer) errors.push('Missing customer');
  if (!metadata.amount || metadata.amount <= 0) errors.push('Invalid amount');

  return { isValid: errors.length === 0, errors };
}

// background worker
const worker = new Worker(
  'document-processing',
  async (job: Job) => {
    const { documentId, text } = job.data;
    console.log(`[WORKER] Processing document ${documentId}`);

    const document = documents.get(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    try {
      document.status = 'PROCESSING';
      console.log(`[PROCESSING] Started for document ${documentId}`);

      const ocrResult = await simulateOCR(text);
      document.ocrResult = ocrResult;

      const metadata = extractMetadata(ocrResult.text);
      document.metadata = metadata;

      const validation = validateDocument(metadata);

      if (validation.isValid) {
        document.status = 'VALIDATED';
        console.log(`[SUCCESS] Document ${documentId} validated successfully`);
      } else {
        document.status = 'FAILED';
        console.log(
          `[FAILED] Document ${documentId} validation failed: ${validation.errors.join(
            ', '
          )}`
        );
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
    } catch (error) {
      document.status = 'FAILED';
      console.log(`[ERROR] Document ${documentId} processing failed:`, error);
      throw error;
    }
  },
  {
    connection: redisConfig,
    concurrency: 5,
  }
);

// routes
app.post('/api/upload', async (req, res) => {
  try {
    const { text, filename = 'document.txt' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const document: Document = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filename,
      status: 'UPLOADED',
      createdAt: new Date(),
    };

    documents.set(document.id, document);

    await documentQueue.add(
      'process-document',
      {
        documentId: document.id,
        text,
      },
      {
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 1000,
        },
      }
    );

    console.log(`[UPLOAD] Document ${document.id} queued for processing`);

    res.json({
      documentId: document.id,
      status: document.status,
      message: 'Document uploaded and queued for processing',
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/status/:id', (req, res) => {
  const document = documents.get(req.params.id);

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.json(document);
});

app.get('/api/documents', (req, res) => {
  const allDocuments = Array.from(documents.values());
  res.json(allDocuments);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(
    `Document Processing Pipeline running on http://localhost:${PORT}`
  );
});
