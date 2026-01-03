import { Router } from 'express';
import { transactionController } from '../controllers/transactionController';

export const transactionRoutes = Router();

transactionRoutes.post('/checkin', transactionController.checkIn);
transactionRoutes.post('/checkout', transactionController.checkOut);
transactionRoutes.get('/', transactionController.getAll);
transactionRoutes.get('/:id', transactionController.getById);

