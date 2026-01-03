import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Node {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bin {
  id: string;
  nodeId: string;
  name: string;
  description?: string;
  checkInQrCode: string;
  checkoutQrCode: string;
  node?: Node;
  itemBins?: ItemBin[];
}

export interface Item {
  id: string;
  name: string;
  description?: string;
  type?: string;
  qrCode: string;
  imagePath?: string;
  itemBins?: ItemBin[];
}

export interface ItemBin {
  id: string;
  itemId: string;
  binId: string;
  quantity: number;
  item?: Item;
  bin?: Bin;
}

export interface Transaction {
  id: string;
  itemId: string;
  binId: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  quantity: number;
  createdAt: string;
  item?: Item;
  bin?: Bin;
}

export const nodeApi = {
  getAll: () => api.get<Node[]>('/nodes'),
  getById: (id: string) => api.get<Node>(`/nodes/${id}`),
  create: (data: { name: string; description?: string }) => api.post<Node>('/nodes', data),
  update: (id: string, data: { name?: string; description?: string }) => api.put<Node>(`/nodes/${id}`, data),
  delete: (id: string) => api.delete(`/nodes/${id}`),
};

export const binApi = {
  getAll: () => api.get<Bin[]>('/bins'),
  getById: (id: string) => api.get<Bin>(`/bins/${id}`),
  create: (data: { nodeId: string; name: string; description?: string; checkInQrCode?: string; checkoutQrCode?: string }) =>
    api.post<Bin>('/bins', data),
  update: (id: string, data: { name?: string; description?: string }) => api.put<Bin>(`/bins/${id}`, data),
  delete: (id: string) => api.delete(`/bins/${id}`),
  registerQRCode: (binId: string, qrCode: string, operation: 'checkin' | 'checkout') =>
    api.post<Bin>(`/bins/${binId}/qr/register`, { qrCode, operation }),
  generateQRCode: (binId: string, operation: 'checkin' | 'checkout') =>
    api.get(`/bins/${binId}/qr/${operation}`, { responseType: 'blob' }),
  printQRCode: (binId: string, data: { printerName?: string; labelSize?: string; operation?: 'checkin' | 'checkout' }) =>
    api.post(`/bins/${binId}/qr/print`, data),
};

export const itemApi = {
  getAll: () => api.get<Item[]>('/items'),
  getById: (id: string) => api.get<Item>(`/items/${id}`),
  create: (data: FormData) => api.post<Item>('/items', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: FormData) => api.put<Item>(`/items/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete(`/items/${id}`),
  registerQRCode: (itemId: string, qrCode: string) => api.post<Item>(`/items/${itemId}/qr/register`, { qrCode }),
  generateQRCode: (itemId: string) => api.get(`/items/${itemId}/qr`, { responseType: 'blob' }),
  printQRCode: (itemId: string, data: { printerName?: string; labelSize?: string }) =>
    api.post(`/items/${itemId}/qr/print`, data),
  getInventoryCount: (itemName: string) => api.get(`/items/inventory/${encodeURIComponent(itemName)}`),
};

export const transactionApi = {
  checkIn: (data: { binQrCode: string; itemQrCode: string; quantity?: number }) =>
    api.post<{ transaction: Transaction; itemBin: ItemBin; message: string }>('/transactions/checkin', data),
  checkOut: (data: { binQrCode: string; itemQrCode: string; quantity?: number }) =>
    api.post<{ transaction: Transaction; itemBin: ItemBin | null; message: string }>('/transactions/checkout', data),
  getAll: () => api.get<Transaction[]>('/transactions'),
  getById: (id: string) => api.get<Transaction>(`/transactions/${id}`),
};

export const searchApi = {
  search: (query: string) => api.get<{ query: string; results: any[]; count: number }>(`/search?q=${encodeURIComponent(query)}`),
};

export const mtgApi = {
  identify: (data: FormData) => api.post<{ card: any; message: string }>('/mtg/identify', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export default api;

