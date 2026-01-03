import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { QRCodeService } from '../services/qrService';
import { PrintingService } from '../services/printingService';
import path from 'path';
import fs from 'fs';

export const itemController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const items = await prisma.item.findMany({
        include: {
          itemBins: {
            include: {
              bin: {
                include: {
                  node: true,
                },
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
      res.json(items);
    } catch (error) {
      console.error('Error fetching items:', error);
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const item = await prisma.item.findUnique({
        where: { id },
        include: {
          itemBins: {
            include: {
              bin: {
                include: {
                  node: true,
                },
              },
            },
          },
        },
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      res.json(item);
    } catch (error) {
      console.error('Error fetching item:', error);
      res.status(500).json({ error: 'Failed to fetch item' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { name, description, type, qrCode } = req.body;
      const file = req.file;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Generate QR code if not provided
      const itemQR = qrCode || QRCodeService.generateUniqueQRValue('item');

      const item = await prisma.item.create({
        data: {
          name,
          description,
          type,
          qrCode: itemQR,
          imagePath: file ? `/uploads/${file.filename}` : null,
        },
      });

      res.status(201).json(item);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'QR code already exists' });
      }
      console.error('Error creating item:', error);
      res.status(500).json({ error: 'Failed to create item' });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, type } = req.body;
      const file = req.file;

      const existingItem = await prisma.item.findUnique({
        where: { id },
      });

      if (!existingItem) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Delete old image if new one is uploaded
      let imagePath = existingItem.imagePath;
      if (file) {
        if (existingItem.imagePath) {
          const oldImagePath = path.join(__dirname, '../../', existingItem.imagePath);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        imagePath = `/uploads/${file.filename}`;
      }

      const item = await prisma.item.update({
        where: { id },
        data: {
          name,
          description,
          type,
          imagePath,
        },
      });

      res.json(item);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Item not found' });
      }
      console.error('Error updating item:', error);
      res.status(500).json({ error: 'Failed to update item' });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const item = await prisma.item.findUnique({
        where: { id },
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Delete associated image file
      if (item.imagePath) {
        const imagePath = path.join(__dirname, '../../', item.imagePath);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      await prisma.item.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Item not found' });
      }
      console.error('Error deleting item:', error);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  },

  registerQRCode: async (req: Request, res: Response) => {
    try {
      const { itemId } = req.params;
      const { qrCode } = req.body;

      if (!qrCode) {
        return res.status(400).json({ error: 'QR code is required' });
      }

      const item = await prisma.item.update({
        where: { id: itemId },
        data: {
          qrCode,
        },
      });

      res.json(item);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Item not found' });
      }
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'QR code already exists' });
      }
      console.error('Error registering QR code:', error);
      res.status(500).json({ error: 'Failed to register QR code' });
    }
  },

  generateQRCode: async (req: Request, res: Response) => {
    try {
      const { itemId } = req.params;

      const item = await prisma.item.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      const qrData = QRCodeService.generateQRData('item', itemId);
      const qrImage = await QRCodeService.generateQRCode(qrData);

      res.setHeader('Content-Type', 'image/png');
      res.send(qrImage);
    } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  },

  getQRCodeImage: async (req: Request, res: Response) => {
    try {
      const { itemId } = req.params;

      const item = await prisma.item.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      const qrData = QRCodeService.generateQRData('item', itemId);
      const qrImage = await QRCodeService.generateQRCode(qrData);

      res.setHeader('Content-Type', 'image/png');
      res.send(qrImage);
    } catch (error) {
      console.error('Error generating QR code image:', error);
      res.status(500).json({ error: 'Failed to generate QR code image' });
    }
  },

  printQRCode: async (req: Request, res: Response) => {
    try {
      const { itemId } = req.params;
      const { printerName, labelSize } = req.body;

      const item = await prisma.item.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      const qrData = QRCodeService.generateQRData('item', itemId);
      
      await PrintingService.printLabel(qrData, {
        printerName,
        labelSize,
        title: item.name,
        subtitle: item.type || '',
      });

      res.json({ message: 'Label printed successfully' });
    } catch (error: any) {
      console.error('Error printing QR code:', error);
      res.status(500).json({ error: error.message || 'Failed to print QR code' });
    }
  },

  getInventoryCount: async (req: Request, res: Response) => {
    try {
      const { itemName } = req.params;

      const items = await prisma.item.findMany({
        where: {
          name: {
            contains: itemName,
            mode: 'insensitive',
          },
        },
        include: {
          itemBins: true,
        },
      });

      const totalCount = items.reduce((sum, item) => {
        const itemSum = item.itemBins.reduce((binSum, itemBin) => binSum + itemBin.quantity, 0);
        return sum + itemSum;
      }, 0);

      res.json({
        itemName,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          count: item.itemBins.reduce((sum, itemBin) => sum + itemBin.quantity, 0),
        })),
        totalCount,
      });
    } catch (error) {
      console.error('Error getting inventory count:', error);
      res.status(500).json({ error: 'Failed to get inventory count' });
    }
  },
};

