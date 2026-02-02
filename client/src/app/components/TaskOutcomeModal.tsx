import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

interface TaskOutcomeModalProps {
  isOpen: boolean;
  taskTitle: string;
  leadName: string;
  onConfirm: (outcome: string, createFollowUp: boolean) => void;
  onCancel: () => void;
}

const TASK_OUTCOMES = [
  {
    id: 'connected_positive',
    label: 'Connected - Positive',
    description: 'Had good conversation, interested',
    icon: '😊',
    color: 'from-green-50 to-emerald-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'connected_neutral',
    label: 'Connected - Neutral',
    description: 'Conversation happened, unclear interest',
    icon: '😐',
    color: 'from-blue-50 to-cyan-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'connected_negative',
    label: 'Connected - Negative',
    description: 'Conversation happened, not interested',
    icon: '😞',
    color: 'from-orange-50 to-amber-50',
    borderColor: 'border-orange-200'
  },
  {
    id: 'no_answer',
    label: 'No Answer',
    description: 'Could not reach customer',
    icon: '📵',
    color: 'from-slate-50 to-zinc-50',
    borderColor: 'border-slate-200'
  },
  {
    id: 'voicemail',
    label: 'Left Voicemail',
    description: 'Left message, awaiting callback',
    icon: '📱',
    color: 'from-purple-50 to-pink-50',
    borderColor: 'border-purple-200'
  },
  {
    id: 'busy',
    label: 'Busy / Call Back',
    description: 'Customer asked to call back later',
    icon: '⏰',
    color: 'from-yellow-50 to-orange-50',
    borderColor: 'border-yellow-200'
  },
  {
    id: 'wrong_number',
    label: 'Wrong Number',
    description: 'Invalid or disconnected number',
    icon: '❌',
    color: 'from-red-50 to-pink-50',
    borderColor: 'border-red-200'
  }
];

// AI suggestions based on outcome
const AI_SUGGESTIONS: { [key: string]: string } = {
  'connected_positive': 'Next step: Send proposal or schedule demo meeting',
  'connected_neutral': 'Next step: Follow up with more information in 2 days',
  'connected_negative': 'Next step: Mark as lost or nurture for future',
  'no_answer': 'Next step: Try again tomorrow at different time',
  'voicemail': 'Next step: Send follow-up email with key info',
  'busy': 'Next step: Schedule callback at agreed time',
  'wrong_number': 'Next step: Verify contact info and update'
};

export const TaskOutcomeModal = ({
  isOpen,
  taskTitle,
  leadName,
  onConfirm,
  onCancel
}: TaskOutcomeModalProps) => {
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [createFollowUp, setCreateFollowUp] = useState(true);

  const handleConfirm = () => {
    if (!selectedOutcome) {
      toast.error('Please select an outcome');
      return;
    }
    onConfirm(selectedOutcome, createFollowUp);
    setSelectedOutcome(null);
    setCreateFollowUp(true);
  };

  const handleCancel = () => {
    setSelectedOutcome(null);
    setCreateFollowUp(true);
    onCancel();
  };

  const suggestion = selectedOutcome ? AI_SUGGESTIONS[selectedOutcome] : null;

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

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center z-[200] p-3 sm:p-4 overflow-y-auto">
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-4xl my-4 sm:my-auto"
          >
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-h-[calc(100vh-32px)] sm:max-h-[85vh] flex flex-col">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-emerald-50 to-cyan-50 px-4 sm:px-8 py-4 sm:py-6 border-b border-emerald-100 flex items-start justify-between">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={20} className="sm:w-6 sm:h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                      Task Completed
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {taskTitle} • {leadName} • What happened?
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X size={18} className="sm:w-5 sm:h-5 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-2 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 flex-1 overflow-y-auto min-h-0">
                <div>
                  <p className="text-slate-600 font-medium mb-6">
                    How did this task go? Your answer helps us recommend the best next action.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {TASK_OUTCOMES.map((outcome) => (
                      <motion.button
                        key={outcome.id}
                        onClick={() => setSelectedOutcome(outcome.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          selectedOutcome === outcome.id
                            ? `border-emerald-500 ${outcome.color} bg-gradient-to-br`
                            : `border-slate-200 bg-slate-50 hover:border-emerald-300`
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl flex-shrink-0">{outcome.icon}</span>
                          <div className="flex-1">
                            <p className="font-bold text-slate-900">
                              {outcome.label}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              {outcome.description}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* AI Suggestion */}
                {suggestion && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Lightbulb size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-blue-900 text-sm">
                          💡 AI Recommendation
                        </p>
                        <p className="text-blue-800 text-sm mt-1">{suggestion}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Follow-up Option */}
                <div className="border-t border-slate-200 pt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createFollowUp}
                      onChange={(e) => setCreateFollowUp(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-emerald-600"
                    />
                    <span className="font-medium text-slate-700">
                      Create automatic follow-up task
                    </span>
                  </label>
                  {createFollowUp && (
                    <p className="text-xs text-slate-500 mt-2 ml-8">
                      ✓ We'll create a suggested follow-up task based on this outcome
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-slate-50 px-4 sm:px-8 py-3 sm:py-4 border-t border-slate-200 flex gap-2 sm:gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg border border-slate-300 text-sm sm:text-base text-slate-700 font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedOutcome}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-bold text-white text-sm sm:text-base transition-all ${
                    selectedOutcome
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-400 cursor-not-allowed'
                  }`}
                >
                  Confirm & Continue
                </button>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
