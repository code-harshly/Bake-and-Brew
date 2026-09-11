import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

type LegacyProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  current_stock: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
};

type LegacySaleItem = {
  id: string;
  product_id: string;
  quantity: number;
  price_at_sale: number;
};

type LegacySale = {
  id: string;
  timestamp: string;
  total_amount: number;
  payment_method: 'upi' | 'cash' | 'card';
  created_at: string;
  items: LegacySaleItem[];
};

type LegacyStore = { products: LegacyProduct[]; sales: LegacySale[] };

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required to seed PostgreSQL.');
  return url;
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl() }),
  });

  try {
    const file = path.resolve(process.cwd(), 'data', 'bake_brew_store.json');
    let legacy: LegacyStore;
    try {
      legacy = JSON.parse(await fs.readFile(file, 'utf8')) as LegacyStore;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('No legacy JSON file found; nothing to import.');
        return;
      }
      throw error;
    }

    if (!Array.isArray(legacy.products) || !Array.isArray(legacy.sales)) {
      throw new Error('Legacy JSON must contain products and sales arrays.');
    }

    const imported = await prisma.$transaction(async (tx) => {
      // Serialize seed invocations so concurrent deploys cannot import twice.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(737817334);`;
      const [productCount, saleCount] = await Promise.all([
        tx.product.count(),
        tx.sale.count(),
      ]);
      if (productCount > 0 || saleCount > 0) return false;

      for (const product of legacy.products) {
        await tx.product.create({
          data: {
            id: product.id || crypto.randomUUID(),
            name: product.name,
            category: product.category,
            price: product.price,
            current_stock: product.current_stock,
            low_stock_threshold: product.low_stock_threshold,
            created_at: new Date(product.created_at),
            updated_at: new Date(product.updated_at),
          },
        });
      }

      for (const sale of legacy.sales) {
        await tx.sale.create({
          data: {
            id: sale.id || crypto.randomUUID(),
            timestamp: new Date(sale.timestamp),
            total_amount: sale.total_amount,
            payment_method: sale.payment_method,
            created_at: new Date(sale.created_at),
            items: {
              create: sale.items.map((item) => ({
                id: item.id || crypto.randomUUID(),
                product_id: item.product_id,
                quantity: item.quantity,
                price_at_sale: item.price_at_sale,
              })),
            },
          },
        });
      }
      return true;
    });
    if (imported) {
      console.log(`Imported ${legacy.products.length} products and ${legacy.sales.length} sales.`);
    } else {
      console.log('Database already contains data; skipping legacy JSON import.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Database seed failed:', error);
  process.exitCode = 1;
});
