import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

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

type SaleWithItems = Prisma.SaleGetPayload<{ include: { items: { include: { product: true } } } }>;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required to use the PostgreSQL database.');
  }
  return url;
}

function asProduct(record: {
  id: string;
  name: string;
  category: string;
  price: unknown;
  current_stock: number;
  low_stock_threshold: number;
  created_at: Date;
  updated_at: Date;
}): Product {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    price: Number(record.price),
    current_stock: record.current_stock,
    low_stock_threshold: record.low_stock_threshold,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

function asSale(record: SaleWithItems): Sale {
  return {
    id: record.id,
    timestamp: record.timestamp.toISOString(),
    total_amount: Number(record.total_amount),
    payment_method: record.payment_method,
    created_at: record.created_at.toISOString(),
    items: record.items.map((item) => ({
      id: item.id,
      sale_id: item.sale_id,
      product_id: item.product_id,
      product_name: item.product.name,
      quantity: item.quantity,
      price_at_sale: Number(item.price_at_sale),
    })),
  };
}

class DatabaseService {
  private client: PrismaClient | undefined;
  private connection: Promise<void> | undefined;

  constructor() {
  }

  private getClient(): PrismaClient {
    if (!this.client) {
      const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
      this.client = new PrismaClient({ adapter });
    }
    return this.client;
  }

  private async database(): Promise<PrismaClient> {
    this.connection ??= this.getClient().$connect();
    await this.connection;
    return this.getClient();
  }

  public async getProducts(): Promise<Product[]> {
    const client = await this.database();
    const products = await client.product.findMany({
      where: { deleted_at: null },
      orderBy: { name: 'asc' },
    });
    return products.map(asProduct);
  }

  public async getProductById(id: string): Promise<Product | undefined> {
    const client = await this.database();
    const product = await client.product.findFirst({ where: { id, deleted_at: null } });
    return product ? asProduct(product) : undefined;
  }

  public async createProduct(payload: {
    name: string;
    category: string;
    price: number;
    current_stock: number;
    low_stock_threshold: number;
  }): Promise<Product> {
    const client = await this.database();
    const product = await client.product.create({
      data: {
        name: payload.name.trim(),
        category: (payload.category || 'other').trim().toLowerCase(),
        price: Number(Number(payload.price).toFixed(2)),
        current_stock: Math.max(0, Math.floor(payload.current_stock)),
        low_stock_threshold: Math.max(0, Math.floor(payload.low_stock_threshold)),
      },
    });
    return asProduct(product);
  }

  public async updateProduct(
    id: string,
    payload: Partial<{
      name: string;
      category: string;
      price: number;
      current_stock: number;
      low_stock_threshold: number;
    }>
  ): Promise<Product> {
    const client = await this.database();
    const current = await client.product.findFirst({ where: { id, deleted_at: null } });
    if (!current) {
      throw new Error('Product not found');
    }

    const product = await client.product.update({
      where: { id },
      data: {
        name: payload.name !== undefined ? payload.name.trim() : undefined,
        category: payload.category !== undefined ? payload.category.trim().toLowerCase() : undefined,
        price: payload.price !== undefined ? Number(Number(payload.price).toFixed(2)) : undefined,
        current_stock: payload.current_stock !== undefined ? Math.max(0, Math.floor(payload.current_stock)) : undefined,
        low_stock_threshold:
          payload.low_stock_threshold !== undefined ? Math.max(0, Math.floor(payload.low_stock_threshold)) : undefined,
      },
    });
    return asProduct(product);
  }

  public async deleteProduct(id: string): Promise<boolean> {
    const client = await this.database();
    const deleted = await client.product.updateMany({
      where: { id, deleted_at: null },
      data: { deleted_at: new Date() },
    });
    return deleted.count > 0;
  }

  // Delete a sale permanently
  public async deleteSale(id: string): Promise<boolean> {
    const client = await this.database();
    try {
      await client.sale.delete({ where: { id } });
      return true;
    } catch (e) {
      // If the sale does not exist, return false
      return false;
    }
  }

  public async checkoutAtomic(payload: {
    items: { productId: string; quantity: number }[];
    paymentMethod: PaymentMethod;
  }): Promise<Sale> {
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Cannot complete sale with an empty cart.');
    }
    if (!['upi', 'cash', 'card'].includes(payload.paymentMethod)) {
      throw new Error('Invalid payment method. Allowed: upi, cash, card.');
    }

    const client = await this.database();
    const sale = await client.$transaction(async (tx) => {
      const saleId = crypto.randomUUID();
      const now = new Date();
      const itemData: { id: string; product_id: string; quantity: number; price_at_sale: number }[] = [];
      let totalAmount = 0;

      for (const itemReq of payload.items) {
        if (!itemReq.productId || itemReq.quantity <= 0) {
          throw new Error('Invalid item or quantity in cart.');
        }

        const product = await tx.product.findFirst({
          where: { id: itemReq.productId, deleted_at: null },
        });
        if (!product) {
          throw new Error(`Product not found (ID: ${itemReq.productId}).`);
        }
        if (product.current_stock < itemReq.quantity) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${product.current_stock}, Requested: ${itemReq.quantity}.`
          );
        }

        const updated = await tx.product.updateMany({
          where: { id: product.id, current_stock: { gte: itemReq.quantity } },
          data: { current_stock: { decrement: itemReq.quantity } },
        });
        if (updated.count !== 1) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.current_stock}, Requested: ${itemReq.quantity}.`);
        }

        totalAmount += product.price.toNumber() * itemReq.quantity;
        itemData.push({
          id: crypto.randomUUID(),
          product_id: product.id,
          quantity: itemReq.quantity,
          price_at_sale: product.price.toNumber(),
        });
      }

      return tx.sale.create({
        data: {
          id: saleId,
          timestamp: now,
          created_at: now,
          total_amount: Number(totalAmount.toFixed(2)),
          payment_method: payload.paymentMethod,
          items: { create: itemData },
        },
        include: { items: { include: { product: true } } },
      });
    });

    return asSale(sale);
  }

  public async getMonthlyReport(year: number, month: number) {
    const client = await this.database();
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const [sales, products] = await Promise.all([
      client.sale.findMany({
        where: { timestamp: { gte: start, lt: end } },
        include: { items: { include: { product: true } } },
        orderBy: { timestamp: 'desc' },
      }),
      client.product.findMany({ where: { deleted_at: null } }),
    ]);
    const mappedSales = sales.map(asSale);

    // Latest 100 sales for recent sales table
    const recentSales = mappedSales.slice(0, 100);

    let totalRevenue = 0;
    const paymentBreakdown: Record<PaymentMethod, { count: number; revenue: number }> = {
      upi: { count: 0, revenue: 0 },
      cash: { count: 0, revenue: 0 },
      card: { count: 0, revenue: 0 },
    };
    const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    const dailyRevenueMap: Record<number, number> = {};
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) dailyRevenueMap[day] = 0;

    for (const sale of mappedSales) {
      totalRevenue += sale.total_amount;
      const method = sale.payment_method;
      paymentBreakdown[method].count += 1;
      paymentBreakdown[method].revenue = Number((paymentBreakdown[method].revenue + sale.total_amount).toFixed(2));

      const day = new Date(sale.timestamp).getDate();
      dailyRevenueMap[day] = Number(((dailyRevenueMap[day] || 0) + sale.total_amount).toFixed(2));
      for (const item of sale.items) {
        const existing = productSalesMap.get(item.product_id) || { name: item.product_name, quantity: 0, revenue: 0 };
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
    const lowStockCount = products.filter((product) => product.current_stock <= product.low_stock_threshold).length;

    return {
      year,
      month,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      transactionCount: mappedSales.length,
      averageOrderValue: mappedSales.length > 0 ? Number((totalRevenue / mappedSales.length).toFixed(2)) : 0,
      paymentBreakdown,
      paymentChart,
      dailyTrends,
      bestSellers,
      lowStockCount,
      totalProductCount: products.length,
      recentSales,
    };
  }


    const paymentChart = [
      { name: 'UPI', value: paymentBreakdown.upi.revenue, count: paymentBreakdown.upi.count, key: 'upi' },
      { name: 'Cash', value: paymentBreakdown.cash.revenue, count: paymentBreakdown.cash.count, key: 'cash' },
      { name: 'Card', value: paymentBreakdown.card.revenue, count: paymentBreakdown.card.count, key: 'card' },
    ];
    const lowStockCount = products.filter((product) => product.current_stock <= product.low_stock_threshold).length;

    return {
      year,
      month,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      transactionCount: mappedSales.length,
      averageOrderValue: mappedSales.length > 0 ? Number((totalRevenue / mappedSales.length).toFixed(2)) : 0,
      paymentBreakdown,
      paymentChart,
      dailyTrends,
      bestSellers,
      lowStockCount,
      totalProductCount: products.length,
    };
  }
}

export const db = new DatabaseService();
