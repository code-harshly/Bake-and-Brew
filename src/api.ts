import { Product, Sale, MonthlyReport, UserRole, PaymentMethod } from './types';

const TOKEN_STORAGE_KEY = 'bake_brew_token';
const ROLE_STORAGE_KEY = 'bake_brew_role';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredAuth(token: string, role: UserRole) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(ROLE_STORAGE_KEY, role);
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(ROLE_STORAGE_KEY);
}

export function getStoredRole(): UserRole | null {
  return localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include', // Include httpOnly cookie
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch {
      errorMsg = response.statusText || `Request failed with status ${response.status}`;
    }
    const err = new Error(errorMsg) as any;
    err.status = response.status;
    throw err;
  }

  return response.json();
}

export const api = {
  // Auth
  async login(password: string): Promise<{ success: boolean; role: UserRole; token: string }> {
    const res = await request<{ success: boolean; role: UserRole; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    setStoredAuth(res.token, res.role);
    return res;
  },

  async getMe(): Promise<{ role: UserRole }> {
    return request<{ role: UserRole }>('/api/auth/me');
  },

  async logout(): Promise<{ success: boolean }> {
    try {
      await request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
    } finally {
      clearStoredAuth();
    }
    return { success: true };
  },

  // Staff Billing
  async getStaffProducts(): Promise<Product[]> {
    const res = await request<{ products: Product[] }>('/api/staff/products');
    return res.products;
  },

  async checkout(items: { productId: string; quantity: number }[], paymentMethod: PaymentMethod): Promise<Sale> {
    const res = await request<{ success: boolean; sale: Sale }>('/api/staff/checkout', {
      method: 'POST',
      body: JSON.stringify({ items, paymentMethod }),
    });
    return res.sale;
  },

  // Owner Inventory
  async getOwnerInventory(): Promise<Product[]> {
    const res = await request<{ products: Product[] }>('/api/owner/inventory');
    return res.products;
  },

  async createProduct(product: {
    name: string;
    category: string;
    price: number;
    current_stock: number;
    low_stock_threshold: number;
  }): Promise<Product> {
    const res = await request<{ success: boolean; product: Product }>('/api/owner/inventory', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    return res.product;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const res = await request<{ success: boolean; product: Product }>(`/api/owner/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return res.product;
  },

  async deleteProduct(id: string): Promise<boolean> {
    const res = await request<{ success: boolean }>(`/api/owner/inventory/${id}`, {
      method: 'DELETE',
    });
    return res.success;
  },

  // Owner Reports
  async getOwnerReports(year: number, month: number): Promise<MonthlyReport> {
    const res = await request<{ report: MonthlyReport }>(`/api/owner/reports?year=${year}&month=${month}`);
    return res.report;
  },
};
