import React from 'react';
import { Sale } from '../../types';
import { Printer, CheckCircle, ArrowLeft } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(sale.timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-[420px] bg-white border border-[#E5E5E5] rounded-[12px] p-6 shadow-none my-8">
        {/* Screen Header (hidden when printed) */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E5] no-print">
          <div className="flex items-center gap-2 text-[#0A0A0A]">
            <CheckCircle className="w-5 h-5 text-[#0A0A0A]" />
            <span className="font-medium text-[16px]">Sale completed</span>
          </div>
          <button
            onClick={onClose}
            className="text-[13px] text-[#6B6B6B] hover:text-[#0A0A0A] cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Printable Receipt Area */}
        <div id="printable-receipt" className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] p-5 font-mono text-[13px]">
          <div className="text-center pb-4 border-b border-dashed border-[#D0D0D0]">
            <div className="w-4 h-4 rounded-full bg-[#111111] mx-auto mb-2" />
            <h2 className="text-[16px] font-medium text-[#0A0A0A] uppercase tracking-wider font-sans">
              Bake &amp; Brew
            </h2>
            <p className="text-[#6B6B6B] text-[11px] font-sans mt-0.5">Artisan Café &amp; Bakery</p>
            <p className="text-[#6B6B6B] text-[11px] mt-2">Receipt #{sale.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-[#6B6B6B] text-[11px]">{formattedDate}</p>
          </div>

          {/* Line Items */}
          <div className="py-4 border-b border-dashed border-[#D0D0D0] space-y-2">
            <div className="flex justify-between text-[11px] text-[#6B6B6B] uppercase pb-1">
              <span>Item</span>
              <span>Qty x Price</span>
              <span>Total</span>
            </div>
            {sale.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start text-[#0A0A0A]">
                <div className="max-w-[170px] truncate pr-1">
                  <span>{item.product_name}</span>
                </div>
                <div className="text-[#6B6B6B] text-[12px] whitespace-nowrap">
                  {item.quantity} × ${item.price_at_sale.toFixed(2)}
                </div>
                <div className="font-medium whitespace-nowrap">
                  ${(item.quantity * item.price_at_sale).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Total & Payment Method */}
          <div className="pt-4 space-y-2">
            <div className="flex justify-between text-[15px] font-medium text-[#0A0A0A]">
              <span>Grand total</span>
              <span>${sale.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[12px] text-[#6B6B6B]">
              <span>Payment method</span>
              <span className="uppercase font-medium text-[#0A0A0A]">{sale.payment_method}</span>
            </div>
          </div>

          <div className="text-center pt-6 text-[11px] text-[#6B6B6B] font-sans">
            <p>Thank you for stopping by Bake &amp; Brew!</p>
          </div>
        </div>

        {/* Modal Action Controls (hidden when printing) */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 h-11 flex items-center justify-center gap-2 bg-white border border-[#111111] text-[#0A0A0A] rounded-[8px] text-[14px] font-medium hover:bg-[#F5F5F5] transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print receipt</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 flex items-center justify-center gap-2 bg-[#111111] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#222222] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>New sale</span>
          </button>
        </div>
      </div>
    </div>
  );
};
