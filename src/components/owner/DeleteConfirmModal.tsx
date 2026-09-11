import React from 'react';
import { Product } from '../../types';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !product) return null;

  const [deleting, setDeleting] = React.useState(false);

  const handleConfirm = async () => {
    try {
      setDeleting(true);
      await onConfirm();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-[380px] bg-white border border-[#E5E5E5] rounded-[12px] p-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2 text-[#DC2626]">
            <AlertTriangle className="w-4 h-4" />
            <h2 className="text-[16px] font-medium text-[#0A0A0A]">Delete product</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6B6B6B] hover:text-[#0A0A0A] p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[14px] text-[#6B6B6B] mt-4">
          Are you sure you want to remove{' '}
          <strong className="text-[#0A0A0A] font-medium">"{product.name}"</strong> from the café menu?
          This action cannot be undone.
        </p>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 h-10 bg-white border border-[#E5E5E5] text-[#0A0A0A] hover:bg-[#FAFAFA] rounded-[8px] text-[14px] font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 h-10 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-[8px] text-[14px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
