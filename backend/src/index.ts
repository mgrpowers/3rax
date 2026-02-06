import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { nodeRoutes } from './routes/nodeRoutes';
import { binRoutes } from './routes/binRoutes';
import { itemRoutes } from './routes/itemRoutes';
import { transactionRoutes } from './routes/transactionRoutes';
import { searchRoutes } from './routes/searchRoutes';
import { mtgRoutes } from './routes/mtgRoutes';
import { qrRoutes } from './routes/qrRoutes';
import { natsService } from './services/natsService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/nodes', nodeRoutes);
app.use('/api/bins', binRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/mtg', mtgRoutes);
app.use('/api/qr', qrRoutes);

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize NATS connection for scanner events
  const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
  const natsSubject = process.env.NATS_SUBJECT || 'scanner.scans';
  
  console.log('Connecting to NATS...');
  const connected = await natsService.connect(natsUrl);
  
  if (connected) {
    await natsService.subscribeScannerEvents(natsSubject);
    console.log('Scanner event listener active');
  } else {
    console.warn('⚠️  NATS connection failed - scanner events will not be processed');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await natsService.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await natsService.close();
  process.exit(0);
});

