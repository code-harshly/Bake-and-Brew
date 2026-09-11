import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { api } from '../../api';
import { InventoryTab } from './InventoryTab';
import { ReportsTab } from './ReportsTab';
import { Package, BarChart2, LogOut } from 'lucide-react';

interface OwnerDashboardProps {
  onLogout: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'reports'>('inventory');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await api.getOwnerInventory();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const lowStockCount = products.filter((p) => p.current_stock <= p.low_stock_threshold).length;

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[#E5E5E5] px-4 md:px-8 bg-white sticky top-0 z-30">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#111111] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <div>
              <h1 className="text-[17px] font-medium text-[#0A0A0A] leading-tight">
                Bake &amp; Brew
              </h1>
              <p className="text-[12px] text-[#6B6B6B]">Management Portal (Owner)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-[12px] px-2.5 py-1 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[6px] text-[#0A0A0A]">
              Owner on duty
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
        </div>

        {/* Tab Switcher: Inventory & Reports (strictly NO billing) */}
        <div className="flex gap-2 -mb-px">
          <button
            type="button"
            id="tab-inventory"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-3 text-[14px] font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'inventory'
                ? 'border-[#111111] text-[#0A0A0A]'
                : 'border-transparent text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventory</span>
            {lowStockCount > 0 && (
              <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-red-50 text-[#DC2626] border border-[#DC2626]/40">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-reports"
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-3 text-[14px] font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'reports'
                ? 'border-[#111111] text-[#0A0A0A]'
                : 'border-transparent text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Monthly reports</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {activeTab === 'inventory' ? (
          <InventoryTab
            products={products}
            loading={loading}
            onRefresh={fetchInventory}
          />
        ) : (
          <ReportsTab />
        )}
      </main>
    </div>
  );
};
