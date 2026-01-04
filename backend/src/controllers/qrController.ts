import { Request, Response } from 'express';
import { QRCodeService } from '../services/qrService';
import { LabelGenerator } from '../services/labelGenerator';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { spawn } from 'child_process';

export const qrController = {
  /**
   * Generate a batch of QR codes for later registration
   * For Avery 5267/8167 labels (0.5" x 1.75"), generates labels with two QR codes (one on each end)
   */
  generateBatch: async (req: Request, res: Response) => {
    try {
      const { count = 10, prefix = 'item', twoPerLabel = true } = req.body;

      if (count < 1 || count > 100) {
        return res.status(400).json({ error: 'Count must be between 1 and 100' });
      }

      const qrCodes: Array<{ qrCode: string; qrCodeImage: Buffer; filename: string }> = [];
      const labels: Array<{ qrCode1: string; qrCode2: string; labelImage: Buffer; filename: string }> = [];

      // Generate individual QR codes
      const allQRCodes: string[] = [];
      for (let i = 0; i < count; i++) {
        const qrCode = QRCodeService.generateUniqueQRValue(prefix);
        allQRCodes.push(qrCode);

        // Also generate individual QR code images for reference
        const qrCodeImage = await QRCodeService.generateQRCode(qrCode);
        qrCodes.push({
          qrCode,
          qrCodeImage,
          filename: `${qrCode}.png`,
        });
      }

      // Generate labels with two QR codes each (for wrapping around cables)
      // Each label has the SAME QR code on both sides
      if (twoPerLabel) {
        // Each QR code gets its own label (same QR code on both ends)
        for (let i = 0; i < count; i++) {
          const qrCode = allQRCodes[i];

          // Generate label with the same QR code on both sides (Avery 5267: 1.75" x 0.5")
          // QR code size: 0.5" x 0.5" (matching label height)
          const labelImage = await LabelGenerator.generateTwoQRCodeLabel(qrCode, qrCode, {
            width: 1.75, // inches
            height: 0.5, // inches
            qrCodeSize: 0.5, // 0.5" x 0.5" QR codes
          });

          labels.push({
            qrCode1: qrCode,
            qrCode2: qrCode, // Same QR code on both sides
            labelImage,
            filename: `label-${i + 1}.png`,
          });
        }
      }

      // Save batch to temp directory
      const tempDir = path.join(__dirname, '../../tmp/qr-batches');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const batchId = `batch-${Date.now()}`;
      const batchDir = path.join(tempDir, batchId);
      fs.mkdirSync(batchDir, { recursive: true });

      // Save individual QR code images
      const manifest: Array<{ qrCode: string; filename: string }> = [];
      for (const item of qrCodes) {
        const filePath = path.join(batchDir, 'individual', item.filename);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, item.qrCodeImage);
        manifest.push({
          qrCode: item.qrCode,
          filename: item.filename,
        });
      }

      // Save label images (with two QR codes each)
      const labelManifest: Array<{ labelNumber: number; qrCode1: string; qrCode2: string; filename: string }> = [];
      for (const label of labels) {
        const filePath = path.join(batchDir, 'labels', label.filename);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, label.labelImage);
        labelManifest.push({
          labelNumber: parseInt(label.filename.replace('label-', '').replace('.png', '')),
          qrCode1: label.qrCode1,
          qrCode2: label.qrCode2,
          filename: label.filename,
        });
      }

      // Save manifest as JSON
      fs.writeFileSync(
        path.join(batchDir, 'manifest.json'),
        JSON.stringify(
          {
            batchId,
            count,
            prefix,
            twoPerLabel,
            qrCodes: manifest,
            labels: labelManifest,
            createdAt: new Date().toISOString(),
          },
          null,
          2
        )
      );

      // Save manifest as text file for easy reference
      let manifestText = `QR Codes (${count} total):\n`;
      manifestText += manifest.map((m, index) => `${index + 1}. ${m.qrCode}`).join('\n');
      manifestText += `\n\nLabels (${labels.length} labels, same QR code on both sides):\n`;
      manifestText += labelManifest.map((l, index) => `Label ${l.labelNumber}: ${l.qrCode1}`).join('\n');
      fs.writeFileSync(path.join(batchDir, 'manifest.txt'), manifestText);

      res.json({
        batchId,
        count,
        prefix,
        twoPerLabel,
        labelCount: labels.length,
        qrCodes: manifest.map((m) => m.qrCode),
        labels: labelManifest,
        message: `Generated ${count} QR codes in ${labels.length} labels (same QR code on both sides of each label). Use the batchId to download or print them.`,
      });
    } catch (error: any) {
      console.error('Error generating batch QR codes:', error);
      res.status(500).json({ error: 'Failed to generate batch QR codes' });
    }
  },

  /**
   * List all batches
   */
  listBatches: async (req: Request, res: Response) => {
    try {
      const batchDir = path.join(__dirname, '../../tmp/qr-batches');
      if (!fs.existsSync(batchDir)) {
        return res.json({ batches: [] });
      }

      const batchFolders = fs
        .readdirSync(batchDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory() && dirent.name.startsWith('batch-'))
        .map((dirent) => dirent.name)
        .sort()
        .reverse(); // Most recent first

      const batches: Array<{ batchId: string; count: number; prefix: string; labelCount: number; createdAt: string }> = [];
      for (const batchId of batchFolders) {
        const manifestPath = path.join(batchDir, batchId, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            batches.push({
              batchId,
              count: manifest.count,
              prefix: manifest.prefix,
              labelCount: manifest.labels?.length || 0,
              createdAt: manifest.createdAt,
            });
          } catch (error) {
            // Skip if manifest can't be read
          }
        }
      }

      res.json({ batches });
    } catch (error: any) {
      console.error('Error listing batches:', error);
      res.status(500).json({ error: 'Failed to list batches' });
    }
  },

  /**
   * Render full sheet image for preview
   */
  previewSheet: async (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;
      const batchDir = path.join(__dirname, '../../tmp/qr-batches', batchId);

      if (!fs.existsSync(batchDir)) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      const manifestPath = path.join(batchDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        return res.status(404).json({ error: 'Manifest not found' });
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const labelsToPrint = manifest.labels || [];
      const labelData = labelsToPrint.map((l: any) => ({
        qrCode1: l.qrCode1,
        qrCode2: l.qrCode2,
      }));

      // Generate full sheet image
      const sheetImage = await LabelGenerator.generateLabelSheet(labelData);

      // Return as PNG image
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="batch-${batchId}-sheet.png"`);
      res.send(sheetImage);
    } catch (error: any) {
      console.error('Error generating sheet preview:', error);
      res.status(500).json({ error: 'Failed to generate sheet preview', details: error.message });
    }
  },

  /**
   * Download batch as ZIP file
   */
  downloadBatch: async (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;
      const batchDir = path.join(__dirname, '../../tmp/qr-batches', batchId);

      if (!fs.existsSync(batchDir)) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      // Create ZIP archive
      const archive = archiver('zip', { zlib: { level: 9 } });
      res.attachment(`${batchId}.zip`);
      archive.pipe(res);

      // Add all files from batch directory
      archive.directory(batchDir, false);

      await archive.finalize();
    } catch (error: any) {
      console.error('Error downloading batch:', error);
      res.status(500).json({ error: 'Failed to download batch' });
    }
  },

  /**
   * Print batch of QR codes
   */
  printBatch: async (req: Request, res: Response) => {
    try {
      const { batchId, printerName, labelSize = 'avery5267', paperSize = 'letter' } = req.body;
      const batchDir = path.join(__dirname, '../../tmp/qr-batches', batchId);

      if (!fs.existsSync(batchDir)) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      const manifestPath = path.join(batchDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        return res.status(404).json({ error: 'Manifest not found' });
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      // Generate a single sheet with all labels arranged in a grid
      const labelsToPrint = manifest.labels || [];
      const labelData = labelsToPrint.map((l: any) => ({
        qrCode1: l.qrCode1,
        qrCode2: l.qrCode2,
      }));

      try {
        // Generate full sheet image
        const sheetImage = await LabelGenerator.generateLabelSheet(labelData);

        // Save to temp file
        const tempFile = path.join(__dirname, '../../tmp', `print-sheet-${Date.now()}.png`);
        fs.writeFileSync(tempFile, sheetImage);

        try {
          // Build command array to avoid shell quoting issues
          const commandArgs: string[] = [];
          if (printerName) {
            commandArgs.push('-d', printerName);
          }

          // Set paper size (Avery labels are on 8.5x11 sheets)
          const finalPaperSize = paperSize || (labelSize === 'avery5267' || labelSize === '0.5x1.75' ? 'letter' : undefined);
          if (finalPaperSize) {
            commandArgs.push('-o', `media=${finalPaperSize}`);
          }

          commandArgs.push(tempFile);

          // Use spawn with proper array format to handle printer names with spaces
          const lpPath = '/usr/bin/lp';
          await new Promise<void>((resolve, reject) => {
            const lpProcess = spawn(lpPath, commandArgs);
            let errorOutput = '';

            lpProcess.stderr.on('data', (data) => {
              errorOutput += data.toString();
            });

            lpProcess.on('close', (code) => {
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`lp command failed with code ${code}: ${errorOutput}`));
              }
            });

            lpProcess.on('error', (error) => {
              reject(error);
            });
          });

          // Clean up temp file
          setTimeout(() => {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
            }
          }, 5000);

          // Return success for all labels
          const results = labelsToPrint.map((label: any) => ({
            labelNumber: label.labelNumber,
            qrCode1: label.qrCode1,
            qrCode2: label.qrCode2,
            status: 'printed',
          }));

          res.json({
            batchId,
            printed: results.length,
            errors: 0,
            results,
            message: `Printed ${results.length} labels on 1 sheet`,
          });
        } catch (printError: any) {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
          throw printError;
        }
      } catch (error: any) {
        console.error('Error generating/printing sheet:', error);
        res.status(500).json({
          error: 'Failed to generate or print label sheet',
          details: error.message,
        });
      }
    } catch (error: any) {
      console.error('Error printing batch:', error);
      res.status(500).json({ error: 'Failed to print batch' });
    }
  },
};

