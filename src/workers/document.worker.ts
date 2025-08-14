import { Worker, Job } from 'bullmq';
import { DocumentStatus } from '@prisma/client';
import { prisma } from '../config/database.config';
import { config } from '../config/env.config';
import { OCRResult, simulateOCR } from '../services/ocr.service';
import { extractMetadata } from '../services/metadata.service';
import { validateDocument } from '../services/validation.service';
import { logger } from '../utils/logger.util';

const processDocumentJob = async (job: Job) => {
  const { documentId, text } = job.data;
  logger.info('[WORKER] Job started', { documentId, jobId: job.id });

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

    logger.info('[WORKER] Job completed successfully', {
      documentId,
      jobId: job.id,
    });
  } catch (error) {
    logger.error('[WORKER] Job failed', {
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
  const worker = new Worker('document-processing', processDocumentJob, {
    connection: config.redis,
    concurrency: 3,
  });

  worker.on(
    'failed',
    async (job: Job | undefined, error: Error, prev: string) => {
      if (!job) {
        logger.error('[DEAD_LETTER] Job failed but job object is undefined', {
          error: error.message,
          previousState: prev,
        });
        return;
      }

      const isDeadLetter = job.attemptsMade >= (job.opts.attempts || 1);

      if (isDeadLetter) {
        logger.error('[DEAD_LETTER] Job permanently failed after all retries', {
          jobId: job.id,
          documentId: job.data.documentId,
          finalError: error.message,
          totalAttempts: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          previousState: prev,
          jobData: job.data,
          timestamps: {
            created: new Date(job.timestamp).toISOString(),
            failed: new Date().toISOString(),
          },
        });

        try {
          await prisma.document.update({
            where: { id: job.data.documentId },
            data: {
              status: DocumentStatus.FAILED,
              faileReason: error.message,
            },
          });

          logger.info('[DEAD_LETTER] Document marked as permanently failed', {
            documentId: job.data.documentId,
          });
        } catch (dbError) {
          logger.error('[DEAD_LETTER] Failed to update document status', {
            documentId: job.data.documentId,
            error: (dbError as Error).message,
          });
        }
      } else {
        logger.warn('[RETRY] Job failed, will retry', {
          jobId: job.id,
          documentId: job.data.documentId,
          error: error.message,
          attempt: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          previousState: prev,
        });
      }
    }
  );

  return worker;
};

export const documentWorker = createDocumentWorker();
