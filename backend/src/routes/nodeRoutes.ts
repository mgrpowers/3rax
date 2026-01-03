import { Router } from 'express';
import { nodeController } from '../controllers/nodeController';

export const nodeRoutes = Router();

nodeRoutes.get('/', nodeController.getAll);
nodeRoutes.get('/:id', nodeController.getById);
nodeRoutes.post('/', nodeController.create);
nodeRoutes.put('/:id', nodeController.update);
nodeRoutes.delete('/:id', nodeController.delete);

