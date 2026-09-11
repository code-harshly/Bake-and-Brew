var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// api/handler.ts
import express2 from "express";
import cookieParser2 from "cookie-parser";
import jwt2 from "jsonwebtoken";

// server.ts
import "dotenv/config";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";

// server/db.ts
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to use the PostgreSQL database.");
  }
  return url;
}
function asProduct(record) {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    price: Number(record.price),
    current_stock: record.current_stock,
    low_stock_threshold: record.low_stock_threshold,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString()
  };
}
function asSale(record) {
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
      price_at_sale: Number(item.price_at_sale)
    }))
  };
}
var DatabaseService = class {
  constructor() {
  }
  getClient() {
    if (!this.client) {
      const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
      this.client = new PrismaClient({ adapter });
    }
    return this.client;
  }
  async database() {
    this.connection ??= this.getClient().$connect();
    await this.connection;
    return this.getClient();
  }
  async getProducts() {
    const client = await this.database();
    const products = await client.product.findMany({ orderBy: { name: "asc" } });
    return products.map(asProduct);
  }
  async getProductById(id) {
    const client = await this.database();
    const product = await client.product.findUnique({ where: { id } });
    return product ? asProduct(product) : void 0;
  }
  async createProduct(payload) {
    const client = await this.database();
    const product = await client.product.create({
      data: {
        name: payload.name.trim(),
        category: (payload.category || "other").trim().toLowerCase(),
        price: Number(Number(payload.price).toFixed(2)),
        current_stock: Math.max(0, Math.floor(payload.current_stock)),
        low_stock_threshold: Math.max(0, Math.floor(payload.low_stock_threshold))
      }
    });
    return asProduct(product);
  }
  async updateProduct(id, payload) {
    const client = await this.database();
    const current = await client.product.findUnique({ where: { id } });
    if (!current) {
      throw new Error("Product not found");
    }
    const product = await client.product.update({
      where: { id },
      data: {
        name: payload.name !== void 0 ? payload.name.trim() : void 0,
        category: payload.category !== void 0 ? payload.category.trim().toLowerCase() : void 0,
        price: payload.price !== void 0 ? Number(Number(payload.price).toFixed(2)) : void 0,
        current_stock: payload.current_stock !== void 0 ? Math.max(0, Math.floor(payload.current_stock)) : void 0,
        low_stock_threshold: payload.low_stock_threshold !== void 0 ? Math.max(0, Math.floor(payload.low_stock_threshold)) : void 0
      }
    });
    return asProduct(product);
  }
  async deleteProduct(id) {
    const client = await this.database();
    const deleted = await client.product.deleteMany({ where: { id } });
    return deleted.count > 0;
  }
  async checkoutAtomic(payload) {
    if (!payload.items || payload.items.length === 0) {
      throw new Error("Cannot complete sale with an empty cart.");
    }
    if (!["upi", "cash", "card"].includes(payload.paymentMethod)) {
      throw new Error("Invalid payment method. Allowed: upi, cash, card.");
    }
    const client = await this.database();
    const sale = await client.$transaction(async (tx) => {
      const saleId = crypto.randomUUID();
      const now = /* @__PURE__ */ new Date();
      const itemData = [];
      let totalAmount = 0;
      for (const itemReq of payload.items) {
        if (!itemReq.productId || itemReq.quantity <= 0) {
          throw new Error("Invalid item or quantity in cart.");
        }
        const product = await tx.product.findUnique({ where: { id: itemReq.productId } });
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
          data: { current_stock: { decrement: itemReq.quantity } }
        });
        if (updated.count !== 1) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.current_stock}, Requested: ${itemReq.quantity}.`);
        }
        totalAmount += product.price.toNumber() * itemReq.quantity;
        itemData.push({
          id: crypto.randomUUID(),
          product_id: product.id,
          quantity: itemReq.quantity,
          price_at_sale: product.price.toNumber()
        });
      }
      return tx.sale.create({
        data: {
          id: saleId,
          timestamp: now,
          created_at: now,
          total_amount: Number(totalAmount.toFixed(2)),
          payment_method: payload.paymentMethod,
          items: { create: itemData }
        },
        include: { items: { include: { product: true } } }
      });
    });
    return asSale(sale);
  }
  async getMonthlyReport(year, month) {
    const client = await this.database();
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const [sales, products] = await Promise.all([
      client.sale.findMany({
        where: { timestamp: { gte: start, lt: end } },
        include: { items: { include: { product: true } } }
      }),
      client.product.findMany()
    ]);
    const mappedSales = sales.map(asSale);
    let totalRevenue = 0;
    const paymentBreakdown = {
      upi: { count: 0, revenue: 0 },
      cash: { count: 0, revenue: 0 },
      card: { count: 0, revenue: 0 }
    };
    const productSalesMap = /* @__PURE__ */ new Map();
    const dailyRevenueMap = {};
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
    const bestSellers = Array.from(productSalesMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
    const dailyTrends = Object.entries(dailyRevenueMap).map(([day, revenue]) => ({
      day: `Day ${day}`,
      dayNumber: Number(day),
      revenue
    }));
    const paymentChart = [
      { name: "UPI", value: paymentBreakdown.upi.revenue, count: paymentBreakdown.upi.count, key: "upi" },
      { name: "Cash", value: paymentBreakdown.cash.revenue, count: paymentBreakdown.cash.count, key: "cash" },
      { name: "Card", value: paymentBreakdown.card.revenue, count: paymentBreakdown.card.count, key: "card" }
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
      totalProductCount: products.length
    };
  }
};
var db = new DatabaseService();

// server/auth.ts
import jwt from "jsonwebtoken";
var OWNER_PASSWORD = "owner123";
var STAFF_PASSWORD = "staff123";
var JWT_SECRET = process.env.JWT_SECRET || "bake-and-brew-jwt-secret-key-prod-2026";
function getOwnerPasswordConfig() {
  return OWNER_PASSWORD;
}
function getStaffPasswordConfig() {
  return STAFF_PASSWORD;
}
function normalizeConfiguredPassword(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && (trimmed.startsWith('"') && trimmed.endsWith('"') || trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
function verifyPasswordMatch(password, configuredPassword) {
  return password === normalizeConfiguredPassword(configuredPassword);
}
async function authenticatePassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Invalid password");
  }
  const ownerConfig = getOwnerPasswordConfig();
  const staffConfig = getStaffPasswordConfig();
  const isOwner = verifyPasswordMatch(password, ownerConfig);
  if (isOwner) {
    const token = jwt.sign({ role: "owner" }, JWT_SECRET, { expiresIn: "8h" });
    return { token, role: "owner" };
  }
  const isStaff = verifyPasswordMatch(password, staffConfig);
  if (isStaff) {
    const token = jwt.sign({ role: "staff" }, JWT_SECRET, { expiresIn: "8h" });
    return { token, role: "staff" };
  }
  throw new Error("Invalid password");
}
function verifyToken(req) {
  let token;
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      token = parts[1];
    }
  }
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}
function requireAuth(req, res, next) {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized. Please log in." });
    return;
  }
  req.user = user;
  next();
}
function requireOwner(req, res, next) {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized. Please log in." });
    return;
  }
  if (user.role !== "owner") {
    res.status(403).json({ error: "Forbidden. Owner privileges required." });
    return;
  }
  req.user = user;
  next();
}
function requireStaff(req, res, next) {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized. Please log in." });
    return;
  }
  if (user.role !== "staff") {
    res.status(403).json({ error: "Forbidden. Staff access required. Owner does not have billing permissions." });
    return;
  }
  req.user = user;
  next();
}

// server.ts
var app = express();
var isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
app.use(express.json());
app.use(cookieParser());
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const { password } = req.body;
    const { token, role } = await authenticatePassword(password);
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1e3,
      // 8 hours
      path: "/"
    });
    res.json({ success: true, role, token });
  } catch (err) {
    res.status(401).json({ error: err.message || "Invalid password" });
  }
});
app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ role: req.user?.role });
});
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ success: true });
});
app.get("/api/staff/products", requireStaff, async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load products" });
  }
});
app.post("/api/staff/checkout", requireStaff, async (req, res) => {
  try {
    const { items, paymentMethod } = req.body;
    const sale = await db.checkoutAtomic({ items, paymentMethod });
    res.status(201).json({ success: true, sale });
  } catch (err) {
    res.status(400).json({ error: err.message || "Checkout failed" });
  }
});
app.get("/api/owner/inventory", requireOwner, async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to load inventory" });
  }
});
app.post("/api/owner/inventory", requireOwner, async (req, res) => {
  try {
    const { name, category, price, current_stock, low_stock_threshold } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ error: "Product name is required." });
    }
    if (price === void 0 || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: "Valid positive price is required." });
    }
    if (current_stock === void 0 || isNaN(Number(current_stock)) || Number(current_stock) < 0) {
      return res.status(400).json({ error: "Valid stock count is required." });
    }
    const product = await db.createProduct({
      name,
      category: category || "other",
      price: Number(price),
      current_stock: Number(current_stock),
      low_stock_threshold: Number(low_stock_threshold || 10)
    });
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create product" });
  }
});
app.put("/api/owner/inventory/:id", requireOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.updateProduct(id, req.body);
    res.json({ success: true, product: updated });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to update product" });
  }
});
app.delete("/api/owner/inventory/:id", requireOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteProduct(id);
    if (!deleted) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to delete product" });
  }
});
app.get("/api/owner/reports", requireOwner, async (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const year = req.query.year ? parseInt(req.query.year, 10) : now.getFullYear();
    const month = req.query.month ? parseInt(req.query.month, 10) : now.getMonth() + 1;
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: "Invalid year or month parameter" });
    }
    const report = await db.getMonthlyReport(year, month);
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to generate report" });
  }
});
if (isProduction) {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  const port = Number(process.env.PORT || 3e3);
  app.listen(port, "0.0.0.0", () => {
    console.log(`Bake & Brew server running at http://0.0.0.0:${port}`);
  });
}
var isMainModule = typeof __require !== "undefined" ? __require.main === module : path.basename(process.argv[1] ?? "") === "server.ts";
if (isMainModule) {
  void startServer();
}

// api/handler.ts
var api = express2();
var JWT_SECRET2 = process.env.JWT_SECRET || "bake-and-brew-jwt-secret-key-prod-2026";
api.use(express2.json());
api.use(cookieParser2());
api.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
api.post("/api/auth/login", (req, res) => {
  const { password } = req.body ?? {};
  const role = password === "owner123" ? "owner" : password === "staff123" ? "staff" : void 0;
  if (!role) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  const token = jwt2.sign({ role }, JWT_SECRET2, { expiresIn: "8h" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1e3,
    path: "/"
  });
  res.json({ success: true, role, token });
});
api.get("/api/auth/me", (req, res) => {
  const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/, "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized. Please log in." });
    return;
  }
  try {
    const user = jwt2.verify(token, JWT_SECRET2);
    if (user.role !== "owner" && user.role !== "staff") throw new Error("Invalid role");
    res.json({ role: user.role });
  } catch {
    res.status(401).json({ error: "Unauthorized. Please log in." });
  }
});
api.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ success: true });
});
api.use((req, res, next) => {
  app(req, res, next);
});
var handler_default = api;
export {
  handler_default as default
};
