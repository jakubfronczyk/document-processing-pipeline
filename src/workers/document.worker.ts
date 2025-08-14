import { Worker, Job } from 'bullmq';
import { DocumentStatus } from '@prisma/client';
import { prisma } from '../config/database.config';
import { config } from '../config/env.config';
import { OCRResult, simulateOCR } from '../services/ocr.service';
import { extractMetadata } from '../services/metadata.service';
import { validateDocument } from '../services/validation.service';

const processDocumentJob = async (job: Job) => {
  const { documentId, text } = job.data;
  console.log(`[WORKER] Starting job`, {
    pid: process.pid,
    documentId,
    jobId: job.id,
  });

  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.PROCESSING },
    });

    const ocrResult: OCRResult = await simulateOCR(text);
    const metadata = extractMetadata(ocrResult.text);
    const validation = validateDocument(metadata);

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.VALIDATED,
        metadata,
        ocrResult,
      },
    });

    console.log(`[WORKER] Completed successfully`, {
      documentId,
      jobId: job.id,
    });
  } catch (error) {
    console.error(`[WORKER] Failed`, {
      documentId,
      jobId: job.id,
      error: (error as Error).message,
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.FAILED },
    });

    throw error;
  }
};

export const createDocumentWorker = () => {
  return new Worker('document-processing', processDocumentJob, {
    connection: config.redis,
  });
};

export const documentWorker = createDocumentWorker();
