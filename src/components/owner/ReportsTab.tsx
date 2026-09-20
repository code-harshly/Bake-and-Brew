import React, { useState, useEffect } from 'react';
import { MonthlyReport } from '../../types';
import { api } from '../../api';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { Sale } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Receipt,
  TrendingUp,
  CreditCard,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const ReportsTab: React.FC = () => {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1); // 1-12
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  const fetchReport = async (year: number, month: number) => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getOwnerReports(year, month);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Monochrome colors for charts
  const PIE_COLORS = ['#111111', '#6B6B6B', '#CCCCCC'];

  return (
    <div className="space-y-6">
      {/* Month Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[12px] p-4">
        <div>
          <span className="text-[12px] text-[#6B6B6B] block">Selected billing period</span>
          <h2 className="text-[18px] font-medium text-[#0A0A0A]">{monthName}</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="h-9 px-3 border border-[#E5E5E5] bg-white rounded-[8px] text-[13px] text-[#0A0A0A] hover:border-[#111111] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentYear(now.getFullYear());
              setCurrentMonth(now.getMonth() + 1);
            }}
            className="h-9 px-3 border border-[#E5E5E5] bg-white rounded-[8px] text-[13px] text-[#0A0A0A] hover:border-[#111111] transition-colors cursor-pointer"
          >
            Current month
          </button>

          <button
            type="button"
            onClick={handleNextMonth}
            className="h-9 px-3 border border-[#E5E5E5] bg-white rounded-[8px] text-[13px] text-[#0A0A0A] hover:border-[#111111] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => fetchReport(currentYear, currentMonth)}
            title="Refresh statistics"
            className="w-9 h-9 border border-[#E5E5E5] bg-white rounded-[8px] text-[#6B6B6B] hover:text-[#0A0A0A] hover:border-[#111111] flex items-center justify-center cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-white border border-[#DC2626] rounded-[8px] flex items-center gap-2 text-[13px] text-[#DC2626]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[12px]">
          <div className="flex items-center justify-between text-[#6B6B6B] mb-2">
            <span className="text-[13px]">Total revenue</span>
            <IndianRupee className="w-4 h-4 text-[#0A0A0A]" />
          </div>
          <div className="text-[24px] font-medium text-[#0A0A0A]">
            ₹{report ? report.totalRevenue.toFixed(2) : '0.00'}
          </div>
          <p className="text-[12px] text-[#6B6B6B] mt-1">Gross sales for {monthName}</p>
        </div>

        <div className="p-5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[12px]">
          <div className="flex items-center justify-between text-[#6B6B6B] mb-2">
            <span className="text-[13px]">Transactions</span>
            <Receipt className="w-4 h-4 text-[#0A0A0A]" />
          </div>
          <div className="text-[24px] font-medium text-[#0A0A0A]">
            {report ? report.transactionCount : 0}
          </div>
          <p className="text-[12px] text-[#6B6B6B] mt-1">Completed orders</p>
        </div>

        <div className="p-5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[12px]">
          <div className="flex items-center justify-between text-[#6B6B6B] mb-2">
            <span className="text-[13px]">Average order value</span>
            <TrendingUp className="w-4 h-4 text-[#0A0A0A]" />
          </div>
          <div className="text-[24px] font-medium text-[#0A0A0A]">
            ₹{report ? report.averageOrderValue.toFixed(2) : '0.00'}
          </div>
          <p className="text-[12px] text-[#6B6B6B] mt-1">Revenue per checkout</p>
        </div>

        <div className="p-5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[12px]">
          <div className="flex items-center justify-between text-[#6B6B6B] mb-2">
            <span className="text-[13px]">UPI volume</span>
            <CreditCard className="w-4 h-4 text-[#0A0A0A]" />
          </div>
          <div className="text-[24px] font-medium text-[#0A0A0A]">
            ₹{report?.paymentBreakdown?.upi ? report.paymentBreakdown.upi.revenue.toFixed(2) : '0.00'}
          </div>
          <p className="text-[12px] text-[#6B6B6B] mt-1">
            {report?.paymentBreakdown?.upi ? report.paymentBreakdown.upi.count : 0} transactions
          </p>
        </div>
      </div>

      {/* Visual Charts Grid (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Revenue Bar Chart */}
        <div className="lg:col-span-2 p-5 bg-white border border-[#E5E5E5] rounded-[12px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-medium text-[#0A0A0A]">Daily revenue</h3>
              <p className="text-[12px] text-[#6B6B6B]">Sales trajectory throughout the month</p>
            </div>
          </div>

          <div className="h-[260px] w-full">
            {report && report.dailyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="dayNumber"
                    stroke="#6B6B6B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E5E5' }}
                  />
                  <YAxis
                    stroke="#6B6B6B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E5E5' }}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    cursor={{ fill: '#FAFAFA' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-[#E5E5E5] p-2.5 rounded-[8px] text-[12px]">
                            <p className="font-medium text-[#0A0A0A]">{data.day}</p>
                            <p className="text-[#6B6B6B] mt-0.5">
                              Revenue: <span className="font-medium text-[#0A0A0A]">₹{data.revenue.toFixed(2)}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" fill="#111111" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#6B6B6B] text-[13px]">
                No transaction data for this period
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="p-5 bg-white border border-[#E5E5E5] rounded-[12px] flex flex-col justify-between">
          <div>
            <h3 className="text-[15px] font-medium text-[#0A0A0A]">Payment methods</h3>
            <p className="text-[12px] text-[#6B6B6B]">Share of revenue by payment mode</p>
          </div>

          <div className="h-[180px] w-full my-2">
            {report && report.totalRevenue > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={report.paymentChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {report.paymentChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-[#E5E5E5] p-2 rounded-[8px] text-[12px]">
                            <p className="font-medium text-[#0A0A0A]">{data.name}</p>
                            <p className="text-[#6B6B6B]">
                              ₹{data.value.toFixed(2)} ({data.count} txns)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#6B6B6B] text-[13px]">
                No payments recorded
              </div>
            )}
          </div>

          {/* Legend Table */}
          <div className="space-y-2 pt-2 border-t border-[#E5E5E5]">
            {report?.paymentChart.map((p, idx) => (
              <div key={p.name} className="flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-[#0A0A0A] font-medium">{p.name}</span>
                  <span className="text-[11px] text-[#6B6B6B]">({p.count} txns)</span>
                </div>
                <span className="font-medium text-[#0A0A0A]">₹{p.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Best-Selling Products Table */}
      <div className="border border-[#E5E5E5] rounded-[12px] bg-white overflow-hidden">
        <div className="p-4 bg-[#FAFAFA] border-b border-[#E5E5E5]">
          <h3 className="text-[15px] font-medium text-[#0A0A0A]">
            Best-selling products
          </h3>
          <p className="text-[12px] text-[#6B6B6B]">
            Ranked by quantity sold during {monthName}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-white text-[#6B6B6B] text-[12px] border-b border-[#E5E5E5]">
              <tr>
                <th className="py-3 px-4 font-medium w-16">Rank</th>
                <th className="py-3 px-4 font-medium">Product name</th>
                <th className="py-3 px-4 font-medium text-right">Units sold</th>
                <th className="py-3 px-4 font-medium text-right">Total revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {!report || report.bestSellers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-[#6B6B6B]">
                    No sales recorded for this month yet.
                  </td>
                </tr>
              ) : (
                report.bestSellers.map((item, index) => (
                  <tr key={item.name} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#6B6B6B]">
                      #{index + 1}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#0A0A0A]">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-[#0A0A0A]">
                      {item.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-[#0A0A0A]">
                      ₹{item.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      <RecentSalesSection report={report} onDelete={(id) => {}} />
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={async () => {
            if (saleToDelete) {
              await api.deleteSale(saleToDelete.id);
              setShowDeleteModal(false);
              setSaleToDelete(null);
              fetchReport(currentYear, currentMonth);
            }
          }}
        />
        </div>
    </div>
  );
};

// Recent Sales Section Component (inside ReportsTab)
const RecentSalesSection: React.FC<{ report: MonthlyReport | null; onDelete: (id: string) => void; }> = ({ report, onDelete }) => {
  if (!report || !report.recentSales || report.recentSales.length === 0) return null;
  return (
    <div className="mt-6 border border-[#E5E5E5] rounded-[12px] bg-white overflow-hidden">
      <div className="p-4 bg-[#FAFAFA] border-b border-[#E5E5E5]">
        <h3 className="text-[15px] font-medium text-[#0A0A0A]">Recent Sales (max 100)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[14px]">
          <thead className="bg-white text-[#6B6B6B] text-[12px] border-b border-[#E5E5E5]">
            <tr>
              <th className="py-3 px-4 font-medium">Date</th>
              <th className="py-3 px-4 font-medium">Customer</th>
              <th className="py-3 px-4 font-medium">Amount</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {report.recentSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-[#FAFAFA] transition-colors">
                <td className="py-3.5 px-4 text-[#6B6B6B]">{new Date(sale.timestamp).toLocaleDateString()}</td>
                <td className="py-3.5 px-4 text-[#0A0A0A]">{sale.customer_name}</td>
                <td className="py-3.5 px-4 text-[#0A0A0A]">₹{sale.total_amount.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => {
                      setSaleToDelete(sale);
                      setShowDeleteModal(true);
                    }}
                    className="px-3 py-1 bg-[#FF4D4F] text-white rounded-md hover:bg-[#E04445] transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};




