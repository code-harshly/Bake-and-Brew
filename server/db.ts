import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type PaymentMethod = 'upi' | 'cash' | 'card';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  current_stock: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price_at_sale: number;
}

export interface Sale {
  id: string;
  timestamp: string;
  total_amount: number;
  payment_method: PaymentMethod;
  created_at: string;
  items: SaleItem[];
}

interface DatabaseSchema {
  products: Product[];
  sales: Sale[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'bake_brew_store.json');

const INITIAL_PRODUCTS: Omit<Product, 'id' | 'created_at' | 'updated_at'>[] = [
  { name: 'Espresso', category: 'coffee', price: 3.50, current_stock: 45, low_stock_threshold: 15 },
  { name: 'Double Espresso', category: 'coffee', price: 4.25, current_stock: 35, low_stock_threshold: 12 },
  { name: 'Americano', category: 'coffee', price: 4.00, current_stock: 40, low_stock_threshold: 15 },
  { name: 'Cappuccino', category: 'coffee', price: 4.75, current_stock: 28, low_stock_threshold: 12 },
  { name: 'Caffè Latte', category: 'coffee', price: 5.00, current_stock: 30, low_stock_threshold: 12 },
  { name: 'Caramel Macchiato', category: 'coffee', price: 5.50, current_stock: 18, low_stock_threshold: 10 },
  { name: 'Iced Cold Brew', category: 'coffee', price: 4.75, current_stock: 14, low_stock_threshold: 10 },
  { name: 'Vanilla Sweet Cream Cold Brew', category: 'coffee', price: 5.75, current_stock: 9, low_stock_threshold: 8 },
  { name: 'Matcha Green Tea Latte', category: 'coffee', price: 5.50, current_stock: 16, low_stock_threshold: 8 },
  
  // Bakery
  { name: 'Butter Croissant', category: 'bakery', price: 3.80, current_stock: 6, low_stock_threshold: 10 }, // Low stock
  { name: 'Almond Croissant', category: 'bakery', price: 4.50, current_stock: 4, low_stock_threshold: 8 }, // Low stock
  { name: 'Blueberry Scone', category: 'bakery', price: 4.20, current_stock: 15, low_stock_threshold: 6 },
  { name: 'Warm Cinnamon Roll', category: 'bakery', price: 4.75, current_stock: 3, low_stock_threshold: 8 }, // Low stock
  { name: 'Dark Chocolate Brownie', category: 'bakery', price: 3.95, current_stock: 0, low_stock_threshold: 6 }, // Out of stock
  { name: 'Artisan Sourdough Toast & Butter', category: 'bakery', price: 4.50, current_stock: 22, low_stock_threshold: 6 },
  
  // Other
  { name: 'Hibiscus Herbal Tea', category: 'other', price: 3.95, current_stock: 25, low_stock_threshold: 8 },
  { name: 'Earl Grey Reserve', category: 'other', price: 3.95, current_stock: 20, low_stock_threshold: 8 },
  { name: 'Sparkling Mineral Water', category: 'other', price: 2.75, current_stock: 32, low_stock_threshold: 10 },
  { name: 'Oat Milk Addition', category: 'other', price: 0.85, current_stock: 50, low_stock_threshold: 15 },
];

class DatabaseService {
  private data: DatabaseSchema = { products: [], sales: [] };
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.seedInitialData();
      }
      this.initialized = true;
    } catch (err) {
      console.error('Failed to initialize database store, seeding in memory:', err);
      this.seedInitialData();
      this.initialized = true;
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database file:', err);
    }
  }

  private seedInitialData() {
    const now = new Date();
    const products: Product[] = INITIAL_PRODUCTS.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: now.toISOString(),
    }));

    // Seed realistic past sales for current month and previous month so analytics are immediately useful
    const sales: Sale[] = [];
    const paymentMethods: PaymentMethod[] = ['upi', 'cash', 'card', 'upi', 'card'];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Generate ~35 realistic orders across the current and previous month
    for (let dayOffset = 35; dayOffset >= 0; dayOffset--) {
      const orderDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000 + (Math.random() * 6 - 3) * 3600 * 1000);
      const numItems = Math.floor(Math.random() * 3) + 1;
      const saleId = crypto.randomUUID();
      const saleItems: SaleItem[] = [];
      let totalAmount = 0;

      for (let i = 0; i < numItems; i++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        const lineTotal = Number((product.price * qty).toFixed(2));
        totalAmount += lineTotal;

        saleItems.push({
          id: crypto.randomUUID(),
          sale_id: saleId,
          product_id: product.id,
          product_name: product.name,
          quantity: qty,
          price_at_sale: product.price,
        });
      }

      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      sales.push({
        id: saleId,
        timestamp: orderDate.toISOString(),
        total_amount: Number(totalAmount.toFixed(2)),
        payment_method: paymentMethod,
        created_at: orderDate.toISOString(),
        items: saleItems,
      });
    }

    this.data = { products, sales };
    this.save();
  }

  // --- Product Methods ---
  public getProducts(): Product[] {
    return [...this.data.products].sort((a, b) => a.name.localeCompare(b.name));
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  public createProduct(payload: {
    name: string;
    category: string;
    price: number;
    current_stock: number;
    low_stock_threshold: number;
  }): Product {
    const now = new Date().toISOString();
    const product: Product = {
      id: crypto.randomUUID(),
      name: payload.name.trim(),
      category: (payload.category || 'other').trim().toLowerCase(),
      price: Number(Number(payload.price).toFixed(2)),
      current_stock: Math.max(0, Math.floor(payload.current_stock)),
      low_stock_threshold: Math.max(0, Math.floor(payload.low_stock_threshold)),
      created_at: now,
      updated_at: now,
    };

    this.data.products.push(product);
    this.save();
    return product;
  }

  public updateProduct(
    id: string,
    payload: Partial<{
      name: string;
      category: string;
      price: number;
      current_stock: number;
      low_stock_threshold: number;
    }>
  ): Product {
    const productIndex = this.data.products.findIndex((p) => p.id === id);
    if (productIndex === -1) {
      throw new Error('Product not found');
    }

    const current = this.data.products[productIndex];
    const updated: Product = {
      ...current,
      name: payload.name !== undefined ? payload.name.trim() : current.name,
      category: payload.category !== undefined ? payload.category.trim().toLowerCase() : current.category,
      price: payload.price !== undefined ? Number(Number(payload.price).toFixed(2)) : current.price,
      current_stock: payload.current_stock !== undefined ? Math.max(0, Math.floor(payload.current_stock)) : current.current_stock,
      low_stock_threshold: payload.low_stock_threshold !== undefined ? Math.max(0, Math.floor(payload.low_stock_threshold)) : current.low_stock_threshold,
      updated_at: new Date().toISOString(),
    };

    this.data.products[productIndex] = updated;
    this.save();
    return updated;
  }

  public deleteProduct(id: string): boolean {
    const initialLen = this.data.products.length;
    this.data.products = this.data.products.filter((p) => p.id !== id);
    if (this.data.products.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Atomic Checkout Transaction ---
  public checkoutAtomic(payload: {
    items: { productId: string; quantity: number }[];
    paymentMethod: PaymentMethod;
  }): Sale {
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Cannot complete sale with an empty cart.');
    }

    if (!['upi', 'cash', 'card'].includes(payload.paymentMethod)) {
      throw new Error('Invalid payment method. Allowed: upi, cash, card.');
    }

    // Clone state before starting atomic transaction for strict rollback safety
    const originalProducts = JSON.parse(JSON.stringify(this.data.products)) as Product[];
    const saleId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const createdSaleItems: SaleItem[] = [];
    let totalAmount = 0;

    try {
      // Step 1: Pre-validation of all items & stock availability
      for (const itemReq of payload.items) {
        if (!itemReq.productId || itemReq.quantity <= 0) {
          throw new Error('Invalid item or quantity in cart.');
        }

        const product = this.data.products.find((p) => p.id === itemReq.productId);
        if (!product) {
          throw new Error(`Product not found (ID: ${itemReq.productId}).`);
        }

        if (product.current_stock < itemReq.quantity) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${product.current_stock}, Requested: ${itemReq.quantity}.`
          );
        }
      }

      // Step 2: Atomic execution (create SaleItem snapshots & decrement stock)
      for (const itemReq of payload.items) {
        const product = this.data.products.find((p) => p.id === itemReq.productId)!;
        const lineTotal = Number((product.price * itemReq.quantity).toFixed(2));
        totalAmount += lineTotal;

        // Decrement product stock
        product.current_stock -= itemReq.quantity;
        product.updated_at = nowIso;

        // Create SaleItem snapshot
        createdSaleItems.push({
          id: crypto.randomUUID(),
          sale_id: saleId,
          product_id: product.id,
          product_name: product.name,
          quantity: itemReq.quantity,
          price_at_sale: product.price,
        });
      }

      const sale: Sale = {
        id: saleId,
        timestamp: nowIso,
        total_amount: Number(totalAmount.toFixed(2)),
        payment_method: payload.paymentMethod,
        created_at: nowIso,
        items: createdSaleItems,
      };

      this.data.sales.unshift(sale);
      this.save();
      return sale;
    } catch (err) {
      // ROLLBACK EVERYTHING! Restore products exactly as they were
      this.data.products = originalProducts;
      throw err;
    }
  }

  // --- Reports & Analytics ---
  public getMonthlyReport(year: number, month: number) {
    // month is 1-indexed (1 = January, 12 = December)
    const targetMonthIndex = month - 1;

    const filteredSales = this.data.sales.filter((sale) => {
      const d = new Date(sale.timestamp);
      return d.getFullYear() === year && d.getMonth() === targetMonthIndex;
    });

    let totalRevenue = 0;
    const paymentBreakdown: Record<PaymentMethod, { count: number; revenue: number }> = {
      upi: { count: 0, revenue: 0 },
      cash: { count: 0, revenue: 0 },
      card: { count: 0, revenue: 0 },
    };

    const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    const dailyRevenueMap: Record<number, number> = {};

    // Determine days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      dailyRevenueMap[day] = 0;
    }

    for (const sale of filteredSales) {
      totalRevenue += sale.total_amount;
      const method = sale.payment_method;
      if (paymentBreakdown[method]) {
        paymentBreakdown[method].count += 1;
        paymentBreakdown[method].revenue = Number((paymentBreakdown[method].revenue + sale.total_amount).toFixed(2));
      }

      const day = new Date(sale.timestamp).getDate();
      dailyRevenueMap[day] = Number(((dailyRevenueMap[day] || 0) + sale.total_amount).toFixed(2));

      for (const item of sale.items) {
        const existing = productSalesMap.get(item.product_id) || {
          name: item.product_name,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue = Number((existing.revenue + item.price_at_sale * item.quantity).toFixed(2));
        productSalesMap.set(item.product_id, existing);
      }
    }

    const bestSellers = Array.from(productSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const dailyTrends = Object.entries(dailyRevenueMap).map(([day, revenue]) => ({
      day: `Day ${day}`,
      dayNumber: Number(day),
      revenue,
    }));

    const paymentChart = [
      { name: 'UPI', value: paymentBreakdown.upi.revenue, count: paymentBreakdown.upi.count, key: 'upi' },
      { name: 'Cash', value: paymentBreakdown.cash.revenue, count: paymentBreakdown.cash.count, key: 'cash' },
      { name: 'Card', value: paymentBreakdown.card.revenue, count: paymentBreakdown.card.count, key: 'card' },
    ];

    const lowStockProducts = this.data.products.filter((p) => p.current_stock <= p.low_stock_threshold);

    return {
      year,
      month,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      transactionCount: filteredSales.length,
      averageOrderValue: filteredSales.length > 0 ? Number((totalRevenue / filteredSales.length).toFixed(2)) : 0,
      paymentBreakdown,
      paymentChart,
      dailyTrends,
      bestSellers,
      lowStockCount: lowStockProducts.length,
      totalProductCount: this.data.products.length,
    };
  }
}

export const db = new DatabaseService();
