import { Router } from 'express';
import { qrController } from '../controllers/qrController';

export const qrRoutes = Router();

// Generate batch of QR codes for registration
qrRoutes.post('/batch/generate', qrController.generateBatch);
qrRoutes.get('/batch/list', qrController.listBatches);
qrRoutes.get('/batch/:batchId/preview', qrController.previewSheet);
qrRoutes.get('/batch/:batchId/download', qrController.downloadBatch);
qrRoutes.post('/batch/print', qrController.printBatch);

