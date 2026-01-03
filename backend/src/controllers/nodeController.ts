import { Request, Response } from 'express';
import prisma from '../services/prisma';

export const nodeController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const nodes = await prisma.node.findMany({
        include: {
          bins: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
      res.json(nodes);
    } catch (error) {
      console.error('Error fetching nodes:', error);
      res.status(500).json({ error: 'Failed to fetch nodes' });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const node = await prisma.node.findUnique({
        where: { id },
        include: {
          bins: {
            include: {
              itemBins: {
                include: {
                  item: true,
                },
              },
            },
          },
        },
      });

      if (!node) {
        return res.status(404).json({ error: 'Node not found' });
      }

      res.json(node);
    } catch (error) {
      console.error('Error fetching node:', error);
      res.status(500).json({ error: 'Failed to fetch node' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const node = await prisma.node.create({
        data: {
          name,
          description,
        },
      });

      res.status(201).json(node);
    } catch (error) {
      console.error('Error creating node:', error);
      res.status(500).json({ error: 'Failed to create node' });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const node = await prisma.node.update({
        where: { id },
        data: {
          name,
          description,
        },
      });

      res.json(node);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Node not found' });
      }
      console.error('Error updating node:', error);
      res.status(500).json({ error: 'Failed to update node' });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.node.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Node not found' });
      }
      console.error('Error deleting node:', error);
      res.status(500).json({ error: 'Failed to delete node' });
    }
  },
};

