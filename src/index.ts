import express from 'express';
import { config } from './config/env.config';
import router from './routes/document.routes';

const app = express();
app.use(express.json());

// routes
app.use('/api', router);

app.listen(config.port, () => {
  console.log(
    `Document Processing Pipeline running on http://localhost:${config.port}`
  );
});
