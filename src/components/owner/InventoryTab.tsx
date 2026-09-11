import React, { useState } from 'react';
import { Product } from '../../types';
import { api } from '../../api';
import { ProductModal } from './ProductModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { Plus, Search, Edit2, Trash2, AlertCircle, RefreshCw } from 'lucide-react';

interface InventoryTabProps {
  products: Product[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  products,
  loading,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [actionError, setActionError] = useState('');

  const categories = ['all', 'coffee', 'bakery', 'other'];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter;
    const isLowStock = p.current_stock <= p.low_stock_threshold;
    const matchesLowStock = !showLowStockOnly || isLowStock;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const lowStockCount = products.filter((p) => p.current_stock <= p.low_stock_threshold).length;
  const outOfStockCount = products.filter((p) => p.current_stock === 0).length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.current_stock, 0);

  const handleCreateProduct = async (data: {
    name: string;
    category: string;
    price: number;
    current_stock: number;
    low_stock_threshold: number;
  }) => {
    await api.createProduct(data);
    await onRefresh();
  };

  const handleUpdateProduct = async (data: {
    name: string;
    category: string;
    price: number;
    current_stock: number;
    low_stock_threshold: number;
  }) => {
    if (!editingProduct) return;
    await api.updateProduct(editingProduct.id, data);
    setEditingProduct(null);
    await onRefresh();
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    await api.deleteProduct(productToDelete.id);
    setProductToDelete(null);
    await onRefresh();
  };

  const handleQuickRestock = async (product: Product, amount: number) => {
    try {
      setActionError('');
      await api.updateProduct(product.id, {
        current_stock: product.current_stock + amount,
      });
      await onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to restock item');
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[12px]">
          <span className="text-[12px] text-[#6B6B6B]">Total products</span>
          <div className="text-[22px] font-medium text-[#0A0A0A] mt-1">
            {products.length}
          </div>
          <p className="text-[12px] text-[#6B6B6B] mt-0.5">{totalStockUnits} units in stock</p>
        </div>

        <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[12px]">
          <span className="text-[12px] text-[#6B6B6B]">Low stock items</span>
          <div className="text-[22px] font-medium text-[#DC2626] mt-1 flex items-center gap-2">
            <span>{lowStockCount}</span>
            {lowStockCount > 0 && (
              <span className="text-[11px] font-normal px-2 py-0.5 rounded border border-[#DC2626]">
                Attention required
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#6B6B6B] mt-0.5">Threshold alerts</p>
        </div>

        <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[12px]">
          <span className="text-[12px] text-[#6B6B6B]">Out of stock items</span>
          <div className="text-[22px] font-medium text-[#0A0A0A] mt-1">
            {outOfStockCount}
          </div>
          <p className="text-[12px] text-[#6B6B6B] mt-0.5">Cannot be sold currently</p>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-white border border-[#DC2626] rounded-[8px] flex items-center gap-2 text-[13px] text-[#DC2626]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1 w-full">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[340px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#6B6B6B]" />
            <input
              type="text"
              placeholder="Search by product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-white border border-[#E5E5E5] rounded-[8px] text-[14px] text-[#0A0A0A] placeholder-[#6B6B6B] focus:outline-none focus:border-[#111111]"
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 h-10 rounded-[8px] text-[13px] font-medium capitalize transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#111111] text-white'
                    : 'bg-[#FAFAFA] border border-[#E5E5E5] text-[#6B6B6B] hover:text-[#0A0A0A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Low Stock Toggle */}
          <button
            type="button"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-3 h-10 rounded-[8px] text-[13px] font-medium transition-colors cursor-pointer border ${
              showLowStockOnly
                ? 'bg-white border-[#DC2626] text-[#DC2626]'
                : 'bg-white border-[#E5E5E5] text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
          >
            {showLowStockOnly ? 'Showing low stock only' : 'Filter low stock'}
          </button>
        </div>

        {/* Action: Add Product & Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh inventory"
            className="h-10 px-3 border border-[#E5E5E5] hover:border-[#111111] rounded-[8px] text-[13px] text-[#0A0A0A] flex items-center gap-1.5 transition-colors cursor-pointer bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            id="add-product-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="h-10 px-4 bg-[#111111] hover:bg-[#222222] text-white rounded-[8px] text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add product</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="border border-[#E5E5E5] rounded-[12px] overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-[#FAFAFA] text-[#6B6B6B] text-[12px] border-b border-[#E5E5E5]">
              <tr>
                <th className="py-3 px-4 font-medium">Product</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Price</th>
                <th className="py-3 px-4 font-medium">Current stock</th>
                <th className="py-3 px-4 font-medium">Threshold</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B6B6B]">
                    Loading inventory...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B6B6B]">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.current_stock <= 0;
                  const isLowStock = !isOutOfStock && p.current_stock <= p.low_stock_threshold;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[#FAFAFA] transition-colors ${
                        isLowStock || isOutOfStock ? 'bg-red-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-medium text-[#0A0A0A]">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4 text-[#6B6B6B] capitalize text-[13px]">
                        {p.category}
                      </td>
                      <td className="py-3.5 px-4 text-[#0A0A0A] font-medium">
                        ${p.price.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${
                              isOutOfStock
                                ? 'text-[#DC2626]'
                                : isLowStock
                                ? 'text-[#DC2626]'
                                : 'text-[#0A0A0A]'
                            }`}
                          >
                            {p.current_stock}
                          </span>
                          {/* Quick restock +5 button */}
                          <button
                            type="button"
                            onClick={() => handleQuickRestock(p, 5)}
                            title="Quick restock +5"
                            className="text-[11px] px-1.5 py-0.5 border border-[#E5E5E5] hover:border-[#111111] rounded text-[#6B6B6B] hover:text-[#0A0A0A] bg-white cursor-pointer"
                          >
                            +5
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#6B6B6B]">
                        {p.low_stock_threshold}
                      </td>
                      <td className="py-3.5 px-4">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-[#DC2626] text-[#DC2626]">
                            Out of stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-[#DC2626] border border-[#DC2626]/30">
                            Low stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-normal text-[#6B6B6B] border border-[#E5E5E5]">
                            Optimal
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            title="Edit product"
                            className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#E5E5E5]/50 rounded-[6px] transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductToDelete(p)}
                            title="Delete product"
                            className="p-1.5 text-[#6B6B6B] hover:text-[#DC2626] hover:bg-red-50 rounded-[6px] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      <ProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleCreateProduct}
      />

      {/* Edit Product Modal */}
      {editingProduct && (
        <ProductModal
          product={editingProduct}
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          onSave={handleUpdateProduct}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        product={productToDelete}
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteProduct}
      />
    </div>
  );
};
