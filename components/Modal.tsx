
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-2xl sm:max-h-[calc(100vh-3rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4 sm:px-8 sm:py-5">
          <h2 className="pr-4 text-xl font-bold text-white sm:text-2xl">{title || ''}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl font-bold leading-none"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">{children}</div>
      </div>
    </div>
  );
};
