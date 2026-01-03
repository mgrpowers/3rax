import QRCode from 'qrcode';
import { createHash } from 'crypto';

export interface QRCodeData {
  type: 'item' | 'bin';
  id: string;
  operation?: 'checkin' | 'checkout';
}

export class QRCodeService {
  /**
   * Generate a QR code image from data
   */
  static async generateQRCode(data: string): Promise<Buffer> {
    return QRCode.toBuffer(data, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 300,
      margin: 1,
    });
  }

  /**
   * Generate a QR code data string for an item or bin
   */
  static generateQRData(type: 'item' | 'bin', id: string, operation?: 'checkin' | 'checkout'): string {
    const data: QRCodeData = { type, id };
    if (operation) {
      data.operation = operation;
    }
    return JSON.stringify(data);
  }

  /**
   * Parse QR code data
   */
  static parseQRData(qrData: string): QRCodeData {
    try {
      return JSON.parse(qrData);
    } catch (error) {
      throw new Error('Invalid QR code format');
    }
  }

  /**
   * Generate a unique QR code value (for custom QR codes that need a unique identifier)
   */
  static generateUniqueQRValue(prefix: string): string {
    const random = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    return `${prefix}_${timestamp}_${random}`;
  }
}

