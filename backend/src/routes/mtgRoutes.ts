import { Router } from 'express';
import { mtgController } from '../controllers/mtgController';
import { upload } from '../middleware/upload';

export const mtgRoutes = Router();

mtgRoutes.post('/identify', upload.single('image'), mtgController.identify);

