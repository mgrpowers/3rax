import { Router } from 'express';
import { itemController } from '../controllers/itemController';
import { upload } from '../middleware/upload';

export const itemRoutes = Router();

itemRoutes.get('/', itemController.getAll);
itemRoutes.get('/:id', itemController.getById);
itemRoutes.post('/', upload.single('image'), itemController.create);
itemRoutes.put('/:id', upload.single('image'), itemController.update);
itemRoutes.delete('/:id', itemController.delete);

// QR code routes
itemRoutes.post('/:itemId/qr/register', itemController.registerQRCode);
itemRoutes.post('/:itemId/qr/generate', itemController.generateQRCode);
itemRoutes.get('/:itemId/qr', itemController.getQRCodeImage);
itemRoutes.post('/:itemId/qr/print', itemController.printQRCode);

// Inventory count
itemRoutes.get('/inventory/:itemName', itemController.getInventoryCount);

