import express from 'express';
import { config } from './config/env.config';
import router from './routes/document.routes';
import { logger } from './utils/logger.util';
import { errorHandler } from './middleware/error-handler.middleware';

const app = express();
app.use(express.json());

// routes
app.use('/api', router);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info('[SERVER] Application started', {
    port: config.port,
    environment: 'development',
  });
});
