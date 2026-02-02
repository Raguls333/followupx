import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, MessageSquare, Calendar, Phone, Mail, Trash2 } from 'lucide-react';
import { useScheduledMessages } from '../hooks/useScheduledMessages';
import { toast } from 'sonner';

interface ScheduledMessagesModuleProps {
  // Module props for future extensibility
}

export const ScheduledMessagesModule: React.FC<ScheduledMessagesModuleProps> = () => {
  const {
    upcomingMessages,
    stats,
    loading,
    error,
    fetchUpcomingMessages,
    fetchStats,
    cancelMessage,
  } = useScheduledMessages({
    autoFetchUpcoming: true,
    autoFetchStats: true,
  });

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchUpcomingMessages();
    fetchStats();
  }, []);

  const handleCancel = async (id: string) => {
    try {
      await cancelMessage(id);
      toast.success('Message cancelled successfully');
      await fetchUpcomingMessages();
      await fetchStats();
    } catch (err) {
      toast.error('Failed to cancel message');
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <MessageSquare size={16} className="text-emerald-500" />;
      case 'email':
        return <Mail size={16} className="text-blue-500" />;
      case 'call':
        return <Phone size={16} className="text-purple-500" />;
      case 'sms':
        return <MessageSquare size={16} className="text-orange-500" />;
      default:
        return <MessageSquare size={16} className="text-slate-500" />;
    }
  };

  const getMessageTypeBg = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return 'bg-emerald-50';
      case 'email':
        return 'bg-blue-50';
      case 'call':
        return 'bg-purple-50';
      case 'sms':
        return 'bg-orange-50';
      default:
        return 'bg-slate-50';
    }
  };

  const formatTime = (date: string | Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = messageDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 0) return 'Past';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl flex items-center justify-center border border-slate-100">
              <Clock size={24} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Scheduled Messages</h3>
              <p className="text-sm text-slate-500 font-medium">
                {upcomingMessages?.length || 0} pending in next 7 days
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsed View - Stats Only */}
      {!isExpanded && (
        <div className="px-6 md:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl border border-indigo-200/30">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Pending</p>
              <p className="text-2xl font-bold text-indigo-900">{stats?.pending || 0}</p>
              <div className="h-1 w-8 bg-indigo-500 rounded-full mt-2" />
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200/30">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Sent</p>
              <p className="text-2xl font-bold text-emerald-900">{stats?.sent || 0}</p>
              <div className="h-1 w-8 bg-emerald-500 rounded-full mt-2" />
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl border border-orange-200/30">
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">Failed</p>
              <p className="text-2xl font-bold text-orange-900">{stats?.failed || 0}</p>
              <div className="h-1 w-8 bg-orange-500 rounded-full mt-2" />
            </div>
            <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/30">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Cancelled</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.cancelled || 0}</p>
              <div className="h-1 w-8 bg-slate-500 rounded-full mt-2" />
            </div>
          </div>
        </div>
      )}

      {/* Expanded View - Full Details */}
      {isExpanded && (
        <div className="p-6 md:p-8 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">Loading scheduled messages...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600 font-semibold">{error}</p>
            </div>
          ) : upcomingMessages && upcomingMessages.length > 0 ? (
            <>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {upcomingMessages.slice(0, 5).map((message) => (
                  <motion.div
                    key={message._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 ${getMessageTypeBg(message.type)} rounded-full flex items-center justify-center shrink-0`}>
                        {getMessageTypeIcon(message.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {message.recipientName}
                          </p>
                          <span className="text-xs font-bold text-slate-500 shrink-0 bg-white px-2 py-1 rounded-lg">
                            {formatTime(message.scheduledTime)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mb-2">
                          {message.content.substring(0, 50)}...
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-xs font-semibold text-slate-600 border border-slate-200">
                            <Calendar size={12} />
                            {new Date(message.scheduledTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancel(message._id || '')}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Cancel message"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
              {upcomingMessages.length > 5 && (
                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500 font-medium">
                    +{upcomingMessages.length - 5} more messages
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-500 font-semibold text-sm">No scheduled messages</p>
              <p className="text-slate-400 text-xs mt-1">Create one to automate your follow-ups</p>
            </div>
          )}

          {/* Bottom Stats Summary */}
          {upcomingMessages && upcomingMessages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{stats?.pending}</p>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats?.sent}</p>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Sent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{stats?.failed}</p>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-600">{stats?.cancelled}</p>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Cancelled</p>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ScheduledMessagesModule;
