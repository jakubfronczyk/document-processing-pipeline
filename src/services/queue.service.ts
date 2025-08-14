import { Queue } from 'bullmq';
import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';

export const documentQueue = new Queue('document-processing', {
  connection: config.redis,
});

export const addProcessingJob = async (
  queue: Queue,
  documentId: string,
  text: string
) => {
  const job = await queue.add(
    'process-document',
    {
      documentId,
      text,
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    }
  );

  logger.info('[QUEUE] Job added with dead letter handling', {
    jobId: job.id,
    documentId,
    retryConfig: {
      attempts: 3,
      backoffType: 'exponential',
      baseDelay: '1000ms',
    },
  });

  return job;
};
