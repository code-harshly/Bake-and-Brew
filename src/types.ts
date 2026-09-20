export type UserRole = 'owner' | 'staff';

export type PaymentMethod = 'upi' | 'cash' | 'card';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  current_stock: number;
  low_stock_threshold: number;
  created_at?: string;
  updated_at?: string;
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

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface BestSeller {
  name: string;
  quantity: number;
  revenue: number;
}

export interface PaymentBreakdownItem {
  name: string;
  value: number;
  count: number;
  key: PaymentMethod;
}

export interface DailyTrendItem {
  day: string;
  dayNumber: number;
  revenue: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  totalRevenue: number;
  transactionCount: number;
  averageOrderValue: number;
  paymentBreakdown: Record<PaymentMethod, { count: number; revenue: number }>;
  paymentChart: PaymentBreakdownItem[];
  dailyTrends: DailyTrendItem[];
  bestSellers: BestSeller[];
  recentSales?: Sale[];

  totalProductCount: number;
}
