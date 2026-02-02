import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

interface LostLeadModalProps {
  isOpen: boolean;
  leadName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const LOSS_REASONS = [
  {
    id: 'price',
    label: 'Price too high',
    description: 'Customer chose competitor with better pricing',
    icon: '💰'
  },
  {
    id: 'competitor',
    label: 'Lost to competitor',
    description: 'Competitor won the deal',
    icon: '🏆'
  },
  {
    id: 'no_interest',
    label: 'No longer interested',
    description: 'Customer lost interest in solution',
    icon: '😐'
  },
  {
    id: 'unresponsive',
    label: 'Lead unresponsive',
    description: 'Customer stopped responding',
    icon: '📵'
  },
  {
    id: 'timing',
    label: 'Wrong timing',
    description: 'Not the right time for purchase',
    icon: '⏰'
  },
  {
    id: 'wrong_fit',
    label: 'Wrong fit',
    description: 'Solution not suitable for their needs',
    icon: '❌'
  },
  {
    id: 'budget',
    label: 'Budget constraints',
    description: 'Budget got cut or reallocated',
    icon: '💸'
  },
  {
    id: 'other',
    label: 'Other reason',
    description: 'Different reason',
    icon: '❓'
  }
];

export const LostLeadModal = ({
  isOpen,
  leadName,
  onConfirm,
  onCancel
}: LostLeadModalProps) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selectedReason) {
      toast.error('Please select a reason');
      return;
    }
    onConfirm(selectedReason);
    setSelectedReason(null);
  };

  const handleCancel = () => {
    setSelectedReason(null);
    onCancel();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[200]"
          >
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-[90vw] max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-red-50 to-orange-50 px-8 py-6 border-b border-red-100 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={24} className="text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Mark Lead as Lost
                    </h2>
                    <p className="text-slate-600 mt-1">
                      {leadName} • Why did this deal fall through?
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8">
                <p className="text-slate-600 mb-6 font-medium">
                  Please select the reason why this lead was lost. This helps us understand
                  where deals fall through and improve our strategy.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {LOSS_REASONS.map((reason) => (
                    <motion.button
                      key={reason.id}
                      onClick={() => setSelectedReason(reason.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedReason === reason.id
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-200 bg-slate-50 hover:border-red-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">{reason.icon}</span>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{reason.label}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {reason.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-slate-50 px-8 py-4 border-t border-slate-200 flex gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedReason}
                  className={`px-6 py-2.5 rounded-lg font-bold text-white transition-all ${
                    selectedReason
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-slate-400 cursor-not-allowed'
                  }`}
                >
                  Mark as Lost
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
