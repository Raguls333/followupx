import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, Zap, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../services/api';

interface AILead {
  _id: string;
  name: string;
  company?: string;
  estimatedValue?: number;
  daysSinceContact?: number;
  status: string;
  analysis?: string[];
  suggestedAction?: string;
  bestContactTime?: string;
  phone?: string;
}

interface RecoveryData {
  urgentLeads?: AILead[];
  atRiskLeads?: AILead[];
  totalRevenueAtRisk?: number;
}

interface AIRecoveryPageProps {
  onWhatsAppClick?: (lead: AILead) => void;
}

export const AIRecoveryPage = ({ onWhatsAppClick }: AIRecoveryPageProps) => {
  const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecoveryLeads = async () => {
      try {
        setLoading(true);
        const apiUrl = API_BASE_URL;
        const token = localStorage.getItem('followupx_token');

        if (!token) {
          setError('Authentication required');
          return;
        }

        const response = await fetch(`${apiUrl}/leads/ai-recovery`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch recovery leads');
        }

        const data = await response.json();
        setRecoveryData(data.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch recovery leads:', err);
        setError('Failed to load AI Recovery data. Please try again.');
        toast.error('Failed to load recovery analysis');
      } finally {
        setLoading(false);
      }
    };

    fetchRecoveryLeads();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin">
          <Zap className="text-slate-400" size={32} />
        </div>
        <p className="text-slate-600 mt-4">Analyzing leads...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (
    !recoveryData ||
    (!recoveryData.urgentLeads?.length && !recoveryData.atRiskLeads?.length)
  ) {
    return (
      <div className="p-12 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap size={40} className="text-green-600" />
        </div>
        <p className="text-slate-900 font-bold text-lg">All leads are engaged!</p>
        <p className="text-slate-600 mt-2">Keep up the great work! 🎉</p>
      </div>
    );
  }

  const totalRevenue = recoveryData.totalRevenueAtRisk || 0;
  const urgentCount = recoveryData.urgentLeads?.length || 0;
  const atRiskCount = recoveryData.atRiskLeads?.length || 0;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
          <span className="text-4xl">🤖</span> AI Recovery Assistant
        </h1>
        <p className="text-slate-600 mt-2">
          Leads that need attention to prevent loss
        </p>
      </motion.div>

      {/* Revenue at Risk Summary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-8 rounded-2xl mb-8 shadow-lg"
      >
        <div className="flex items-center gap-4">
          <TrendingDown size={40} className="flex-shrink-0" />
          <div>
            <p className="text-sm opacity-90 font-medium">Revenue at Risk</p>
            <p className="text-4xl font-bold">
              ₹{(totalRevenue / 100000).toFixed(1)}L
            </p>
            <p className="text-xs opacity-75 mt-1">
              {urgentCount + atRiskCount} leads need attention
            </p>
          </div>
        </div>
      </motion.div>

      {/* Urgent Leads */}
      {urgentCount > 0 && (
        <section className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold text-red-600 mb-6 flex items-center gap-2">
              <AlertTriangle size={28} /> Urgent ({urgentCount})
            </h2>

            <div className="space-y-4">
              {recoveryData.urgentLeads?.map((lead, idx) => (
                <LeadCard
                  key={lead._id}
                  lead={lead}
                  onWhatsAppClick={onWhatsAppClick}
                  isUrgent={true}
                  delay={idx * 0.1}
                />
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* At Risk Leads */}
      {atRiskCount > 0 && (
        <section className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-yellow-600 mb-6 flex items-center gap-2">
              <Zap size={28} /> At Risk ({atRiskCount})
            </h2>

            <div className="space-y-4">
              {recoveryData.atRiskLeads?.map((lead, idx) => (
                <LeadCard
                  key={lead._id}
                  lead={lead}
                  onWhatsAppClick={onWhatsAppClick}
                  delay={0.2 + idx * 0.1}
                />
              ))}
            </div>
          </motion.div>
        </section>
      )}
    </div>
  );
};

// Lead Card Component
interface LeadCardProps {
  lead: AILead;
  onWhatsAppClick?: (lead: AILead) => void;
  isUrgent?: boolean;
  delay?: number;
}

const LeadCard = ({
  lead,
  onWhatsAppClick,
  isUrgent = false,
  delay = 0
}: LeadCardProps) => {
  const handleWhatsApp = () => {
    if (onWhatsAppClick) {
      onWhatsAppClick(lead);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className={`rounded-xl border-2 overflow-hidden ${
        isUrgent
          ? 'bg-red-50 border-red-200 shadow-md'
          : 'bg-yellow-50 border-yellow-200 shadow-sm'
      }`}
    >
      {/* Card Header */}
      <div className="p-6 border-b border-inherit">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900">{lead.name}</h3>
            {lead.company && (
              <p className="text-sm text-slate-600 mt-1">{lead.company}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold text-slate-900">
              ₹{(lead.estimatedValue || 0) / 100000}L
            </p>
            <p className="text-xs text-slate-500">Estimated value</p>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-600 uppercase font-semibold">
              Days Inactive
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {lead.daysSinceContact}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase font-semibold">
              Current Status
            </p>
            <p className="text-lg font-bold text-slate-900 capitalize">
              {lead.status}
            </p>
          </div>
        </div>

        {/* Analysis Section */}
        {lead.analysis && lead.analysis.length > 0 && (
          <div className="bg-white bg-opacity-60 p-4 rounded-lg">
            <p className="text-sm font-bold text-slate-900 mb-3">
              📊 AI Analysis
            </p>
            <ul className="space-y-2">
              {lead.analysis.map((point, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendation Section */}
        {lead.suggestedAction && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm font-bold text-blue-900 mb-2">
              🎯 Recommended Action
            </p>
            <p className="text-sm text-blue-800 mb-3">{lead.suggestedAction}</p>
            {lead.bestContactTime && (
              <p className="text-xs text-blue-700">
                ⏰ Best time to contact: <span className="font-semibold">{lead.bestContactTime}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="p-6 border-t border-inherit bg-white bg-opacity-50">
        <button
          onClick={handleWhatsApp}
          className={`w-full font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${
            isUrgent
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-md'
              : 'bg-green-500 hover:bg-green-600 text-white shadow-sm'
          }`}
        >
          <MessageSquare size={20} />
          Send Re-engagement Message
        </button>
      </div>
    </motion.div>
  );
};
