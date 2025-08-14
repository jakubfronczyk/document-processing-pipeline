import express from 'express';
import { Queue, Worker, Job } from 'bullmq';
import { DocumentStatus, PrismaClient } from '@prisma/client';

const app = express();
app.use(express.json());

const prisma = new PrismaClient();

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

    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
      },
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    try {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PROCESSING },
      });

      const ocrResult = await simulateOCR(text);

      const metadata = extractMetadata(ocrResult.text);

      const validation = validateDocument(metadata);

      if (validation.isValid) {
        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: DocumentStatus.VALIDATED,
            metadata: metadata,
            ocrResult: ocrResult,
          },
        });
        console.log(`[SUCCESS] Document ${documentId} validated successfully`);
      } else {
        await prisma.document.update({
          where: { id: documentId },
          data: { status: DocumentStatus.FAILED },
        });
        console.log(
          `[FAILED] Document ${documentId} validation failed: ${validation.errors.join(
            ', '
          )}`
        );
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
    } catch (error) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.FAILED },
      });
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

    const document = await prisma.document.create({
      data: {
        filename,
        status: DocumentStatus.UPLOADED,
      },
    });

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

app.get('/api/status/:id', async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/documents', async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(
    `Document Processing Pipeline running on http://localhost:${PORT}`
  );
});
