import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { QRCodeService } from '../services/qrService';

export const transactionController = {
  checkIn: async (req: Request, res: Response) => {
    try {
      const { binQrCode, itemQrCode, quantity = 1 } = req.body;

      if (!binQrCode || !itemQrCode) {
        return res.status(400).json({ error: 'Bin QR code and item QR code are required' });
      }

      // Find bin by check-in QR code
      const bin = await prisma.bin.findFirst({
        where: {
          checkInQrCode: binQrCode,
        },
        include: {
          node: true,
        },
      });

      if (!bin) {
        return res.status(404).json({ error: 'Bin not found' });
      }

      // Find item by QR code
      const item = await prisma.item.findUnique({
        where: {
          qrCode: itemQrCode,
        },
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Check if item is already in this bin
      const existingItemBin = await prisma.itemBin.findUnique({
        where: {
          itemId_binId: {
            itemId: item.id,
            binId: bin.id,
          },
        },
      });

      let itemBin;
      if (existingItemBin) {
        // Update quantity
        itemBin = await prisma.itemBin.update({
          where: {
            id: existingItemBin.id,
          },
          data: {
            quantity: existingItemBin.quantity + quantity,
          },
          include: {
            item: true,
            bin: {
              include: {
                node: true,
              },
            },
          },
        });
      } else {
        // Create new ItemBin entry
        itemBin = await prisma.itemBin.create({
          data: {
            itemId: item.id,
            binId: bin.id,
            quantity,
          },
          include: {
            item: true,
            bin: {
              include: {
                node: true,
              },
            },
          },
        });
      }

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          itemId: item.id,
          binId: bin.id,
          type: 'CHECK_IN',
          quantity,
        },
        include: {
          item: true,
          bin: {
            include: {
              node: true,
            },
          },
        },
      });

      res.status(201).json({
        transaction,
        itemBin,
        message: `Checked in ${quantity} ${item.name} to ${bin.name} (${bin.node.name})`,
      });
    } catch (error) {
      console.error('Error checking in item:', error);
      res.status(500).json({ error: 'Failed to check in item' });
    }
  },

  checkOut: async (req: Request, res: Response) => {
    try {
      const { binQrCode, itemQrCode, quantity = 1 } = req.body;

      if (!binQrCode || !itemQrCode) {
        return res.status(400).json({ error: 'Bin QR code and item QR code are required' });
      }

      // Find bin by checkout QR code
      const bin = await prisma.bin.findFirst({
        where: {
          checkoutQrCode: binQrCode,
        },
        include: {
          node: true,
        },
      });

      if (!bin) {
        return res.status(404).json({ error: 'Bin not found' });
      }

      // Find item by QR code
      const item = await prisma.item.findUnique({
        where: {
          qrCode: itemQrCode,
        },
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Check if item is in this bin
      const existingItemBin = await prisma.itemBin.findUnique({
        where: {
          itemId_binId: {
            itemId: item.id,
            binId: bin.id,
          },
        },
      });

      if (!existingItemBin) {
        return res.status(404).json({ error: 'Item not found in this bin' });
      }

      if (existingItemBin.quantity < quantity) {
        return res.status(400).json({
          error: `Insufficient quantity. Available: ${existingItemBin.quantity}, requested: ${quantity}`,
        });
      }

      let itemBin;
      if (existingItemBin.quantity === quantity) {
        // Remove item from bin
        await prisma.itemBin.delete({
          where: {
            id: existingItemBin.id,
          },
        });
        itemBin = null;
      } else {
        // Update quantity
        itemBin = await prisma.itemBin.update({
          where: {
            id: existingItemBin.id,
          },
          data: {
            quantity: existingItemBin.quantity - quantity,
          },
          include: {
            item: true,
            bin: {
              include: {
                node: true,
              },
            },
          },
        });
      }

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          itemId: item.id,
          binId: bin.id,
          type: 'CHECK_OUT',
          quantity,
        },
        include: {
          item: true,
          bin: {
            include: {
              node: true,
            },
          },
        },
      });

      res.status(201).json({
        transaction,
        itemBin,
        message: `Checked out ${quantity} ${item.name} from ${bin.name} (${bin.node.name})`,
      });
    } catch (error) {
      console.error('Error checking out item:', error);
      res.status(500).json({ error: 'Failed to check out item' });
    }
  },

  getAll: async (req: Request, res: Response) => {
    try {
      const transactions = await prisma.transaction.findMany({
        include: {
          item: true,
          bin: {
            include: {
              node: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100, // Limit to recent transactions
      });
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
          item: true,
          bin: {
            include: {
              node: true,
            },
          },
        },
      });

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.json(transaction);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ error: 'Failed to fetch transaction' });
    }
  },
};

