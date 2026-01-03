import { Router } from 'express';
import { binController } from '../controllers/binController';

export const binRoutes = Router();

binRoutes.get('/', binController.getAll);
binRoutes.get('/:id', binController.getById);
binRoutes.post('/', binController.create);
binRoutes.put('/:id', binController.update);
binRoutes.delete('/:id', binController.delete);

// QR code routes
binRoutes.post('/:binId/qr/register', binController.registerQRCode);
binRoutes.post('/:binId/qr/generate', binController.generateQRCode);
binRoutes.get('/:binId/qr/:operation', binController.getQRCodeImage);
binRoutes.post('/:binId/qr/print', binController.printQRCode);

