import * as QRCode from 'qrcode';
import { createCanvas, loadImage } from 'canvas';

export interface LabelOptions {
  width: number; // inches
  height: number; // inches
  dpi?: number;
  qrCodeSize?: number; // size of each QR code in inches (default: height)
}

export class LabelGenerator {
  private static readonly DEFAULT_DPI = 300;

  /**
   * Generate a label with two QR codes side by side
   * QR codes are positioned on either end of the label
   * Both QR codes are the same (for wrapping around cables)
   */
  static async generateTwoQRCodeLabel(
    qrCode1: string,
    qrCode2: string, // This will be the same as qrCode1
    options: LabelOptions
  ): Promise<Buffer> {
    const dpi = options.dpi || this.DEFAULT_DPI;
    const qrCodeSize = options.qrCodeSize || options.height; // Default to label height

    // Convert inches to pixels
    const labelWidthPx = Math.round(options.width * dpi);
    const labelHeightPx = Math.round(options.height * dpi);
    const qrSizePx = Math.round(qrCodeSize * dpi);

    // Create canvas
    const canvas = createCanvas(labelWidthPx, labelHeightPx);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, labelWidthPx, labelHeightPx);

    // Generate QR codes (2px smaller)
    const qr1DataURL = await QRCode.toDataURL(qrCode1, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: qrSizePx - 2,
      margin: 0,
    });

    const qr2DataURL = await QRCode.toDataURL(qrCode2, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: qrSizePx - 2,
      margin: 0,
    });

    // Load QR code images
    const qr1Image = await loadImage(qr1DataURL);
    const qr2Image = await loadImage(qr2DataURL);

    // Calculate positions (QR codes on either end, with padding from edges)
    // Add padding to prevent QR codes from being cut off by label bevel/rounded corners
    const horizontalPaddingPx = Math.round(0.02 * dpi); // ~2-3 pixels of padding from left/right edges
    const verticalPaddingPx = 2; // 2px of vertical padding from top/bottom edges
    const qrSizeActualPx = qrSizePx - (2 * verticalPaddingPx); // Reduce QR code size to accommodate vertical padding

    // Position QR codes with padding from all edges
    const qr1X = horizontalPaddingPx; // Left QR code with padding from left edge
    const qr1Y = verticalPaddingPx; // Top padding
    const qr2X = labelWidthPx - qrSizeActualPx - horizontalPaddingPx; // Right QR code with padding from right edge
    const qr2Y = verticalPaddingPx; // Top padding (both QR codes aligned at same vertical position with 2px from top/bottom)

    // Draw QR codes
    ctx.drawImage(qr1Image, qr1X, qr1Y, qrSizeActualPx, qrSizeActualPx);
    ctx.drawImage(qr2Image, qr2X, qr2Y, qrSizeActualPx, qrSizeActualPx);

    // Convert to buffer
    return canvas.toBuffer('image/png');
  }

  /**
   * Generate a full sheet of labels arranged in a grid
   * Avery 5267 labels: 0.5" x 1.75" each, 80 labels per 8.5x11 sheet
   * Layout: 4 columns x 20 rows
   */
  static async generateLabelSheet(
    labels: Array<{ qrCode1: string; qrCode2: string }>,
    options: { dpi?: number } = {}
  ): Promise<Buffer> {
    const dpi = options.dpi || this.DEFAULT_DPI;

    // Sheet dimensions (8.5" x 11")
    const sheetWidthIn = 8.5;
    const sheetHeightIn = 11;
    const sheetWidthPx = Math.round(sheetWidthIn * dpi);
    const sheetHeightPx = Math.round(sheetHeightIn * dpi);

    // Label dimensions (0.5" x 1.75")
    const labelWidthIn = 1.75;
    const labelHeightIn = 0.5;
    const labelWidthPx = Math.round(labelWidthIn * dpi);
    const labelHeightPx = Math.round(labelHeightIn * dpi);

    // Calculate grid layout
    // Avery 5267: 4 columns x 20 rows = 80 labels per sheet
    const cols = 4;
    const rows = 20;
    const maxLabelsPerSheet = cols * rows;

    // Margins on all sides (Avery 5267 template margins)
    const marginHorizontalIn = 0.125; // Left and right margins
    const marginVerticalIn = 0.375; // Top and bottom margins (adjusted to account for printer adding extra margin)

    // Calculate available space for labels (after margins)
    const availableWidthIn = sheetWidthIn - (2 * marginHorizontalIn);
    const availableHeightIn = sheetHeightIn - (2 * marginVerticalIn);

    // Calculate spacing between label centers
    const columnSpacingIn = availableWidthIn / cols;
    const rowSpacingIn = availableHeightIn / rows;

    const columnSpacingPx = Math.round(columnSpacingIn * dpi);
    const rowSpacingPx = Math.round(rowSpacingIn * dpi);

    // Starting position (top-left corner of the first label)
    const startX = Math.round(marginHorizontalIn * dpi + (columnSpacingIn - labelWidthIn) / 2 * dpi);
    const startY = Math.round(marginVerticalIn * dpi + (rowSpacingIn - labelHeightIn) / 2 * dpi);

    // Create canvas for full sheet
    const canvas = createCanvas(sheetWidthPx, sheetHeightPx);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, sheetWidthPx, sheetHeightPx);

    // Generate labels in batches (one sheet at a time)
    const sheets: Buffer[] = [];
    for (let sheetIndex = 0; sheetIndex < Math.ceil(labels.length / maxLabelsPerSheet); sheetIndex++) {
      const sheetCanvas = createCanvas(sheetWidthPx, sheetHeightPx);
      const sheetCtx = sheetCanvas.getContext('2d');
      sheetCtx.fillStyle = 'white';
      sheetCtx.fillRect(0, 0, sheetWidthPx, sheetHeightPx);

      const startIndex = sheetIndex * maxLabelsPerSheet;
      const endIndex = Math.min(startIndex + maxLabelsPerSheet, labels.length);
      const sheetLabels = labels.slice(startIndex, endIndex);

      // Generate each label and place it on the sheet
      for (let i = 0; i < sheetLabels.length; i++) {
        const label = sheetLabels[i];
        const row = Math.floor(i / cols);
        const col = i % cols;

        // Generate the label image
        const labelImage = await this.generateTwoQRCodeLabel(label.qrCode1, label.qrCode2, {
          width: labelWidthIn,
          height: labelHeightIn,
          qrCodeSize: 0.5, // 0.5" x 0.5" QR codes
          dpi,
        });

        const labelImg = await loadImage(labelImage);

        // Calculate position based on Avery template grid
        const x = startX + col * columnSpacingPx;
        const y = startY + row * rowSpacingPx;

        // Draw label on sheet
        sheetCtx.drawImage(labelImg, x, y, labelWidthPx, labelHeightPx);
      }

      sheets.push(sheetCanvas.toBuffer('image/png'));
    }

    // For now, return only the first sheet
    return sheets[0];
  }
}

