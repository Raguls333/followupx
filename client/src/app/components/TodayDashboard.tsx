import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Clock, Zap, MessageCircle, Phone, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Task {
  _id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'completed';
  leadId: string;
  value?: number;
  time?: string;
  completedAt?: string;
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
}

interface Lead {
  _id: string;
  name: string;
  company?: string;
  value?: number;
  phone?: string;
  email?: string;
}

interface TodayDashboardProps {
  leads: Lead[];
  tasks: Task[];
  onTaskComplete: (taskId: string) => void;
  onWhatsAppClick: (lead: Lead) => void;
  onCompleteWithOutcome?: (taskId: string, outcome: string) => void;
  onTaskNavigate?: (task: Task) => void;
}

export const TodayDashboard = ({
  leads,
  tasks,
  onTaskComplete: _onTaskComplete,
  onWhatsAppClick: _onWhatsAppClick,
  onCompleteWithOutcome: _onCompleteWithOutcome,
  onTaskNavigate: _onTaskNavigate
}: TodayDashboardProps) => {
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [showCompletedSection, setShowCompletedSection] = useState(false);
  const [_taskIdBeingCompleted, _setTaskIdBeingCompleted] = useState<string | null>(null);
  const [_completionOutcome, _setCompletionOutcome] = useState('');

  // Quick WhatsApp handler with minimal friction
  const handleQuickWhatsApp = useCallback(async (lead: Lead, task: Task) => {
    if (!lead.phone) {
      toast.error('No phone number for this lead');
      return;
    }

    // Generate WhatsApp link
    const encodedMessage = encodeURIComponent(
      `Hi ${lead.name}, following up on ${task.title.toLowerCase()}`
    );
    const whatsappLink = `https://wa.me/${lead.phone}?text=${encodedMessage}`;

    // Open in new tab
    window.open(whatsappLink, '_blank');

    // Log the activity
    try {
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('followupx_token')}` },
        body: JSON.stringify({
          leadId: lead._id,
          type: 'whatsapp_sent',
          description: `Sent WhatsApp for: ${task.title}`,
          taskId: task._id
        })
      });
    } catch (err) {
      console.error('Failed to log activity:', err);
    }

    // Show completion prompt after brief delay
    setTimeout(() => {
      toast('Mark task as complete?', {
        action: {
          label: 'Yes, Complete',
          onClick: () => {
            _setTaskIdBeingCompleted(task._id);
            _setCompletionOutcome('connected_positive');
          }
        },
        duration: 5000
      });
    }, 2000);
  }, []);

  useEffect(() => {
    const today = new Date().toDateString();

    // Filter overdue tasks
    const overdue = tasks
      .filter(
        (t) =>
          new Date(t.dueDate).toDateString() < today && t.status === 'pending'
      )
      .sort(
        (a, b) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

    // Filter today's tasks
    const todaysTasks = tasks
      .filter(
        (t) =>
          new Date(t.dueDate).toDateString() === today && t.status === 'pending'
      )
      .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

    // Filter completed (last 5)
    const completed = tasks
      .filter((t) => t.status === 'completed')
      .slice(0, 5)
      .sort(
        (a, b) =>
          new Date(b.completedAt || 0).getTime() -
          new Date(a.completedAt || 0).getTime()
      );

    setOverdueTasks(overdue);
    setTodayTasks(todaysTasks);
    setCompletedTasks(completed);
  }, [tasks]);

  const TaskCard = ({
    task,
    lead,
    isOverdue,
    isCompleted,
    showActions = true
  }: {
    task: Task;
    lead?: Lead;
    isOverdue?: boolean;
    isCompleted?: boolean;
    showActions?: boolean;
  }) => {
    const getOverdueText = () => {
      if (!isOverdue) return '';
      const days = Math.floor(
        (new Date().getTime() - new Date(task.dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return `⚠️ Overdue by ${days} day${days !== 1 ? 's' : ''}`;
    };

    const getPriorityColor = () => {
      switch (task.priority) {
        case 'high': return 'bg-red-100 border-red-300';
        case 'medium': return 'bg-yellow-100 border-yellow-300';
        case 'low': return 'bg-blue-100 border-blue-300';
        default: return 'bg-slate-100 border-slate-300';
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`p-4 rounded-lg border-2 mb-3 transition-all cursor-pointer ${
          isOverdue
            ? 'bg-red-50 border-red-300 shadow-md'
            : isCompleted
              ? 'bg-green-50 border-green-300'
              : getPriorityColor()
        }`}
        onClick={() => _onTaskNavigate?.(task)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isCompleted && <CheckCircle size={20} className="text-green-600" />}
              {isOverdue && <AlertCircle size={20} className="text-red-600" />}
              <p className={`font-bold text-lg ${
                isOverdue ? 'text-red-900' : isCompleted ? 'text-green-900' : 'text-slate-900'
              }`}>
                {isCompleted && '✓ '} {task.title}
              </p>
            </div>
            {lead && (
              <>
                <p className="text-sm text-slate-700 mt-2 font-semibold">
                  {lead.name}
                  {lead.company && ` • ${lead.company}`}
                </p>
                {task.value && (
                  <p className="text-xs text-slate-600 mt-1">
                    💰 Est. Value: ₹{task.value.toLocaleString()}
                  </p>
                )}
              </>
            )}
            {task.notes && (
              <p className="text-sm text-slate-700 mt-2 italic">
                📝 {task.notes}
              </p>
            )}
            {isOverdue && (
              <p className="text-sm text-red-700 font-semibold mt-2">{getOverdueText()}</p>
            )}
          </div>
        </div>

        {!isCompleted && showActions && (
          <div className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); lead && handleQuickWhatsApp(lead, task); }}
              className="flex-1 min-w-[140px] bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold py-2.5 px-3 rounded-lg text-sm transition-all shadow-sm"
              title="Send WhatsApp (auto opens)"
            >
              <MessageCircle size={16} className="inline mr-1" /> WhatsApp
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (lead?.phone) {
                  window.open(`tel:${lead.phone}`);
                } else {
                  toast.error('No phone number');
                }
              }}
              className="flex-1 min-w-[100px] bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold py-2.5 px-3 rounded-lg text-sm transition-all shadow-sm"
              title="Call lead"
            >
              <Phone size={16} className="inline mr-1" /> Call
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                _setTaskIdBeingCompleted(task._id);
              }}
              className="flex-1 min-w-[100px] bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-2.5 px-3 rounded-lg text-sm transition-all shadow-sm"
              title="Mark task as complete"
            >
              <Zap size={16} className="inline mr-1" /> Complete
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  const hasAnyTasks =
    overdueTasks.length > 0 || todayTasks.length > 0 || completedTasks.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 pb-20">
      {/* STATS BAR */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500 text-white p-4 rounded-lg shadow-lg"
        >
          <p className="text-3xl font-bold">{overdueTasks.length}</p>
          <p className="text-sm opacity-90">Overdue</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-yellow-500 text-white p-4 rounded-lg shadow-lg"
        >
          <p className="text-3xl font-bold">{todayTasks.length}</p>
          <p className="text-sm opacity-90">Today</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-green-500 text-white p-4 rounded-lg shadow-lg"
        >
          <p className="text-3xl font-bold">{completedTasks.length}</p>
          <p className="text-sm opacity-90">Completed</p>
        </motion.div>
      </div>

      {/* OVERDUE SECTION */}
      {overdueTasks.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-red-600">
              🔴 Overdue <span className="text-sm text-red-500">({overdueTasks.length})</span>
            </h2>
          </div>
          {overdueTasks.map((task) => {
            const lead = leads.find((l) => l._id === task.leadId);
            return (
              <TaskCard
                key={task._id}
                task={task}
                lead={lead}
                isOverdue={true}
              />
            );
          })}
        </section>
      )}

      {/* TODAY SECTION */}
      {todayTasks.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock size={24} className="text-yellow-600" />
            </div>
            <h2 className="text-3xl font-bold text-yellow-600">
              📅 Due Today <span className="text-sm text-yellow-500">({todayTasks.length})</span>
            </h2>
          </div>
          {todayTasks.map((task) => {
            const lead = leads.find((l) => l._id === task.leadId);
            return (
              <TaskCard key={task._id} task={task} lead={lead} />
            );
          })}
        </section>
      )}

      {/* COMPLETED SECTION */}
      {completedTasks.length > 0 && (
        <section className="mb-8">
          <button
            onClick={() => setShowCompletedSection(!showCompletedSection)}
            className="flex items-center gap-3 mb-4 w-full p-3 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div className="flex-1 text-left">
              <h2 className="text-2xl font-bold text-green-600">
                ✅ Recently Completed <span className="text-sm text-green-500">({completedTasks.length})</span>
              </h2>
            </div>
            <ChevronDown
              size={20}
              className={`text-slate-400 transition-transform ${showCompletedSection ? 'rotate-180' : ''}`}
            />
          </button>
          {showCompletedSection && (
            <>
              {completedTasks.map((task) => {
                const lead = leads.find((l) => l._id === task.leadId);
                return (
                  <TaskCard
                    key={task._id}
                    task={task}
                    lead={lead}
                    isCompleted={true}
                    showActions={false}
                  />
                );
              })}
            </>
          )}
        </section>
      )}

      {/* EMPTY STATE */}
      {!hasAnyTasks && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <p className="text-slate-600 text-2xl font-bold">
            No tasks today! 🎉
          </p>
          <p className="text-slate-400 text-base mt-2">
            You're all caught up. Great job staying on top of things!
          </p>
        </motion.div>
      )}
    </div>
  );
};
