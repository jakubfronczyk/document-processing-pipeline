import express from 'express';
import {
  uploadDocument,
  getDocumentStatus,
  getAllDocuments,
} from '../controllers/document.controller';
import { getHealth } from '../controllers/health.controller';

const router = express.Router();

router.post('/upload', uploadDocument);
router.get('/status/:id', getDocumentStatus);
router.get('/documents', getAllDocuments);
router.get('/health', getHealth);

export default router;
