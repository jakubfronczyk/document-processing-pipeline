import { Queue } from 'bullmq';
import { config } from '../config/env.config';

export const documentQueue = new Queue('document-processing', {
  connection: config.redis,
});

export const addProcessingJob = async (
  queue: Queue,
  documentId: string,
  text: string
) => {
  return queue.add('process-document', {
    documentId,
    text,
  });
};
