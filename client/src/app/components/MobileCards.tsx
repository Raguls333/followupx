import { motion, type PanInfo } from 'framer-motion';
import { Phone, Mail, MapPin, Check, Edit2 } from 'lucide-react';
import { useState } from 'react';

interface MobileLeadCardProps {
  lead: any;
  onAction: (action: 'call' | 'message' | 'edit' | 'delete' | 'status') => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const MobileLeadCard = ({ 
  lead, 
  onAction, 
  onSwipeLeft, 
  onSwipeRight 
}: MobileLeadCardProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const swipeThreshold = 50;
    
    if (info.offset.x > swipeThreshold && onSwipeRight) {
      onSwipeRight();
    } else if (info.offset.x < -swipeThreshold && onSwipeLeft) {
      onSwipeLeft();
    }
    
    setSwipeOffset(0);
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    qualified: 'bg-purple-100 text-purple-700',
    proposal: 'bg-indigo-100 text-indigo-700',
    negotiation: 'bg-orange-100 text-orange-700',
    won: 'bg-green-100 text-green-700',
    lost: 'bg-red-100 text-red-700'
  };

  return (
    <motion.div
      drag="x"
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      onDrag={(_event, info) => setSwipeOffset(info.offset.x)}
      className="bg-white border border-slate-200 rounded-lg p-4 mb-3 cursor-grab active:cursor-grabbing"
      style={{
        opacity: 1 - Math.abs(swipeOffset) / 500
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-900">{lead.name}</h3>
          {lead.company && (
            <p className="text-xs text-slate-600 mt-0.5">{lead.company}</p>
          )}
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded ${statusColors[lead.status as string] || 'bg-slate-100 text-slate-700'}`}>
          {lead.status}
        </span>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        {lead.phone && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Phone size={16} className="text-slate-400" />
            <span>{lead.phone}</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Mail size={16} className="text-slate-400" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.location && (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <MapPin size={16} className="text-slate-400" />
            <span>{lead.location}</span>
          </div>
        )}
      </div>

      {/* Value */}
      {lead.value && (
        <div className="text-sm font-bold text-blue-600 mb-3">
          ₹ {lead.value.toLocaleString('en-IN')}
        </div>
      )}

      {/* Action Buttons - Touch Friendly (48px min) */}
      <div className="grid grid-cols-3 gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction('call')}
          className="flex items-center justify-center gap-1 bg-blue-50 text-blue-600 py-2.5 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors"
        >
          <Phone size={18} />
          <span className="hidden sm:inline">Call</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction('message')}
          className="flex items-center justify-center gap-1 bg-green-50 text-green-600 py-2.5 rounded-lg font-bold text-xs hover:bg-green-100 transition-colors"
        >
          <Mail size={18} />
          <span className="hidden sm:inline">Msg</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction('edit')}
          className="flex items-center justify-center gap-1 bg-slate-50 text-slate-600 py-2.5 rounded-lg font-bold text-xs hover:bg-slate-100 transition-colors"
        >
          <Edit2 size={18} />
          <span className="hidden sm:inline">Edit</span>
        </motion.button>
      </div>

      {/* Swipe Hint */}
      <div className="text-xs text-slate-500 text-center mt-2">
        💡 Swipe for more actions
      </div>
    </motion.div>
  );
};

// Mobile Task Card
interface MobileTaskCardProps {
  task: any;
  onAction: (action: 'complete' | 'edit' | 'delete' | 'reschedule') => void;
  onSwipeComplete?: () => void;
}

export const MobileTaskCard = ({ 
  task, 
  onAction,
  onSwipeComplete 
}: MobileTaskCardProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const swipeThreshold = 50;
    
    if (info.offset.x > swipeThreshold && onSwipeComplete) {
      onSwipeComplete();
    }
    
    setSwipeOffset(0);
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
    urgent: 'bg-red-200 text-red-800'
  };

  const isOverdue = new Date(task.dueDate) < new Date();
  const isToday = new Date(task.dueDate).toDateString() === new Date().toDateString();

  return (
    <motion.div
      drag="x"
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      onDrag={(_event, info) => setSwipeOffset(info.offset.x)}
      className={`border rounded-lg p-4 mb-3 cursor-grab active:cursor-grabbing ${
        isOverdue ? 'bg-red-50 border-red-200' : isToday ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-slate-200'
      }`}
      style={{
        opacity: 1 - Math.abs(swipeOffset) / 500
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-bold text-slate-900">{task.title}</h3>
          {task.leadName && (
            <p className="text-xs text-slate-600 mt-0.5">→ {task.leadName}</p>
          )}
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded ${priorityColors[task.priority as string] || 'bg-slate-100'}`}>
          {task.priority}
        </span>
      </div>

      {/* Due Date */}
      <div className="text-xs text-slate-600 mb-3">
        📅 {new Date(task.dueDate).toLocaleDateString('en-IN', { 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
        {isOverdue && <span className="text-red-600 ml-2">⚠️ Overdue</span>}
        {isToday && <span className="text-yellow-600 ml-2">⭐ Today</span>}
      </div>

      {/* Task Type */}
      {task.type && (
        <div className="text-sm text-slate-700 mb-3">
          <span className="inline-block bg-slate-100 px-2 py-1 rounded text-xs font-medium">
            {task.type}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction('complete')}
          className="flex-1 flex items-center justify-center gap-1 bg-green-50 text-green-600 py-2.5 rounded-lg font-bold text-sm hover:bg-green-100 transition-colors"
        >
          <Check size={18} />
          Complete
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction('edit')}
          className="flex items-center justify-center gap-1 bg-slate-50 text-slate-600 py-2.5 px-3 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors"
        >
          <Edit2 size={18} />
        </motion.button>
      </div>

      {/* Swipe Hint */}
      <div className="text-xs text-slate-500 text-center mt-2">
        👉 Swipe right to complete
      </div>
    </motion.div>
  );
};
