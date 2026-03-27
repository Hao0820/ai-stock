import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'info';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  type = 'info'
}: ConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[9999] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-surface-container-high w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-outline-variant/10 pointer-events-auto relative overflow-hidden"
            >
              {/* Decorative Background Glow */}
              <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl rounded-full opacity-20 ${type === 'danger' ? 'bg-error' : 'bg-primary'}`}></div>
              
              <div className="flex flex-col items-center text-center relative z-10">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-xl ${
                  type === 'danger' 
                    ? 'bg-error/10 text-error border border-error/20' 
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {type === 'danger' ? <AlertTriangle className="w-8 h-8" /> : <div className="w-8 h-8 rounded-full border-4 border-primary"></div>}
                </div>

                <h3 className="font-headline text-2xl font-bold text-on-surface mb-3 leading-tight">{title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-10 opacity-80">
                  {message}
                </p>

                <div className="flex flex-col w-full gap-3">
                  <button
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                    className={`w-full py-4 rounded-2xl font-headline font-bold text-sm shadow-xl transition-all active:scale-95 ${
                      type === 'danger'
                        ? 'bg-error text-on-error shadow-error/20 hover:brightness-110'
                        : 'bg-primary text-on-primary shadow-primary/20 hover:brightness-110'
                    }`}
                  >
                    {confirmLabel || t('common.confirm')}
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-4 rounded-2xl bg-surface-container-low text-on-surface-variant font-headline font-bold text-sm hover:bg-surface-container transition-all active:scale-95"
                  >
                    {cancelLabel || t('common.cancel')}
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-on-surface/5 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
