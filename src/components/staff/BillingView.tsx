import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Product, CartItem, PaymentMethod, Sale } from '../../types';
import { ReceiptModal } from './ReceiptModal';
import { LogOut, Plus, Minus, Trash2, ShoppingBag, Search, AlertCircle, RefreshCw } from 'lucide-react';

const COMPLETED_SALE_STORAGE_KEY = 'bake_brew_completed_sale';

interface BillingViewProps {
  onLogout: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({ onLogout }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(() => {
    const storedSale = sessionStorage.getItem(COMPLETED_SALE_STORAGE_KEY);
    if (!storedSale) return null;

    try {
      return JSON.parse(storedSale) as Sale;
    } catch {
      sessionStorage.removeItem(COMPLETED_SALE_STORAGE_KEY);
      return null;
    }
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getStaffProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const categories = ['all', 'coffee', 'bakery', 'other'];

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.category.toLowerCase() === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const addToCart = (product: Product) => {
    if (product.current_stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) {
          // Cannot add more than current stock
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.current_stock) return item; // cap at available stock
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || checkoutLoading) return;

    setCheckoutLoading(true);
    setError('');

    try {
      const itemsPayload = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      const sale = await api.checkout(itemsPayload, paymentMethod);
      setCompletedSale(sale);
      sessionStorage.setItem(COMPLETED_SALE_STORAGE_KEY, JSON.stringify(sale));
      setCart([]);
      // Refresh inventory stock
      fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Checkout failed. Please check stock levels.');
      // Refresh products to show updated stock
      fetchProducts();
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-[#E5E5E5] px-4 md:px-8 flex items-center justify-between bg-white sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[#111111] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <div>
            <h1 className="text-[17px] font-medium text-[#0A0A0A] leading-tight">
              Bake &amp; Brew
            </h1>
            <p className="text-[12px] text-[#6B6B6B]">Billing Terminal (Staff)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-[12px] px-2.5 py-1 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[6px] text-[#0A0A0A]">
            Staff on duty
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E5E5E5] hover:border-[#111111] text-[13px] text-[#0A0A0A] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </header>

      {/* Main Billing Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Product Selection Grid */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto border-r-0 lg:border-r border-[#E5E5E5]">
          {/* Controls: Search and Category Tabs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#6B6B6B]" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-white border border-[#E5E5E5] rounded-[8px] text-[14px] text-[#0A0A0A] placeholder-[#6B6B6B] focus:outline-none focus:border-[#111111]"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 h-10 rounded-[8px] text-[13px] font-medium capitalize whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#111111] text-white'
                      : 'bg-[#FAFAFA] border border-[#E5E5E5] text-[#6B6B6B] hover:text-[#0A0A0A]'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <button
                type="button"
                onClick={fetchProducts}
                title="Refresh products"
                className="w-10 h-10 flex items-center justify-center rounded-[8px] border border-[#E5E5E5] bg-white text-[#6B6B6B] hover:text-[#0A0A0A] hover:border-[#D0D0D0] cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-white border border-[#DC2626] rounded-[8px] flex items-center gap-2 text-[13px] text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Grid */}
          {loading && products.length === 0 ? (
            <div className="py-20 text-center text-[#6B6B6B] text-[14px]">
              Loading product catalog...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center text-[#6B6B6B] text-[14px]">
              No products found matching criteria.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.current_stock <= 0;
                const isLowStock = !isOutOfStock && product.current_stock <= product.low_stock_threshold;
                const cartQty = cart.find((i) => i.product.id === product.id)?.quantity || 0;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    className={`relative text-left p-3.5 rounded-[12px] border transition-all cursor-pointer flex flex-col justify-between min-h-[118px] ${
                      isOutOfStock
                        ? 'bg-[#FAFAFA] border-[#E5E5E5] opacity-60 cursor-not-allowed'
                        : cartQty > 0
                        ? 'bg-[#FFFFFF] border-[#111111] ring-1 ring-[#111111]'
                        : 'bg-[#FAFAFA] border-[#E5E5E5] hover:border-[#D0D0D0] hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-[11px] text-[#6B6B6B] uppercase tracking-wider">
                          {product.category}
                        </span>
                        {isOutOfStock && (
                          <span className="text-[10px] text-[#DC2626] border border-[#DC2626] px-1.5 py-0.2 rounded font-medium">
                            Out of stock
                          </span>
                        )}
                        {isLowStock && (
                          <span className="text-[10px] text-[#DC2626] font-medium">
                            {product.current_stock} left
                          </span>
                        )}
                      </div>
                      <h3 className="text-[14px] font-medium text-[#0A0A0A] leading-snug line-clamp-2">
                        {product.name}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#E5E5E5]/60">
                      <span className="text-[15px] font-medium text-[#0A0A0A]">
                        ${product.price.toFixed(2)}
                      </span>

                      {!isOutOfStock && (
                        <div className="flex items-center gap-1">
                          {cartQty > 0 && (
                            <span className="text-[11px] font-medium bg-[#111111] text-white px-1.5 py-0.5 rounded-full">
                              {cartQty}
                            </span>
                          )}
                          <span className="text-[11px] text-[#6B6B6B]">
                            Stock {product.current_stock}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Running Order Ticket & Checkout */}
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-[#FAFAFA] flex flex-col h-auto lg:h-[calc(100vh-64px)] border-t lg:border-t-0 border-[#E5E5E5]">
          {/* Order Header */}
          <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#0A0A0A]" />
              <h2 className="text-[15px] font-medium text-[#0A0A0A]">Current order</h2>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-[12px] text-[#6B6B6B] hover:text-[#DC2626] transition-colors cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
            {cart.length === 0 ? (
              <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center text-[#6B6B6B]">
                <ShoppingBag className="w-8 h-8 stroke-1 text-[#D0D0D0] mb-2" />
                <p className="text-[14px]">Order is empty</p>
                <p className="text-[12px] text-[#6B6B6B]">Select items from the catalog</p>
              </div>
            ) : (
              cart.map((item) => {
                const lineTotal = item.product.price * item.quantity;
                return (
                  <div
                    key={item.product.id}
                    className="p-3 bg-white border border-[#E5E5E5] rounded-[8px] flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-[14px] font-medium text-[#0A0A0A] truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[12px] text-[#6B6B6B]">
                        ${item.product.price.toFixed(2)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-[#E5E5E5] rounded-[6px] bg-[#FAFAFA]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-7 h-7 flex items-center justify-center text-[#0A0A0A] hover:bg-[#E5E5E5] transition-colors cursor-pointer rounded-l-[6px]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-[13px] font-medium text-[#0A0A0A]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          disabled={item.quantity >= item.product.current_stock}
                          className="w-7 h-7 flex items-center justify-center text-[#0A0A0A] hover:bg-[#E5E5E5] transition-colors cursor-pointer rounded-r-[6px] disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Total */}
                      <span className="w-16 text-right text-[14px] font-medium text-[#0A0A0A]">
                        ${lineTotal.toFixed(2)}
                      </span>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-[#6B6B6B] hover:text-[#DC2626] p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Checkout Panel */}
          <div className="p-4 bg-white border-t border-[#E5E5E5] space-y-4">
            {/* Payment Method Selector */}
            <div>
              <label className="block text-[12px] font-normal text-[#6B6B6B] mb-2">
                Payment method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['upi', 'cash', 'card'] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`h-9 rounded-[8px] text-[13px] font-medium uppercase transition-colors cursor-pointer border ${
                      paymentMethod === method
                        ? 'bg-[#111111] text-white border-[#111111]'
                        : 'bg-[#FAFAFA] border-[#E5E5E5] text-[#0A0A0A] hover:border-[#D0D0D0]'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Calculations */}
            <div className="pt-2 border-t border-[#E5E5E5] space-y-1 text-[13px]">
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Items count</span>
                <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-[17px] font-medium text-[#0A0A0A] pt-1">
                <span>Total amount</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Complete Sale Button */}
            <button
              type="button"
              id="complete-sale-btn"
              onClick={handleCheckout}
              disabled={cart.length === 0 || checkoutLoading}
              className="w-full h-12 bg-[#111111] hover:bg-[#222222] text-white rounded-[8px] text-[15px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {checkoutLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing sale...</span>
                </>
              ) : (
                <span>Complete sale (${totalAmount.toFixed(2)})</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Completed Sale Receipt Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => {
            setCompletedSale(null);
            sessionStorage.removeItem(COMPLETED_SALE_STORAGE_KEY);
          }}
        />
      )}
    </div>
  );
};
