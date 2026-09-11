import React, { useState } from 'react';
import { Product } from '../../types';
import { X } from 'lucide-react';

interface ProductModalProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    category: string;
    price: number;
    current_stock: number;
    low_stock_threshold: number;
  }) => Promise<void>;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(product);
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || 'coffee');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [currentStock, setCurrentStock] = useState(product ? String(product.current_stock) : '');
  const [threshold, setThreshold] = useState(product ? String(product.low_stock_threshold) : '10');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Please enter a valid non-negative price.');
      return;
    }
    const numStock = parseInt(currentStock, 10);
    if (isNaN(numStock) || numStock < 0) {
      setError('Please enter a valid stock quantity.');
      return;
    }
    const numThreshold = parseInt(threshold, 10);
    if (isNaN(numThreshold) || numThreshold < 0) {
      setError('Please enter a valid low stock threshold.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await onSave({
        name: name.trim(),
        category: category.trim().toLowerCase(),
        price: numPrice,
        current_stock: numStock,
        low_stock_threshold: numThreshold,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-[420px] bg-white border border-[#E5E5E5] rounded-[12px] p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5]">
          <h2 className="text-[17px] font-medium text-[#0A0A0A]">
            {isEditing ? 'Edit product' : 'Add new product'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6B6B6B] hover:text-[#0A0A0A] p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <p className="text-[13px] text-[#DC2626] font-normal" role="alert">
              {error}
            </p>
          )}

          <div>
            <label className="block text-[13px] text-[#0A0A0A] font-medium mb-1.5">
              Product name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vanilla Bean Latte"
              className="w-full h-10 px-3 bg-white border border-[#E5E5E5] rounded-[8px] text-[14px] text-[#0A0A0A] placeholder-[#6B6B6B] focus:outline-none focus:border-[#111111]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-[#0A0A0A] font-medium mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-2.5 bg-white border border-[#E5E5E5] rounded-[8px] text-[14px] text-[#0A0A0A] focus:outline-none focus:border-[#111111]"
              >
                <option value="coffee">Coffee</option>
                <option value="bakery">Bakery</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] text-[#0A0A0A] font-medium mb-1.5">
                Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="4.50"
                className="w-full h-10 px-3 bg-white border border-[#E5E5E5] rounded-[8px] text-[14px] text-[#0A0A0A] focus:outline-none focus:border-[#111111]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-[#0A0A0A] font-medium mb-1.5">
                Current stock
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                placeholder="25"
                className="w-full h-10 px-3 bg-white border border-[#E5E5E5] rounded-[8px] text-[14px] text-[#0A0A0A] focus:outline-none focus:border-[#111111]"
              />
            </div>

            <div>
              <label className="block text-[13px] text-[#0A0A0A] font-medium mb-1.5">
                Low stock alert at
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="10"
                className="w-full h-10 px-3 bg-white border border-[#E5E5E5] rounded-[8px] text-[14px] text-[#0A0A0A] focus:outline-none focus:border-[#111111]"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 bg-white border border-[#E5E5E5] text-[#0A0A0A] hover:bg-[#FAFAFA] rounded-[8px] text-[14px] font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-10 bg-[#111111] hover:bg-[#222222] text-white rounded-[8px] text-[14px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving...' : isEditing ? 'Save changes' : 'Add product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
