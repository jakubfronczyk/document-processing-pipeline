import express from 'express';
import { config } from './config/env.config';
import router from './routes/document.routes';
import { logger } from './utils/logger.util';
import { errorHandler } from './middleware/error-handler.middleware';
import { documentWorker } from './workers/document.worker';
import { documentQueue } from './services/queue.service';
import { prisma } from './config/database.config';

const app = express();
app.use(express.json());

// routes
app.use('/api', router);
app.use(errorHandler);

const shutdown = async (signal: string) => {
  logger.info('[SHUTDOWN] Graceful shutdown initiated', { signal });

  await documentWorker.close();
  await documentQueue.close();
  await prisma.$disconnect();

  logger.info('[SHUTDOWN] Application shutdown complete');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

app.listen(config.port, () => {
  logger.info('[SERVER] Application started', {
    port: config.port,
    environment: 'development',
  });
});
