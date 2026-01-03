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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

