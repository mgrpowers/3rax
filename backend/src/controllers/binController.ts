import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { QRCodeService } from '../services/qrService';
import { PrintingService } from '../services/printingService';

export const binController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const bins = await prisma.bin.findMany({
        include: {
          node: true,
          itemBins: {
            include: {
              item: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
      res.json(bins);
    } catch (error) {
      console.error('Error fetching bins:', error);
      res.status(500).json({ error: 'Failed to fetch bins' });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const bin = await prisma.bin.findUnique({
        where: { id },
        include: {
          node: true,
          itemBins: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!bin) {
        return res.status(404).json({ error: 'Bin not found' });
      }

      res.json(bin);
    } catch (error) {
      console.error('Error fetching bin:', error);
      res.status(500).json({ error: 'Failed to fetch bin' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { nodeId, name, description, checkInQrCode, checkoutQrCode } = req.body;

      if (!nodeId || !name) {
        return res.status(400).json({ error: 'Node ID and name are required' });
      }

      // Generate QR codes if not provided
      const checkInQR = checkInQrCode || QRCodeService.generateUniqueQRValue('bin_checkin');
      const checkoutQR = checkoutQrCode || QRCodeService.generateUniqueQRValue('bin_checkout');

      const bin = await prisma.bin.create({
        data: {
          nodeId,
          name,
          description,
          checkInQrCode: checkInQR,
          checkoutQrCode: checkoutQR,
        },
        include: {
          node: true,
        },
      });

      res.status(201).json(bin);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'QR code already exists' });
      }
      console.error('Error creating bin:', error);
      res.status(500).json({ error: 'Failed to create bin' });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const bin = await prisma.bin.update({
        where: { id },
        data: {
          name,
          description,
        },
        include: {
          node: true,
        },
      });

      res.json(bin);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Bin not found' });
      }
      console.error('Error updating bin:', error);
      res.status(500).json({ error: 'Failed to update bin' });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.bin.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Bin not found' });
      }
      console.error('Error deleting bin:', error);
      res.status(500).json({ error: 'Failed to delete bin' });
    }
  },

  registerQRCode: async (req: Request, res: Response) => {
    try {
      const { binId } = req.params;
      const { qrCode, operation } = req.body; // operation: 'checkin' or 'checkout'

      if (!qrCode || !operation) {
        return res.status(400).json({ error: 'QR code and operation are required' });
      }

      if (!['checkin', 'checkout'].includes(operation)) {
        return res.status(400).json({ error: 'Operation must be "checkin" or "checkout"' });
      }

      const updateData: any = {};
      if (operation === 'checkin') {
        updateData.checkInQrCode = qrCode;
      } else {
        updateData.checkoutQrCode = qrCode;
      }

      const bin = await prisma.bin.update({
        where: { id: binId },
        data: updateData,
      });

      res.json(bin);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Bin not found' });
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
      const { binId } = req.params;
      const { operation } = req.body; // 'checkin' or 'checkout'

      if (!operation || !['checkin', 'checkout'].includes(operation)) {
        return res.status(400).json({ error: 'Operation must be "checkin" or "checkout"' });
      }

      const bin = await prisma.bin.findUnique({
        where: { id: binId },
      });

      if (!bin) {
        return res.status(404).json({ error: 'Bin not found' });
      }

      const qrCodeValue = operation === 'checkin' ? bin.checkInQrCode : bin.checkoutQrCode;
      const qrData = QRCodeService.generateQRData('bin', binId, operation as 'checkin' | 'checkout');
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
      const { binId, operation } = req.params;

      if (!['checkin', 'checkout'].includes(operation)) {
        return res.status(400).json({ error: 'Invalid operation' });
      }

      const bin = await prisma.bin.findUnique({
        where: { id: binId },
      });

      if (!bin) {
        return res.status(404).json({ error: 'Bin not found' });
      }

      const qrData = QRCodeService.generateQRData('bin', binId, operation as 'checkin' | 'checkout');
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
      const { binId } = req.params;
      const { printerName, labelSize, operation = 'checkin' } = req.body;

      if (!['checkin', 'checkout'].includes(operation)) {
        return res.status(400).json({ error: 'Operation must be "checkin" or "checkout"' });
      }

      const bin = await prisma.bin.findUnique({
        where: { id: binId },
      });

      if (!bin) {
        return res.status(404).json({ error: 'Bin not found' });
      }

      const qrData = QRCodeService.generateQRData('bin', binId, operation as 'checkin' | 'checkout');
      
      await PrintingService.printLabel(qrData, {
        printerName,
        labelSize,
        title: `${bin.name} - ${operation === 'checkin' ? 'Check In' : 'Check Out'}`,
      });

      res.json({ message: 'Label printed successfully' });
    } catch (error: any) {
      console.error('Error printing QR code:', error);
      res.status(500).json({ error: error.message || 'Failed to print QR code' });
    }
  },
};

