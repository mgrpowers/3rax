import { connect, NatsConnection, Subscription } from 'nats';
import { PrismaClient } from '@prisma/client';
import { eventBus } from './eventBus';

const prisma = new PrismaClient();

interface ScanMessage {
  scannerId: string;
  scanData: string;
  timestamp: string;
  type: string;
}

interface ScanState {
  item?: {
    qrCode: string;
    timestamp: string;
  };
  bin?: {
    id: string;
    operation: 'checkin' | 'checkout';
    raw: string;
    timestamp: string;
  };
}

class NatsService {
  private nc?: NatsConnection;
  private subscription?: Subscription;
  private scanStates: Map<string, ScanState> = new Map();
  private readonly SCAN_TIMEOUT = 30000; // 30 seconds

  async connect(url: string = 'nats://localhost:4222') {
    try {
      this.nc = await connect({ servers: url });
      console.log(`✅ Connected to NATS at ${url}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to NATS:', error);
      return false;
    }
  }

  async subscribeScannerEvents(subject: string = 'scanner.scans') {
    if (!this.nc) {
      throw new Error('Not connected to NATS');
    }

    this.subscription = this.nc.subscribe(subject);
    console.log(`📡 Subscribed to ${subject}`);

    (async () => {
      if (!this.subscription) return;

      for await (const msg of this.subscription) {
        try {
          const data = JSON.parse(msg.data.toString()) as ScanMessage;
          await this.handleScan(data);
        } catch (error) {
          console.error('Error processing scan message:', error);
        }
      }
    })();
  }

  private parseQRCode(qrCode: string): {
    type: 'bin' | 'item';
    data: any;
  } {
    try {
      const parsed = JSON.parse(qrCode);
      if (parsed.type === 'bin' && parsed.id && parsed.operation) {
        return {
          type: 'bin',
          data: {
            id: parsed.id,
            operation: parsed.operation,
            raw: qrCode,
          },
        };
      }
    } catch (e) {
      // Not JSON, assume it's an item QR code
    }

    // Assume it's an item QR code
    return {
      type: 'item',
      data: {
        qrCode: qrCode,
      },
    };
  }

  private async handleScan(message: ScanMessage) {
    console.log('📱 Scan received:', {
      scanner: message.scannerId,
      type: message.type,
      data: message.scanData.substring(0, 50) + '...',
    });

    const { scannerId, scanData, timestamp } = message;
    const parsed = this.parseQRCode(scanData);

    // Get or create scan state for this scanner
    if (!this.scanStates.has(scannerId)) {
      this.scanStates.set(scannerId, {});
    }

    const state = this.scanStates.get(scannerId)!;

    if (parsed.type === 'item') {
      state.item = {
        qrCode: parsed.data.qrCode,
        timestamp,
      };
      console.log(`  ✓ Item scanned: ${parsed.data.qrCode}`);

      // Clear old scan after timeout
      setTimeout(() => {
        const currentState = this.scanStates.get(scannerId);
        if (currentState?.item?.timestamp === timestamp) {
          delete currentState.item;
          console.log(`  ⏱  Item scan timeout for scanner ${scannerId}`);
        }
      }, this.SCAN_TIMEOUT);
    } else if (parsed.type === 'bin') {
      state.bin = {
        ...parsed.data,
        timestamp,
      };
      console.log(
        `  ✓ Bin scanned: ${parsed.data.id} (${parsed.data.operation})`
      );

      // Clear old scan after timeout
      setTimeout(() => {
        const currentState = this.scanStates.get(scannerId);
        if (currentState?.bin?.timestamp === timestamp) {
          delete currentState.bin;
          console.log(`  ⏱  Bin scan timeout for scanner ${scannerId}`);
        }
      }, this.SCAN_TIMEOUT);
    }

    // If we have both item and bin, process the transaction
    if (state.item && state.bin) {
      await this.processTransaction(scannerId, state);
    }
  }

  private async processTransaction(scannerId: string, state: ScanState) {
    if (!state.item || !state.bin) return;

    const { item, bin } = state;

    try {
      console.log(`🔄 Processing transaction for scanner ${scannerId}...`);
      console.log(`  Item: ${item.qrCode}`);
      console.log(`  Bin: ${bin.id} (${bin.operation})`);

      if (bin.operation === 'checkin') {
        // Find the item
        const dbItem = await prisma.item.findFirst({
          where: { qrCode: item.qrCode },
        });

        if (!dbItem) {
          console.error(`  ❌ Item not found: ${item.qrCode}`);
          await this.publishResponse(scannerId, {
            success: false,
            error: 'Item not found',
          });
          return;
        }

        // Find the bin
        const dbBin = await prisma.bin.findUnique({
          where: { id: bin.id },
        });

        if (!dbBin) {
          console.error(`  ❌ Bin not found: ${bin.id}`);
          await this.publishResponse(scannerId, {
            success: false,
            error: 'Bin not found',
          });
          return;
        }

        // Create or update ItemBin
        const itemBin = await prisma.itemBin.upsert({
          where: {
            itemId_binId: {
              itemId: dbItem.id,
              binId: dbBin.id,
            },
          },
          create: {
            itemId: dbItem.id,
            binId: dbBin.id,
            quantity: 1,
          },
          update: {
            quantity: { increment: 1 },
          },
          include: {
            item: true,
            bin: true,
          },
        });

        console.log(
          `  ✅ Check-in successful: ${dbItem.name} -> ${dbBin.name} (qty: ${itemBin.quantity})`
        );

        // Broadcast real-time event to frontend
        eventBus.emit({
          type: 'checkin',
          data: { item: dbItem, bin: dbBin, quantity: itemBin.quantity },
          timestamp: new Date().toISOString(),
        });

        await this.publishResponse(scannerId, {
          success: true,
          operation: 'checkin',
          item: dbItem,
          bin: dbBin,
          quantity: itemBin.quantity,
        });
      } else if (bin.operation === 'checkout') {
        // Find the item
        const dbItem = await prisma.item.findFirst({
          where: { qrCode: item.qrCode },
        });

        if (!dbItem) {
          console.error(`  ❌ Item not found: ${item.qrCode}`);
          await this.publishResponse(scannerId, {
            success: false,
            error: 'Item not found',
          });
          return;
        }

        // Find the bin
        const dbBin = await prisma.bin.findUnique({
          where: { id: bin.id },
        });

        if (!dbBin) {
          console.error(`  ❌ Bin not found: ${bin.id}`);
          await this.publishResponse(scannerId, {
            success: false,
            error: 'Bin not found',
          });
          return;
        }

        // Find ItemBin
        const itemBin = await prisma.itemBin.findUnique({
          where: {
            itemId_binId: {
              itemId: dbItem.id,
              binId: dbBin.id,
            },
          },
        });

        if (!itemBin || itemBin.quantity <= 0) {
          console.error(`  ❌ Item not in bin or quantity is 0`);
          await this.publishResponse(scannerId, {
            success: false,
            error: 'Item not in bin',
          });
          return;
        }

        // Create transaction record
        const transaction = await prisma.transaction.create({
          data: {
            itemId: dbItem.id,
            binId: dbBin.id,
            quantity: 1,
            type: 'CHECK_OUT',
          },
          include: {
            item: true,
            bin: true,
          },
        });

        // Update ItemBin quantity
        const updatedItemBin = await prisma.itemBin.update({
          where: {
            itemId_binId: {
              itemId: dbItem.id,
              binId: dbBin.id,
            },
          },
          data: {
            quantity: { decrement: 1 },
          },
        });

        console.log(
          `  ✅ Check-out successful: ${dbItem.name} <- ${dbBin.name} (remaining: ${updatedItemBin.quantity})`
        );

        // Broadcast real-time event to frontend
        eventBus.emit({
          type: 'checkout',
          data: { transaction, remainingQuantity: updatedItemBin.quantity },
          timestamp: new Date().toISOString(),
        });

        await this.publishResponse(scannerId, {
          success: true,
          operation: 'checkout',
          transaction,
          remainingQuantity: updatedItemBin.quantity,
        });
      }

      // Clear the state after successful transaction
      this.scanStates.set(scannerId, {});
    } catch (error) {
      console.error('  ❌ Transaction error:', error);
      await this.publishResponse(scannerId, {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
      });

      // Clear the state on error
      this.scanStates.set(scannerId, {});
    }
  }

  private async publishResponse(scannerId: string, response: any) {
    if (!this.nc) return;

    try {
      const subject = `scanner.response.${scannerId}`;
      const payload = JSON.stringify(response);
      this.nc.publish(subject, payload);
      console.log(`📤 Published response to ${subject}`);
    } catch (error) {
      console.error('Failed to publish response:', error);
    }
  }

  async close() {
    if (this.subscription) {
      await this.subscription.unsubscribe();
    }
    if (this.nc) {
      await this.nc.close();
      console.log('Disconnected from NATS');
    }
  }
}

export const natsService = new NatsService();
