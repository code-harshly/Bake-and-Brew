import React from 'react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Sale',
  description = 'Are you sure you want to permanently delete this sale? This action cannot be undone.',
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-30 backdrop-blur-sm z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h2 className="text-lg font-semibold mb-4 text-[#0A0A0A]">{title}</h2>
        <p className="text-sm text-[#6B6B6B] mb-6">{description}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#E5E5E5] text-[#0A0A0A] rounded-md hover:bg-[#D0D0D0] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[#FF4D4F] text-white rounded-md hover:bg-[#E04445] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
