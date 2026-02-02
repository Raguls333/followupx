import React, { useState, useMemo, useEffect, useCallback } from 'react';
// Modal for today's action item on first load
const TodayActionModal = ({ open, onClose, tasks, onActionClick }) => {
  if (!open) return null;
  // Find the highest priority action item for today (Pending, Overdue, etc.)
  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter(t => t.dueDate === today && t.status !== 'Completed');
  const overdueTasks = tasks.filter(t => t.status === 'Overdue');
  const actionTask = overdueTasks[0] || todayTasks[0];

  if (!actionTask) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="p-8 text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Action Items for Today!</h3>
            <p className="text-slate-500 text-sm mb-6">You're all caught up. Enjoy your day!</p>
            <button onClick={onClose} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors">Close</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-8 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Today's Action Item</h3>
          <p className="text-slate-500 text-sm mb-6">You have a task: <span className="font-bold text-slate-900">{actionTask.title}</span></p>
          <button onClick={() => { onActionClick(actionTask); onClose(); }} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors">Go to Task</button>
        </div>
      </motion.div>
    </div>
  );
};
import {
  LayoutDashboard,
  Users,
  UsersRound,
  CheckSquare,
  BarChart3,
  Settings,
  Bell,
  Search,
  Plus,
  MessageSquare,
  Phone,
  Mail,
  MoreVertical,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  TrendingUp,
  Filter,
  Download,
  Upload,
  FileText,
  StickyNote,
  Menu,
  Zap,
  Target,
  X,
  CreditCard,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

import { toast, Toaster } from "sonner";
import {
  authService,
  leadService,
  taskService,
  activityService,
  analyticsService,
  getAuthToken
} from '../services';
import type { User, Lead as ApiLead } from '../services';
import type { Task as ApiTask } from '../services/taskService';
import { TeamPage } from '../components/TeamPage';
import { ScheduledMessagesModule } from './ScheduledMessagesModule';
import { TodayDashboard } from './components/TodayDashboard';
import { AIRecoveryPage } from './components/AIRecoveryPage';
import { LostLeadModal } from './components/LostLeadModal';
import { CSVImportModal } from './components/CSVImportModal';
import { TemplateLibrary } from './components/TemplateLibrary';
import { MobileBottomNav } from './components/MobileBottomNav';

// --- Types ---
type AuthState = 'landing' | 'onboarding' | 'authenticated';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- API Integration helpers ---
type UiLead = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  status: string;
  value: number;
  source: string;
  date?: string;
  lastContacted?: string;
  assigneeId?: string;
  assigneeName?: string;
};

type UiTask = {
  id: string;
  leadId: string;
  title: string;
  type: string;
  dueDate: string;
  time?: string;
  priority: string;
  status: string; // keep backend value: 'pending', 'completed', etc.
  isOverdue?: boolean;
};

const titleCase = (value = '') =>
  value
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();

const mapLeadFromApi = (lead: ApiLead): UiLead => {
  const name =
    lead.fullName ||
    `${lead.name?.first || ''} ${lead.name?.last || ''}`.trim() ||
    'Unknown';

  const lastContacted = lead.lastContactedAt
    ? lead.lastContactedAt.slice(0, 10)
    : '-';

  // Handle populated userId (object) or plain string
  const assigneeId = typeof lead.userId === 'object' ? lead.userId._id : lead.userId;
  const assigneeName = typeof lead.userId === 'object' ? lead.userId.name : undefined;

  return {
    id: lead._id,
    name,
    phone: lead.phone,
    email: lead.email || '',
    company: lead.company || '',
    status: titleCase(lead.status || 'new'),
    value: lead.estimatedValue ?? 0,
    source: titleCase(lead.source || 'other'),
    date: lead.createdAt ? lead.createdAt.slice(0, 10) : '',
    lastContacted,
    assigneeId,
    assigneeName
  };
};

const mapTaskFromApi = (task: ApiTask): UiTask => {
  const dueDateIso = task.dueDate ? new Date(task.dueDate) : new Date();
  const now = new Date();
  // Only mark as overdue if still pending and due date is in the past
  const isOverdue = task.status === 'pending' && dueDateIso < now;
  return {
    id: task._id,
    leadId: typeof task.leadId === 'object' ? (task.leadId as any)._id : (task.leadId as string),
    title: task.title,
    type: titleCase(task.type || 'follow_up'),
    dueDate: dueDateIso.toISOString().slice(0, 10),
    time: task.dueTime || '',
    priority: titleCase(task.priority || 'medium'),
    status: task.status, // keep backend value
    isOverdue
  };
};

const uiOutcomeToApi = (outcome: string): string => {
  const map: Record<string, string> = {
    'Connected - Positive': 'successful',
    'Connected - Needs follow-up': 'callback_requested',
    'Connected - Not interested': 'not_interested',
    'No answer': 'no_answer',
    'Busy': 'rescheduled',
    'Wrong number': 'other',
    'Voicemail': 'no_answer'
  };
  return map[outcome] || 'other';
};

// --- Mock Data ---
const TEAM_MEMBERS = [
  { id: 'm1', name: 'Rajiv Malhotra', role: 'Admin', avatar: 'https://i.pravatar.cc/100?u=10' },
  { id: 'm2', name: 'Sanjay Gupta', role: 'Sales Executive', avatar: 'https://i.pravatar.cc/100?u=11' },
  { id: 'm3', name: 'Ananya Iyer', role: 'Sales Executive', avatar: 'https://i.pravatar.cc/100?u=12' },
];

const INITIAL_LEADS = [
  { id: '1', name: 'Rajesh Kumar', phone: '+919876543210', email: 'rajesh@example.com', company: 'Kumar Realty', status: 'Qualified', value: 500000, source: 'Website', date: '2026-01-25', lastContacted: '2026-01-28', assigneeId: 'm1' },
  { id: '2', name: 'Priya Singh', phone: '+919988776655', email: 'priya.s@gmail.com', company: 'Individual', status: 'New', value: 75000, source: 'Referral', date: '2026-01-29', lastContacted: '-', assigneeId: 'm2' },
  { id: '3', name: 'Amit Shah', phone: '+919123456789', email: 'amit@shahconsultancy.in', company: 'Shah Consultancy', status: 'Proposal', value: 1200000, source: 'Ads', date: '2026-01-20', lastContacted: '2026-01-27', assigneeId: 'm1' },
  { id: '4', name: 'Sneha Patil', phone: '+919555666777', email: 'sneha@patilestates.com', company: 'Patil Estates', status: 'Contacted', value: 300000, source: 'Walk-in', date: '2026-01-27', lastContacted: '2026-01-28', assigneeId: 'm3' },
  { id: '5', name: 'Vikram Mehta', phone: '+919000111222', email: 'vikram@mehtacorp.com', company: 'Mehta Corp', status: 'Qualified', value: 450000, source: 'Email', date: '2026-01-15', lastContacted: '2026-01-22', assigneeId: 'm2' },
  { id: '6', name: 'Anjali Gupta', phone: '+919888777666', email: 'anjali@guptaclinics.com', company: 'Gupta Clinics', status: 'Lost', value: 20000, source: 'Website', date: '2026-01-10', lastContacted: '2026-01-15', assigneeId: 'm1' },
];

const INITIAL_TASKS = [
  { id: 't1', leadId: '1', type: 'Call', title: 'Follow up on site visit', dueDate: '2026-01-29', time: '10:30 AM', priority: 'High', status: 'Pending' },
  { id: 't2', leadId: '3', type: 'WhatsApp', title: 'Send proposal PDF', dueDate: '2026-01-29', time: '02:00 PM', priority: 'Medium', status: 'Pending' },
  { id: 't3', leadId: '5', type: 'Email', title: 'Share brochure', dueDate: '2026-01-28', time: '11:00 AM', priority: 'High', status: 'Overdue' },
  { id: 't4', leadId: '4', type: 'Meeting', title: 'Site visit for Bandra plot', dueDate: '2026-01-30', time: '04:00 PM', priority: 'High', status: 'Pending' },
  { id: 't5', leadId: '2', type: 'Call', title: 'Initial intro call', dueDate: '2026-01-29', time: '09:00 AM', priority: 'Medium', status: 'Overdue' },
];

const INITIAL_NOTES = [
  { id: 'n1', leadId: '1', content: 'Customer is interested in 3BHK flats specifically in Bandra West.', date: '2026-01-27', time: '11:20 AM' },
  { id: 'n2', leadId: '3', content: 'Requested a detailed breakdown of GST and registry charges.', date: '2026-01-26', time: '04:45 PM' },
];

const ACTIVITY_STATS = [
  { name: 'Mon', calls: 12, whatsapp: 18, meetings: 2 },
  { name: 'Tue', calls: 15, whatsapp: 22, meetings: 4 },
  { name: 'Wed', calls: 8, whatsapp: 14, meetings: 1 },
  { name: 'Thu', calls: 18, whatsapp: 30, meetings: 5 },
  { name: 'Fri', calls: 10, whatsapp: 15, meetings: 3 },
  { name: 'Sat', calls: 5, whatsapp: 8, meetings: 6 },
  { name: 'Sun', calls: 2, whatsapp: 4, meetings: 1 },
];

const FUNNEL_DATA = [
  { name: 'New', value: 45, fill: '#8884d8' },
  { name: 'Contacted', value: 32, fill: '#83a6ed' },
  { name: 'Qualified', value: 20, fill: '#8dd1e1' },
  { name: 'Proposal', value: 12, fill: '#82ca9d' },
  { name: 'Won', value: 8, fill: '#a4de6c' },
];

// --- Components ---

// --- Components ---

const LandingPage = ({ onAuthSuccess }: { onAuthSuccess: (user: User | null) => void }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '+91 ',
    password: '',
    company: '',
    industry: 'Real Estate'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const normalizeIndustry = (val: string) =>
        val?.toString().trim().toLowerCase().replace(/\s+/g, '_') || undefined;

      if (isLogin) {
        const user = await authService.login({
          email: formData.email,
          password: formData.password
        });
        onAuthSuccess(user);
        toast.success('Logged in successfully');
      } else {
        const user = await authService.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone.replace(/\s/g, ''),
          company: formData.company,
          industry: normalizeIndustry(formData.industry)
        });
        onAuthSuccess(user);
        toast.success('Account created');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden font-sans">
      <nav className="h-20 border-b border-slate-100 flex items-center justify-between px-6 lg:px-20">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-tr from-emerald-600 to-cyan-400 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition duration-700"></div>
            <div className="relative w-11 h-11 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-900 shadow-xl transition-all duration-500 group-hover:scale-105 group-hover:border-emerald-200">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent rounded-2xl" />
              <Target size={24} strokeWidth={2.5} className="relative z-10 text-emerald-600" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-slate-900 tracking-tight block leading-none">FollowUp<span className="text-emerald-600">X</span></span>
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-1 block">Never lose a lead again</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#" className="text-sm font-bold text-slate-600 hover:text-emerald-600">Features</a>
          <a href="#" className="text-sm font-bold text-slate-600 hover:text-emerald-600">Success Stories</a>
          <a href="#" className="text-sm font-bold text-slate-600 hover:text-emerald-600">Reviews</a>
        </div>
        <button 
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 hover:bg-slate-50 transition-all"
        >
          {isLogin ? "Sign Up" : "Login"}
        </button>
      </nav>

      <div className="max-w-7xl mx-auto px-6 lg:px-20 py-12 lg:py-24 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold mb-6">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Loved by 2,000+ Indian SMBs
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight">
            Never lose a <span className="text-emerald-600">lead again.</span>
          </h1>
          <p className="mt-8 text-xl text-slate-500 leading-relaxed max-w-lg">
            FollowUpX helps you manage prospects with WhatsApp click-to-chat, AI nudges, and smart reminders. No complex APIs needed.
          </p>
          
          <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-12 h-12 rounded-full border-4 border-white overflow-hidden bg-slate-100">
                  <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
                </div>
              ))}
            </div>
            <p className="text-sm font-bold text-slate-600">
              Joined by 12 people in the last hour
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 relative"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
          
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {isLogin ? "Welcome Back" : "Start Your 14-Day Free Trial"}
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            {isLogin ? "Enter your details to access your dashboard" : "No credit card required. Setup takes 2 minutes."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Full Name</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. Amit Kumar"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-medium"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Email Address</label>
                <input 
                  required
                  type="email"
                  placeholder="amit@business.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-medium"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Phone Number</label>
                <input 
                  required
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-medium"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            {!isLogin && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Industry</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-medium appearance-none"
                  value={formData.industry}
                  onChange={e => setFormData({...formData, industry: e.target.value})}
                >
                  <option>Real Estate</option>
                  <option>Healthcare</option>
                  <option>Education</option>
                  <option>Consulting</option>
                  <option>Other</option>
                </select>
              </div>
            )}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Password</label>
              <input 
                required
                type="password"
                placeholder="Min 8 characters"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-medium"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            
            {!isLogin && (
              <div className="flex items-start gap-3 mt-4">
                <input type="checkbox" required className="mt-1 accent-emerald-600" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  I agree to FollowUpX's <a href="#" className="text-emerald-600 font-bold underline">Terms</a> & <a href="#" className="text-emerald-600 font-bold underline">Privacy Policy</a>
                </p>
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Please wait…' : isLogin ? "Login Now" : "Create My Account"}
              {!isSubmitting && <ChevronRight size={20} />}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-slate-500 font-medium">
            {isLogin ? "Don't have an account?" : "Already using FollowUpX?"}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1 text-emerald-600 font-bold hover:underline"
            >
              {isLogin ? "Sign up for free" : "Log in instead"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

const OnboardingWizard = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const next = () => {
    if (step < totalSteps) setStep(step + 1);
    else onComplete();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div 
              key={s} 
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                s <= step ? "bg-emerald-600" : "bg-slate-200"
              )} 
            />
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-10 shadow-2xl border border-slate-100"
        >
          {step === 1 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Target size={40} strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Never lose a lead again! 👋</h2>
              <p className="text-slate-500 text-lg leading-relaxed">
                Welcome to FollowUpX. Let's set up your sales engine in 3 quick steps to maximize your conversion.
              </p>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-6">Add your first leads</h2>
              <div className="space-y-4">
                <button className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all flex items-center gap-4 text-left group">
                  <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-600">
                    <Upload size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Upload CSV file</p>
                    <p className="text-xs text-slate-500">Import your existing database instantly</p>
                  </div>
                </button>
                <button className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all flex items-center gap-4 text-left group">
                  <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-600">
                    <Plus size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Add manually</p>
                    <p className="text-xs text-slate-500">Start fresh with one lead at a time</p>
                  </div>
                </button>
                <button className="w-full p-4 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all flex items-center gap-4 text-left group">
                  <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-600">
                    <Zap size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">I'll do this later</p>
                    <p className="text-xs text-slate-500">Skip to explore the dashboard</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Connect WhatsApp</h2>
              <p className="text-slate-500 text-sm mb-8">One-click messaging for faster follow-ups</p>
              
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">WhatsApp Number</p>
                    <p className="text-lg font-bold text-slate-900">+91 98765 43210</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                  <CheckSquare size={16} />
                  <span>Yes, this is correct</span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">How it works:</p>
                <ul className="space-y-3">
                  {[
                    "Click WhatsApp button on any lead",
                    "Message opens in your WhatsApp app",
                    "Send with one tap - no API fees!"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">
                        {i + 1}
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-200">
                <CheckSquare size={48} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">You're all set! 🎉</h2>
              <div className="space-y-3 mb-8 max-w-xs mx-auto text-left">
                {[
                  "Account created successfully",
                  "WhatsApp connected",
                  "Dashboard ready for action"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-emerald-600 font-bold">
                    <Zap size={18} fill="currentColor" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-12 flex items-center justify-between gap-4">
            <button 
              onClick={() => step > 1 && setStep(step - 1)}
              className={cn(
                "px-8 py-3 rounded-2xl font-bold transition-all text-slate-400 hover:text-slate-600",
                step === 1 && "opacity-0 pointer-events-none"
              )}
            >
              Back
            </button>
            <button 
              onClick={next}
              className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
            >
              {step === totalSteps ? "Go to Dashboard" : "Continue"}
              <ChevronRight size={20} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const TaskOutcomeModal = ({ isOpen, onClose, task, onComplete }: { isOpen: boolean, onClose: () => void, task: any, onComplete: (outcome: string, notes: string) => void }) => {
  const [outcome, setOutcome] = useState('Connected - Positive');
  const [notes, setNotes] = useState('');
  const [createFollowup, setCreateFollowup] = useState(true);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(outcome, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-scroll max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Complete Task</h3>
            <p className="text-xs text-slate-500 mt-1">Task: {task.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">How did it go?</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                'Connected - Positive',
                'Connected - Needs follow-up',
                'Connected - Not interested',
                'No answer',
                'Busy',
                'Wrong number',
                'Voicemail'
              ].map(o => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcome(o)}
                  className={cn(
                    "px-4 py-3 rounded-xl border text-sm font-bold text-left transition-all",
                    outcome === o ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Conversation Notes (optional)</label>
            <textarea 
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What did you discuss?"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-medium resize-none"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <input 
              type="checkbox" 
              checked={createFollowup} 
              onChange={e => setCreateFollowup(e.target.checked)}
              className="w-5 h-5 accent-emerald-600 rounded"
            />
            <div>
              <p className="text-sm font-bold text-emerald-900">Create follow-up task automatically</p>
              <p className="text-[10px] text-emerald-700 font-medium italic">Suggested based on AI: "Follow up call" in 2 days</p>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
          >
            Mark Complete
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const RescheduleModal = ({ isOpen, onClose, task, onReschedule }: { isOpen: boolean, onClose: () => void, task: any, onReschedule: (date: string, time: string) => void }) => {
  const [date, setDate] = useState('2026-02-01');
  const [time, setTime] = useState('10:00 AM');

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Reschedule</h3>
            <p className="text-xs text-slate-500 mt-1">Currently: {task.dueDate}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Reschedule to:</label>
            <div className="space-y-2">
              {[
                { label: 'Tomorrow at 10:00 AM', date: '2026-02-01', time: '10:00 AM' },
                { label: 'In 2 hours', date: '2026-01-31', time: '12:00 PM' },
                { label: 'Monday morning', date: '2026-02-02', time: '09:00 AM' },
              ].map((opt, i) => (
                <button
                  key={i}
                  onClick={() => { onReschedule(opt.date, opt.time); onClose(); }}
                  className="w-full p-4 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Custom Date & Time</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              />
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                step="300"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">Pick a time to trigger a WhatsApp reminder at the new follow-up time.</p>
          </div>

          <button 
            onClick={() => { onReschedule(date, time); onClose(); }}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
          >
            Update Due Date
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const LogCallModal = ({ isOpen, onClose, lead, onLog }: { isOpen: boolean, onClose: () => void, lead: any, onLog: (log: any) => void }) => {
  const [outcome, setOutcome] = useState('Connected');
  const [notes, setNotes] = useState('');

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-blue-50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Log Manual Call</h3>
            <p className="text-xs text-blue-700 mt-1">Lead: {lead.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <button className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-emerald-700 font-bold text-sm">Outbound</button>
             <button className="p-4 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm">Inbound</button>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Outcome</label>
            <select 
              value={outcome}
              onChange={e => setOutcome(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-medium"
            >
              <option>Connected</option>
              <option>No answer</option>
              <option>Busy</option>
              <option>Wrong number</option>
              <option>Voicemail</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Conversation Notes</label>
            <textarea 
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What did you discuss?"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-medium resize-none"
            />
          </div>

          <button 
            onClick={() => { onLog({ outcome, notes }); onClose(); }}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
          >
            Log Call Activity
          </button>
        </div>
      </motion.div>
    </div>
  );
};
const AddLeadModal = ({ isOpen, onClose, onAdd, leads }: { isOpen: boolean, onClose: () => void, onAdd: (lead: any) => void, leads: any[] }) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    value: 0,
    source: 'Website',
    status: 'New',
    assigneeId: 'm1'
  });
  const [duplicateLead, setDuplicateLead] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const existing = leads.find(l => l.phone.replace(/\D/g, '').includes(formData.phone.replace(/\D/g, '')) && formData.phone.length > 5);
    if (existing && !duplicateLead) {
      setDuplicateLead(existing);
      return;
    }
    onAdd({
      ...formData,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      lastContacted: '-'
    });
    setFormData({ name: '', company: '', phone: '', email: '', value: 0, source: 'Website', status: 'New', assigneeId: 'm1' });
    setDuplicateLead(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Add New Lead</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>
        {duplicateLead ? (
          <div className="p-8">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Duplicate Number Detected</h3>
            <p className="text-slate-500 text-sm text-center mb-8 leading-relaxed">
              This phone number already exists in your database.<br />
              <span className="font-bold text-slate-700">Existing lead: {duplicateLead.name}</span><br />
              Added: {duplicateLead.date}
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => onClose()} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-200">View Existing Lead</button>
              <button onClick={() => { onAdd({...formData, id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString().split('T')[0], lastContacted: '-'}); onClose(); }} className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Save Anyway</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Lead Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Anil Kapoor" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Phone</label>
                  <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91..." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Assign To</label>
                  <select value={formData.assigneeId} onChange={e => setFormData({...formData, assigneeId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                    {TEAM_MEMBERS.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Expected Value (₹)</label>
                <input type="number" value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Lead Source</label>
                <select value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                  <option>Website</option>
                  <option>Referral</option>
                  <option>Ads</option>
                  <option>Walk-in</option>
                  <option>Email</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-colors mt-2 shadow-xl shadow-emerald-100">Create Lead</button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

const WhatsAppModal = ({ isOpen, onClose, lead }: { isOpen: boolean, onClose: () => void, lead: any }) => {
  if (!isOpen || !lead) return null;

  const templates = [
    { id: '1', name: 'Initial Contact', text: `Hi ${lead.name.split(' ')[0]}! 👋 Thank you for your interest. I'm Rajiv from FollowUpX. When would be a good time to connect?` },
    { id: '2', name: 'Follow-up', text: `Hi ${lead.name.split(' ')[0]}, following up on our conversation. Do you have any questions I can help with?` },
    { id: '3', name: 'Appointment Reminder', text: `Hi ${lead.name.split(' ')[0]}! 📅 Reminder: We have our meeting scheduled for tomorrow at 11am. Looking forward to it!` },
    { id: '4', name: 'Re-engagement', text: `Hi ${lead.name.split(' ')[0]}, noticed we haven't connected in a while. Wanted to check if you're still interested in our services?` },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Send WhatsApp</h3>
              <p className="text-xs text-emerald-700">To: {lead.name} ({lead.phone})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-100 rounded-full text-slate-500">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select a template</p>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {templates.map((t) => (
              <button
                key={t.id}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                onClick={() => {
                  window.open(`https://wa.me/${lead.phone.replace('+', '')}?text=${encodeURIComponent(t.text)}`, '_blank');
                  onClose();
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-800">{t.name}</span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 italic">"{t.text}"</p>
              </button>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-100">
            <button className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
              Send Custom Message
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const AddTaskModal = ({ isOpen, onClose, lead, onAdd }: { isOpen: boolean, onClose: () => void, lead: any, onAdd: (task: any) => void }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Call');
  const [date, setDate] = useState('2026-01-29');
  const [time, setTime] = useState('10:00 AM');
  const [priority, setPriority] = useState('Medium');

  if (!isOpen || !lead) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      leadId: lead.id,
      title,
      type,
      dueDate: date,
      time,
      priority,
      status: 'Pending'
    });
    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Create New Task</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Task Title</label>
            <input 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Follow up on proposal"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Type</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white"
              >
                <option>Call</option>
                <option>WhatsApp</option>
                <option>Email</option>
                <option>Meeting</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Priority</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Due Date</label>
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Time</label>
              <input 
                type="text"
                placeholder="10:00 AM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors mt-2">
            Save Task
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const AddNoteModal = ({ isOpen, onClose, lead, onAdd }: { isOpen: boolean, onClose: () => void, lead: any, onAdd: (note: any) => void }) => {
  const [content, setContent] = useState('');

  if (!isOpen || !lead) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      leadId: lead.id,
      content,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setContent('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Add Private Note</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Note Content</label>
            <textarea 
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write something about this lead..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
            />
          </div>
          <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
            Save Note
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const EditLeadModal = ({ isOpen, onClose, lead, onUpdate }: { isOpen: boolean, onClose: () => void, lead: any, onUpdate: (updatedLead: any) => void }) => {
  const [formData, setFormData] = useState(lead || {});

  React.useEffect(() => {
    if (lead) setFormData(lead);
  }, [lead]);

  if (!isOpen || !lead) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Edit Lead Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Full Name</label>
              <input 
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Company Name</label>
              <input 
                value={formData.company || ''}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Phone Number</label>
                <input 
                  required
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email Address</label>
                <input 
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Deal Value (₹)</label>
                <input 
                  type="number"
                  value={formData.value || 0}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Lead Source</label>
                <select 
                  value={formData.source || 'Website'}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white"
                >
                  <option>Website</option>
                  <option>Referral</option>
                  <option>Ads</option>
                  <option>Walk-in</option>
                  <option>Email</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Assign To</label>
              <select 
                value={formData.assigneeId || 'm1'}
                onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none bg-white"
              >
                {TEAM_MEMBERS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors mt-2">
            Update Lead
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void,
  title: string,
  message: string
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="p-4 bg-slate-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-3 text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-colors shadow-lg shadow-emerald-200"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const LeadDetailsDrawer = ({ 
  isOpen, 
  onClose, 
  lead, 
  tasks, 
  notes,
  leadActivities,
  onAddTaskClick,
  onAddNoteClick,
  onWhatsAppClick,
  onLogCallClick,
  onUpdateStatus,
  onEditClick
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  lead: any, 
  tasks: any[],
  notes: any[],
  leadActivities: any[],
  onAddTaskClick: () => void,
  onAddNoteClick: () => void,
  onWhatsAppClick: (l: any) => void,
  onLogCallClick: () => void,
  onUpdateStatus: (id: string, status: string) => void,
  onEditClick: () => void
}) => {
  const [noteTab, setNoteTab] = useState('Public');
  if (!isOpen || !lead) return null;

  const statuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

  // Use API-fetched leadActivities for timeline to ensure data persists on refresh
  const combinedTimeline = [
    ...leadActivities.map(a => ({ ...a, timelineType: a.timelineType || 'activity' })),
    { id: 'created', title: 'Lead Created', timelineType: 'milestone', date: lead.date, source: lead.source }
  ].sort((a, b) => {
    const dateA = a.date || a.dueDate;
    const dateB = b.date || b.dueDate;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed top-0 right-0 w-full max-w-lg h-full bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Lead Profile</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Header Info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-2xl font-bold">
              {lead.name[0]}
            </div>
            <div>
              <h4 className="text-2xl font-bold text-slate-900">{lead.name}</h4>
              <p className="text-slate-500 flex items-center gap-2 mt-1">
                <span className="font-medium text-slate-700">{lead.company}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span>Added {lead.date}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-3">
            <button 
              onClick={() => onWhatsAppClick(lead)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                <MessageSquare size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase">WhatsApp</span>
            </button>
            <button 
              onClick={onLogCallClick}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
              <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center">
                <Phone size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase">Log Call</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-3 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">
              <div className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center">
                <Mail size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase">Email</span>
            </button>
            <button 
              onClick={onAddNoteClick}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <div className="w-10 h-10 bg-slate-500 text-white rounded-full flex items-center justify-center">
                <StickyNote size={18} />
              </div>
              <span className="text-[10px] font-bold uppercase">Note</span>
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 relative group">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Status</p>
              <select 
                value={lead.status}
                onChange={(e) => onUpdateStatus(lead.id, e.target.value)}
                className="w-full text-sm font-bold text-slate-800 mt-1 bg-transparent border-none p-0 focus:ring-0 cursor-pointer appearance-none"
              >
                {statuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div className="absolute right-3 bottom-4 pointer-events-none text-slate-400 group-hover:text-emerald-500">
                <ChevronRight size={14} className="rotate-90" />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deal Value</p>
              <p className="text-sm font-bold text-slate-800 mt-1">₹{lead.value.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignee</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  {lead.assigneeName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <p className="text-sm font-bold text-slate-800">{lead.assigneeName || 'Unassigned'}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lead Source</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{lead.source}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Information</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone size={14} className="text-slate-400" />
                <span>{lead.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail size={14} className="text-slate-400" />
                <span>{lead.email}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-bold text-slate-900">Activity History</h5>
              <button 
                onClick={onAddTaskClick}
                className="text-xs font-bold text-emerald-600"
              >
                + New Task
              </button>
            </div>
            <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {combinedTimeline.map((item, i) => (
                <div key={item.id} className="relative pl-10">
                  <div className={cn(
                    "absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm",
                    item.timelineType === 'task' 
                      ? (item.status === 'Overdue' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600')
                      : item.timelineType === 'note' ? 'bg-amber-100 text-amber-600'
                      : item.timelineType === 'activity' ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-indigo-500 text-white'
                  )}>
                    {item.timelineType === 'task' ? (
                      item.type === 'Call' ? <Phone size={14} /> : 
                      item.type === 'WhatsApp' ? <MessageSquare size={14} /> : 
                      item.type === 'Email' ? <Mail size={14} /> : <CalendarIcon size={14} />
                    ) : item.timelineType === 'note' ? <StickyNote size={14} />
                    : item.timelineType === 'activity' ? <Activity size={14} />
                    : <Users size={14} />}
                  </div>
                  <div>
                    {item.timelineType === 'task' && (
                      <>
                        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Scheduled for {item.dueDate} at {item.time}</p>
                        {item.status === 'Overdue' && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded">OVERDUE</span>
                        )}
                      </>
                    )}
                    {item.timelineType === 'note' && (
                      <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                        <p className="text-sm text-slate-800 leading-relaxed">{item.content}</p>
                        <p className="text-[10px] text-amber-600 font-bold mt-2 uppercase tracking-wider">{item.date} • {item.time}</p>
                      </div>
                    )}
                    {item.timelineType === 'activity' && (
                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        <p className="text-sm text-slate-700 leading-relaxed mt-1">{item.content}</p>
                        <p className="text-[10px] text-emerald-600 font-bold mt-2 uppercase tracking-wider">{item.date} • {item.time}</p>
                      </div>
                    )}
                    {item.timelineType === 'milestone' && (
                      <>
                        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Via {item.source} on {item.date}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <button 
            onClick={onEditClick}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            Edit Lead Details
          </button>
        </div>
      </motion.div>
    </>
  );
};

const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen, user, onLogout }: { activeTab: string, setActiveTab: (tab: string) => void, isOpen: boolean, setIsOpen: (o: boolean) => void, user: any, onLogout: () => void }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'leads', icon: Users, label: 'Leads' },
    { id: 'tasks', icon: CalendarIcon, label: 'Follow-ups' },
    { id: 'team', icon: UsersRound, label: 'Team' },
    { id: 'recovery', icon: Zap, label: '🤖 AI Recovery' },
    { id: 'templates', icon: FileText, label: '📝 Templates' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed left-0 top-0 h-full bg-[#0B101B] text-slate-300 z-[110] transition-all duration-300 lg:translate-x-0 w-64 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-tr from-emerald-500/30 to-cyan-400/30 rounded-[20px] blur-xl opacity-50 group-hover:opacity-100 transition duration-700"></div>
              <div className="relative w-12 h-12 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:border-emerald-500/50 group-hover:scale-105 group-hover:bg-white/10">
                <Target size={26} strokeWidth={2.5} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-[#0B101B]" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-white block leading-none">FollowUp<span className="text-emerald-400">X</span></span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] mt-2 block">Never lose a lead again</span>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="mt-4 px-4 space-y-2 flex-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] px-4 mb-4">Main Menu</p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                activeTab === item.id 
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20" 
                  : "hover:bg-white/5 hover:text-white text-slate-400 font-semibold"
              )}
            >
              <item.icon size={20} className={cn(
                "transition-colors relative z-10",
                activeTab === item.id ? "text-slate-950" : "text-slate-500 group-hover:text-slate-300"
              )} />
              <span className="relative z-10">{item.label}</span>
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-emerald-400 opacity-20 blur-xl"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6">
          <div className="bg-slate-900/50 p-4 rounded-[24px] border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 border-2 border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user?.name || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white">
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user?.name || 'User'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user?.plan?.toUpperCase() || 'FREE'}</p>
                </div>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full mt-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/5 transition-all"
            >
              Log Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

const Header = ({ title, onAddLeadClick, onMenuClick }: { title: string, onAddLeadClick?: () => void, onMenuClick: () => void }) => (
  <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-40">
    <div className="flex items-center gap-4">
      <button onClick={onMenuClick} className="lg:hidden p-2.5 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
        <Menu size={24} />
      </button>
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        <div className="hidden sm:flex items-center gap-2 mt-0.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Live Updates</span>
        </div>
      </div>
    </div>
    
    <div className="flex items-center gap-3 lg:gap-6">
      <div className="relative hidden md:block">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
          type="text" 
          placeholder="Find a lead..." 
          className="pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 w-48 lg:w-72 transition-all outline-none"
        />
      </div>
      <div className="flex items-center gap-1">
        <button className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all relative">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>
        <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
          <Settings size={20} />
        </button>
      </div>
      <div className="h-8 w-[1px] bg-slate-100 hidden sm:block" />
      <button 
        onClick={onAddLeadClick}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-emerald-200 active:scale-95"
      >
        <Plus size={18} />
        <span className="hidden sm:inline">New Lead</span>
      </button>
    </div>
  </header>
);

const StatCard = ({ label, value, trend, trendValue, icon: Icon, color, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -4 }}
    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", color)}>
        <Icon size={22} className="text-white" />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase",
          trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
        )}>
          {trend === 'up' ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
          {trendValue}%
        </div>
      )}
    </div>
    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
    <div className="flex items-baseline gap-2 mt-1">
      <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
      {trend && <span className="text-[10px] text-slate-400 font-medium">vs last month</span>}
    </div>
  </motion.div>
);

const TaskItem = ({ task, lead, onComplete, onReschedule }: { task: any, lead: any, onComplete: () => void, onReschedule: () => void }) => (
  <motion.div 
    whileHover={{ scale: 1.01 }}
    className={cn(
      "p-4 rounded-[20px] border border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all group relative",
      task.status === 'Overdue' ? 'bg-rose-50/30' : ''
    )}
  >
    <div className="flex items-start gap-4">
      <div className={cn(
        "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
        task.type === 'Call' ? 'bg-blue-500 text-white' : 
        task.type === 'WhatsApp' ? 'bg-emerald-500 text-white' : 
        task.type === 'Email' ? 'bg-orange-500 text-white' : 'bg-purple-500 text-white'
      )}>
        {task.type === 'Call' && <Phone size={20} />}
        {task.type === 'WhatsApp' && <MessageSquare size={20} />}
        {task.type === 'Email' && <Mail size={20} />}
        {task.type === 'Meeting' && <CalendarIcon size={20} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 truncate tracking-tight">{task.title}</h4>
          <span className={cn(
            "text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg tracking-wider",
            task.status === 'Overdue' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
          )}>
            {task.status}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Lead: <span className="text-slate-900 font-semibold">{lead?.name || 'Unknown'}</span>
        </p>
        <div className="flex items-center gap-3 mt-2.5">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 bg-slate-100/50 px-2 py-0.5 rounded-md">
            <CalendarIcon size={12} className="text-slate-400" /> {task.time}
          </span>
          <span className={cn(
            "text-[10px] font-bold uppercase flex items-center gap-1",
            task.priority === 'High' ? 'text-rose-500' : 'text-orange-500'
          )}>
            <div className={cn("w-1 h-1 rounded-full", task.priority === 'High' ? 'bg-rose-500' : 'bg-orange-500')} />
            {task.priority}
          </span>
        </div>
      </div>
    </div>
    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-all translate-x-2 group-hover:translate-x-0">
      <button 
        onClick={(e) => { e.stopPropagation(); onComplete(); }}
        className="p-2.5 bg-white border border-slate-100 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-xl shadow-slate-200/50 transition-all">
        <CheckSquare size={16} />
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onReschedule(); }}
        className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-900 shadow-xl shadow-slate-200/50 transition-all">
        <CalendarIcon size={16} />
      </button>
    </div>
  </motion.div>
);

// --- Pages ---

const DashboardPage = ({ leads, tasks, analyticsData, isLoadingAnalytics, user, onTaskAction }: any) => {
  // Use real analytics data if available, otherwise fallback to calculated values
  const overview = analyticsData?.overview;
  const activityAnalytics = analyticsData?.activityAnalytics;
  const funnel = analyticsData?.funnel;
  
  // Transform activity data by day into chart format
  let chartData = activityAnalytics?.byDay 
    ? Object.entries(activityAnalytics.byDay).map(([day, count]: [string, any]) => {
        // Extract day name and activity counts (rough estimation based on daily total)
        const dayIndex = Object.keys(activityAnalytics.byDay).indexOf(day);
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return {
          name: dayNames[dayIndex % 7] || day.substring(0, 3),
          calls: Math.round(count * 0.4),
          whatsapp: Math.round(count * 0.5),
          meetings: Math.round(count * 0.1),
        };
      })
    : ACTIVITY_STATS;
  if (!chartData || chartData.length < 3) {
    chartData = ACTIVITY_STATS;
  }
  
  // Get recent wins - leads with status "Won" or "Qualified"
  const recentWins = leads
    .filter((l: any) => l.status === 'Won' || l.status === 'Qualified')
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)
    .map((lead: any) => ({
      name: lead.name,
      action: lead.status,
      time: lead.date, // You might want to format this relative to now
      amount: lead.value ? `₹${(lead.value / 100000).toFixed(1)}L` : '₹0',
    }));
  
  const stats = [
    { 
      label: 'Total Leads', 
      value: overview?.totalLeads ?? leads.length, 
      trend: overview?.trends?.leads > 0 ? 'up' : 'down', 
      trendValue: Math.abs(overview?.trends?.leads ?? 12),
      icon: Users, 
      color: 'bg-indigo-500 shadow-indigo-200' 
    },
    { 
      label: 'Active Tasks', 
      value: tasks.filter((t: any) => t.status !== 'Completed').length, 
      trend: overview?.trends?.tasks > 0 ? 'up' : 'down', 
      trendValue: Math.abs(overview?.trends?.tasks ?? 5),
      icon: CheckSquare, 
      color: 'bg-emerald-500 shadow-emerald-200' 
    },
    { 
      label: 'Won Deals', 
      value: overview?.dealsWon ? `₹${(overview.dealsWon * 100000).toLocaleString()}` : '₹4.2M', 
      trend: overview?.dealsWon > 0 ? 'up' : 'down', 
      trendValue: overview?.dealsWon ?? 24,
      icon: Zap, 
      color: 'bg-blue-500 shadow-blue-200' 
    },
    { 
      label: 'Conversion', 
      value: `${overview?.winRate ?? 14.2}%`, 
      trend: overview?.winRate > 14 ? 'up' : 'down', 
      trendValue: overview?.winRate ?? 2,
      icon: BarChart3, 
      color: 'bg-orange-500 shadow-orange-200' 
    },
  ];

  const overdueCount = tasks.filter((t: any) => t.status === 'Overdue').length;
  const today = new Date('2026-01-31');
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReport = async () => {
    try {
      setIsDownloading(true);
      // Create CSV content
      const headers = ['Lead Name', 'Company', 'Status', 'Value', 'Phone', 'Email', 'Date'];
      const csvContent = [
        headers.join(','),
        ...leads.map((lead: any) =>
          [
            lead.name,
            lead.company || '',
            lead.status,
            lead.value || 0,
            lead.phone || '',
            lead.email || '',
            lead.date || '',
          ]
            .map((field) => `"${String(field).replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `FollowUpX_Report_${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Report downloaded successfully');
    } catch (error) {
      toast.error('Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{greeting}, {user?.name || 'User'}! 👋</h1>
          <p className="text-slate-500 font-medium mt-1">Here's what's happening with your sales pipeline today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-slate-700">System Online</span>
          </div>
          <button 
            onClick={handleDownloadReport}
            disabled={isDownloading}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50"
          >
            {isDownloading ? 'Downloading...' : 'Download Report'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => <StatCard key={i} {...stat} delay={i * 0.1} />)}
      </div>

      {/* TODAY DASHBOARD - ACTION-FIRST */}
      <div className="w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Today's Action Items</h2>
          <TodayDashboard
            leads={leads}
            tasks={tasks}
            onTaskComplete={(taskId: string) => {
              const task = tasks.find((t: any) => t._id === taskId);
              if (task) onTaskAction(task, 'complete');
            }}
            onWhatsAppClick={(lead: any) => {
              const task = tasks.find((t: any) => t.leadId === lead._id);
              if (task) onTaskAction(task, 'whatsapp');
            }}
            onTaskNavigate={(task: any) => onTaskAction(task, 'open')}
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Chart Section */}
        <div className="lg:col-span-8 space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm overflow-hidden relative"
          >
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Communication Volume</h3>
                <p className="text-sm text-slate-500 font-medium">Daily interactions across channels</p>
              </div>
              <div className="flex bg-slate-50 p-1 rounded-xl">
                <button className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white shadow-sm text-slate-900">Week</button>
                <button className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700">Month</button>
              </div>
            </div>
            
            <div className="w-full h-[350px] relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorWA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: '600', fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: '600', fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="whatsapp" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorWA)" />
                  <Area type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorCalls)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2 -z-0 opacity-50" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* AI Insights Card */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-emerald-600 p-8 rounded-[32px] text-white shadow-xl shadow-emerald-200 relative overflow-hidden group"
            >
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                  <Zap size={24} fill="currentColor" />
                </div>
                <h3 className="text-2xl font-bold mb-2 tracking-tight">AI Recover Tool</h3>
                <p className="text-emerald-50 text-sm font-medium leading-relaxed mb-6">
                  You have <span className="font-bold underline decoration-1 underline-offset-4 text-white">
                    {overview?.coldLeads ?? 4} leads
                  </span> that are at high risk of going cold. Use AI nudges to re-engage them.
                </p>
                <button className="w-full py-4 bg-white text-emerald-600 rounded-2xl font-bold text-sm hover:bg-emerald-50 transition-all active:scale-95">
                  Launch Recovery Engine
                </button>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
            </motion.div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Calls Made</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {analyticsData?.activityAnalytics?.summary?.callsMade ?? 84}
                </p>
                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-blue-500 w-[65%]" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">WA Sent</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {analyticsData?.activityAnalytics?.summary?.whatsappSent ?? 156}
                </p>
                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[82%]" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Tasks Done</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {overview?.tasksCompleted ?? 12}
                </p>
                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-orange-500 w-[45%]" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Emails Sent</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {analyticsData?.activityAnalytics?.summary?.emailsSent ?? 4}
                </p>
                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-purple-500 w-[70%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Scheduled Messages Module */}
          <ScheduledMessagesModule />
        </div>

        {/* Sidebar Section */}
        <div className="lg:col-span-4 space-y-8">
          {/* Today's Tasks */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col h-[600px] sticky top-24"
          >
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Today's Focus</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wider">{overdueCount} Priority Tasks</p>
              </div>
              <button className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors">
                <Filter size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {tasks.length > 0 ? tasks.map((task: any) => (
                <div key={task.id} className="group transition-all">
                  <TaskItem 
                    task={task} 
                    lead={leads.find((l: any) => l.id === task.leadId)} 
                    onComplete={() => onTaskAction(task, 'complete')}
                    onReschedule={() => onTaskAction(task, 'reschedule')}
                  />
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                    <CheckSquare size={32} />
                  </div>
                  <p className="text-slate-400 font-semibold">No tasks for today!</p>
                  <p className="text-xs text-slate-300 mt-1">Enjoy your free time or add a new lead.</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-50">
              <button 
                onClick={() => onTaskAction(null, 'add')}
                className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-[20px] font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Add Quick Task
              </button>
            </div>
          </motion.div>

          {/* Activity Feed Snippet */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Wins</h3>
            <div className="space-y-6">
              {recentWins.length > 0 ? recentWins.map((win, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <TrendingUp size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{win.name}</p>
                    <p className="text-xs text-slate-500">{win.action} • {win.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{win.amount}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm">No qualified leads yet. Keep following up!</p>
                </div>
              )}
            </div>
          </div>

          {/* Sales Funnel Summary */}
          {funnel && (
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Sales Funnel</h3>
              <div className="space-y-4">
                {[
                  { stage: 'New', count: funnel.funnel?.new || 0, color: 'bg-indigo-500' },
                  { stage: 'Contacted', count: funnel.funnel?.contacted || 0, color: 'bg-blue-500' },
                  { stage: 'Qualified', count: funnel.funnel?.qualified || 0, color: 'bg-amber-500' },
                  { stage: 'Proposal', count: funnel.funnel?.proposal || 0, color: 'bg-purple-500' },
                  { stage: 'Won', count: funnel.funnel?.won || 0, color: 'bg-emerald-500' },
                ].map(item => (
                  <div key={item.stage}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-slate-600">{item.stage}</span>
                      <span className="text-xs font-bold text-slate-900">{item.count}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.color} transition-all`}
                        style={{ width: `${Math.min((item.count / Math.max(...[funnel.funnel?.new, funnel.funnel?.contacted, funnel.funnel?.qualified, funnel.funnel?.proposal, funnel.funnel?.won].filter(Boolean))) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ImportLeadsModal = ({ isOpen, onClose, onImported }: { isOpen: boolean, onClose: () => void, onImported: () => Promise<void> | void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const headers = "Name,Company,Phone,Email,Status,Value,Source\n";
    const sample = "Rahul Sharma,Sharma Exports,+919876543210,rahul@example.com,New,500000,Website\n";
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'followupx_leads_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please choose a CSV file first.");
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const result = await leadService.importLeads(file);
      toast.success(`Imported ${result.imported} lead(s). Skipped ${result.skipped}.`);
      if (result.errors.length > 0) {
        toast.info(`${result.errors.length} rows skipped. Check phone/required fields.`);
      }
      await onImported();
      onClose();
    } catch (err: any) {
      const message = err?.message || 'Import failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Import Leads from CSV</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <label className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer group block">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="w-16 h-16 bg-slate-100 group-hover:bg-emerald-100 text-slate-400 group-hover:text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload size={32} />
            </div>
            <p className="font-bold text-slate-900">{file ? file.name : 'Drop your CSV here'}</p>
            <p className="text-xs text-slate-500 mt-1">or click to browse files</p>
          </label>
          
          <button 
            onClick={handleDownloadTemplate}
            className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
          >
            <Download size={18} />
            Download sample CSV template
          </button>

          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button 
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isUploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Start Import"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const LeadsPage = ({ leads, onLeadClick, onWhatsAppClick, onImportClick }: any) => {
  const [filter, setFilter] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const filteredLeads = leads.filter((l: any) => filter === 'All' || l.status === filter);
  const statuses = ['All', 'New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

  const handleExport = () => {
    setIsExporting(true);
    
    // Simulate slight delay for better UX
    setTimeout(() => {
      const headers = ["Name", "Company", "Phone", "Email", "Status", "Value", "Source", "Date"].join(",");
      const rows = filteredLeads.map((l: any) => [
        `"${l.name}"`,
        `"${l.company}"`,
        `"${l.phone}"`,
        `"${l.email}"`,
        `"${l.status}"`,
        l.value,
        `"${l.source}"`,
        `"${l.date}"`
      ].join(","));
      
      const csvContent = [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `FollowUpX_Leads_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsExporting(false);
      toast.success(`Exported ${filteredLeads.length} leads successfully`);
    }, 800);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                "flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:border-emerald-500 hover:bg-emerald-50/30",
                filter !== 'All' ? "border-emerald-500 text-emerald-600 bg-emerald-50" : "text-slate-600"
              )}
            >
              <Filter size={18} className={filter !== 'All' ? "text-emerald-500" : "text-slate-400"} />
              <span>{filter === 'All' ? 'Filters' : `Status: ${filter}`}</span>
              <ChevronRight size={16} className={cn("transition-transform ml-1 text-slate-400", isFilterOpen ? "rotate-90" : "")} />
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setIsFilterOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-[70] origin-top-left"
                  >
                    <div className="px-4 pb-2 mb-2 border-b border-slate-50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter by Status</p>
                    </div>
                    <div className="space-y-1">
                      {statuses.map((s) => (
                        <button
                          key={s}
                          onClick={() => { setFilter(s); setIsFilterOpen(false); }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 text-sm transition-all flex items-center justify-between",
                            filter === s ? "bg-emerald-50 text-emerald-600 font-bold" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {s}
                          {filter === s && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>
          
          <div className="text-sm font-medium text-slate-400 hidden sm:block">
            Showing <span className="text-slate-900 font-bold">{filteredLeads.length}</span> leads
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={onImportClick}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Upload size={18} className="text-slate-400" /> 
            <span className="hidden sm:inline">Import</span>
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting || filteredLeads.length === 0}
            className={cn(
              "flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm",
              (isExporting || filteredLeads.length === 0) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
            ) : (
              <Download size={18} className="text-slate-400" /> 
            )}
            <span className="hidden sm:inline">{isExporting ? "Exporting..." : "Export"}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lead Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Value</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Connect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                  <td className="px-6 py-4" onClick={() => onLeadClick(lead)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold uppercase shrink-0">
                        {lead.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{lead.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{lead.company}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4" onClick={() => onLeadClick(lead)}>
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2.5 py-1 rounded-md",
                      lead.status === 'New' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                      lead.status === 'Qualified' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      lead.status === 'Proposal' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      lead.status === 'Won' ? 'bg-green-50 text-green-700 border border-green-100' :
                      lead.status === 'Lost' ? 'bg-slate-50 text-slate-600 border border-slate-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                    )}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700" onClick={() => onLeadClick(lead)}>
                    ₹{lead.value.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-medium" onClick={() => onLeadClick(lead)}>
                    {lead.source}
                  </td>
                  <td className="px-6 py-4" onClick={() => onLeadClick(lead)}>
                    <p className="text-xs text-slate-500 italic">Last: {lead.lastContacted}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onWhatsAppClick(lead); }}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Send WhatsApp"
                      >
                        <MessageSquare size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Place Call"
                      >
                        <Phone size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Grid */}
        <div className="lg:hidden grid grid-cols-1 divide-y divide-slate-100">
          {filteredLeads.map((lead: any) => (
            <div 
              key={lead.id} 
              className="p-4 active:bg-slate-50 transition-colors"
              onClick={() => onLeadClick(lead)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold uppercase shrink-0">
                    {lead.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{lead.name}</p>
                    <p className="text-[11px] text-slate-500">{lead.company}</p>
                  </div>
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase px-2 py-0.5 rounded",
                  lead.status === 'New' ? 'bg-indigo-50 text-indigo-600' :
                  lead.status === 'Qualified' ? 'bg-emerald-50 text-emerald-600' :
                  lead.status === 'Proposal' ? 'bg-blue-50 text-blue-600' :
                  lead.status === 'Won' ? 'bg-green-50 text-green-700' :
                  lead.status === 'Lost' ? 'bg-slate-50 text-slate-600' : 'bg-orange-50 text-orange-600'
                )}>
                  {lead.status}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-4">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Value</p>
                    <p className="text-sm font-bold text-slate-700">₹{lead.value.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Source</p>
                    <p className="text-sm text-slate-600">{lead.source}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onWhatsAppClick(lead); }}
                    className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"
                  >
                    <MessageSquare size={18} />
                  </button>
                  <button className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Phone size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredLeads.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Users size={32} />
            </div>
            <p className="text-slate-500 font-medium">No leads found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TasksCalendar = ({ tasks, leads, onTaskAction }: { tasks: any[], leads: any[], onTaskAction: (t: any, a: string) => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 31)); // Saturday Jan 31, 2026
  
  const daysInMonth = 31;
  const firstDayOfMonth = 3; // Jan 1st 2026 was a Thursday (index 4) - wait Jan 2026 starts on Thursday (index 4)
  // Let's just generate a simple grid for the demo purposes
  
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDayOfMonth + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-black text-slate-800">January 2026</h3>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft size={20} /></button>
          <button className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight size={20} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const dateStr = day ? `2026-01-${day.toString().padStart(2, '0')}` : null;
          const dayTasks = tasks.filter(t => t.dueDate === dateStr);
          const isToday = day === 31;

          return (
            <div key={i} className={cn(
              "min-h-[120px] p-2 border-r border-b border-slate-100 last:border-r-0 relative group transition-colors",
              day ? "hover:bg-slate-50/50" : "bg-slate-50/30",
              isToday ? "bg-emerald-50/20" : ""
            )}>
              {day && (
                <>
                  <span className={cn(
                    "text-xs font-bold",
                    isToday ? "w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center -ml-1 -mt-1" : "text-slate-400"
                  )}>
                    {day}
                  </span>
                  <div className="mt-2 space-y-1">
                    {dayTasks.map(t => (
                      <button
                        key={t.id}
                        onClick={() => onTaskAction(t, 'complete')}
                        className={cn(
                          "w-full text-left px-1.5 py-1 rounded text-[10px] font-bold truncate transition-all",
                          t.status === 'Overdue' ? "bg-red-100 text-red-700" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                        )}
                      >
                        {t.type === 'Call' ? '📞' : '💬'} {t.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TasksPage = ({ leads, tasks, onTaskAction, onAddTask }: any) => {
  const [view, setView] = useState('list');
  
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setView('list')}
            className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all", view === 'list' ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-600 hover:bg-slate-50")}
          >
            List View
          </button>
          <button 
            onClick={() => setView('calendar')}
            className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all", view === 'calendar' ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-600 hover:bg-slate-50")}
          >
            Calendar
          </button>
        </div>
        <button 
          onClick={onAddTask}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl shadow-emerald-200"
        >
          <Plus size={20} /> New Task
        </button>
      </div>

      {view === 'calendar' ? (
        <TasksCalendar tasks={tasks} leads={leads} onTaskAction={onTaskAction} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            {['Overdue', 'Today', 'Upcoming'].map((section) => (
              <div key={section} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className={cn("font-black text-lg", section === 'Overdue' ? 'text-rose-600' : 'text-slate-800')}>{section} Tasks</h3>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {tasks.filter((t: any) => {
                      if (section === 'Overdue') return t.status === 'Overdue';
                      if (section === 'Today') return t.dueDate === '2026-01-31' && t.status !== 'Overdue' && t.status !== 'Completed';
                      return t.dueDate !== '2026-01-31' && t.status !== 'Overdue' && t.status !== 'Completed';
                    }).length} Tasks
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {tasks.filter((t: any) => {
                    if (section === 'Overdue') return t.status === 'Overdue';
                    if (section === 'Today') return t.dueDate === '2026-01-31' && t.status !== 'Overdue' && t.status !== 'Completed';
                    return t.dueDate !== '2026-01-31' && t.status !== 'Overdue' && t.status !== 'Completed';
                  }).map((task: any) => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      lead={leads.find((l: any) => l.id === task.leadId)} 
                      onComplete={() => onTaskAction(task, 'complete')}
                      onReschedule={() => onTaskAction(task, 'reschedule')}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-black text-slate-800 mb-6">Task Distribution</h3>
              <div className="w-full relative h-[300px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Calls', value: tasks.filter((t: any) => t.type === 'Call').length, fill: '#3b82f6' },
                        { name: 'WhatsApp', value: tasks.filter((t: any) => t.type === 'WhatsApp').length, fill: '#10b981' },
                        { name: 'Email', value: tasks.filter((t: any) => t.type === 'Email').length, fill: '#f97316' },
                        { name: 'Meetings', value: tasks.filter((t: any) => t.type === 'Meeting').length, fill: '#a855f7' },
                      ]}
                      cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#10b981" />
                      <Cell fill="#f97316" />
                      <Cell fill="#a855f7" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-3xl font-black text-slate-900">{tasks.length}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8">
                {[
                  { label: 'Calls', color: 'bg-blue-500' },
                  { label: 'WhatsApp', color: 'bg-emerald-500' },
                  { label: 'Emails', color: 'bg-orange-500' },
                  { label: 'Meetings', color: 'bg-purple-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-full", item.color)}></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AnalyticsPage = ({ leads, tasks }: { leads: any[], tasks: any[] }) => {
  // Calculate metrics
  const wonValue = leads.filter(l => l.status === 'Won').reduce((sum, l) => sum + (l.value || 0), 0);
  const pipelineValue = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').reduce((sum, l) => sum + (l.value || 0), 0);
  
  const statusCounts = leads.reduce((acc: any, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  
  const memberPerformance = TEAM_MEMBERS.map(m => {
    const mLeads = leads.filter(l => l.assigneeId === m.id);
    return {
      name: m.name.split(' ')[0],
      leads: mLeads.length,
      value: mLeads.reduce((sum, l) => sum + (l.value || 0), 0) / 100000 // In Lakhs
    };
  });

  return (
    <div className="p-8 space-y-8 pb-20">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Pipeline" value={`₹${(pipelineValue / 1000000).toFixed(1)}M`} icon={TrendingUp} color="bg-indigo-500" />
        <StatCard label="Won Revenue" value={`₹${(wonValue / 1000000).toFixed(1)}M`} icon={Zap} color="bg-emerald-500" />
        <StatCard label="Active Leads" value={leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').length} icon={Users} color="bg-blue-500" />
        <StatCard label="Closing Rate" value={`${((leads.filter(l => l.status === 'Won').length / Math.max(leads.length, 1)) * 100).toFixed(1)}%`} icon={BarChart3} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Pipeline */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Revenue Growth</h3>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { name: 'Week 1', revenue: 400000 },
                { name: 'Week 2', revenue: 700000 },
                { name: 'Week 3', revenue: 1200000 },
                { name: 'Week 4', revenue: 1950000 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(value) => `₹${value/1000}k`} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Performance */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Team Performance (₹ Lakhs)</h3>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Funnel Breakdown */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Pipeline Mix</h3>
          <div className="w-full h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ef4444', '#94a3b8'][index % 6]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ef4444', '#94a3b8'][i % 6] }}></div>
                <span className="text-slate-500 truncate">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Aging */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Lead Velocity</h3>
          <p className="text-sm text-slate-500 mb-8">Average days spent in each pipeline stage</p>
          <div className="space-y-6">
            {[
              { stage: 'New', days: 2, target: 1, color: 'bg-indigo-500' },
              { stage: 'Contacted', days: 4, target: 3, color: 'bg-blue-500' },
              { stage: 'Qualified', days: 12, target: 7, color: 'bg-amber-500' },
              { stage: 'Proposal', days: 18, target: 10, color: 'bg-rose-500' },
            ].map(item => (
              <div key={item.stage}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-slate-700">{item.stage}</span>
                  <span className="text-xs font-bold text-slate-500">{item.days} days <span className="text-slate-300">/ target: {item.target}d</span></span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((item.days / 20) * 100, 100)}%` }}
                    className={cn("h-full rounded-full", item.days > item.target ? item.color : 'bg-emerald-500')}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = ({ user, onUserUpdate }: { user: any, onUserUpdate?: (user: any) => void }) => {
  const [settings, setSettings] = useState(user?.settings || {
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    whatsappCountryCode: '+91',
    notifications: {
      emailReminders: false,
      dailySummary: false,
      weeklyReport: false,
      inAppNotifications: true,
    },
    defaultFollowUpDays: 3,
  });
  
  const [profileData, setProfileData] = useState({
    name: user?.name || 'User',
    email: user?.email || '',
    phone: user?.phone || '',
    company: user?.company || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [whatsappCountryCode, setWhatsappCountryCode] = useState(settings.whatsappCountryCode || '+91');
  const [currency, setCurrency] = useState(settings.currency || 'INR');
  const [notifications, setNotifications] = useState(settings.notifications || {
    whatsapp: true,
    email: false,
    push: true,
    dailyDigest: true
  });
  const [profileImage, setProfileImage] = useState<string | null>(user?.profileImage || null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Sync profileImage when user updates
  useEffect(() => {
    if (user?.profileImage && user.profileImage !== profileImage) {
      setProfileImage(user.profileImage);
    }
  }, [user?.profileImage]);

  // Fetch fresh user data when SettingsPage is opened (lazy loading)
  useEffect(() => {
    const fetchFreshUserData = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          if (currentUser.profileImage) {
            setProfileImage(currentUser.profileImage);
          }
          setSettings(currentUser.settings || settings);
          setProfileData({
            name: currentUser.name || 'User',
            email: currentUser.email || '',
            phone: currentUser.phone || '',
            company: currentUser.company || '',
          });
          if (onUserUpdate) onUserUpdate(currentUser);
        }
      } catch (error) {
        console.error('Failed to fetch fresh user data:', error);
      }
    };
    fetchFreshUserData();
  }, []);

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // Save only profile data (name, email, phone, company)
      const updatePayload = {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        company: profileData.company,
      };

      const updated = await authService.updateProfile(updatePayload);
      setProfileData({
        name: updated.name,
        email: updated.email,
        phone: updated.phone || '',
        company: updated.company || '',
      });
      if (onUserUpdate) onUserUpdate(updated);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Save profile error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileImageUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast.error('No file selected');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('followupx_token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/uploads/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error?.message || responseData.message || `Upload failed with status ${response.status}`);
      }

      if (!responseData.success || !responseData.data || !responseData.data.url) {
        throw new Error('Invalid response from server. No URL returned.');
      }

      const imageUrl = responseData.data.url;
      setProfileImage(imageUrl);

      // Auto-save the profile image to backend
      try {
        const updated = await authService.updateProfile({ profileImage: imageUrl });
        if (updated.profileImage) {
          setProfileImage(updated.profileImage);
        }
        if (onUserUpdate) onUserUpdate(updated);
        toast.success('Profile picture saved successfully');
      } catch (saveError) {
        console.error('Failed to save profile image to database:', saveError);
        toast.error('Image uploaded but failed to save to profile. Please try saving profile manually.');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Save only settings (currency, notifications, whatsapp code, etc)
      const updatePayload = {
        settings: {
          ...settings,
          whatsappCountryCode,
          currency,
          notifications
        }
      };

      const updated = await authService.updateProfile(updatePayload);
      setSettings(updated.settings || settings);
      if (onUserUpdate) {
        onUserUpdate(updated);
      }
      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Settings save error:', error);
      toast.error(error?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="space-y-8">
        {/* Profile Section */}
        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Account Profile</h3>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-6 mb-6">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 overflow-hidden flex items-center justify-center">
                  {profileImage ? (
                    <img src={profileImage} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {(profileData.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <label htmlFor="profile-upload" className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 shadow-lg hover:text-emerald-500 transition-colors cursor-pointer">
                  {uploadingImage ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
                </label>
                <input 
                  id="profile-upload"
                  type="file" 
                  accept="image/*" 
                  onChange={handleProfileImageUpload}
                  disabled={uploadingImage}
                  className="hidden" 
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{profileData.name}</p>
                <p className="text-xs text-slate-500">{profileData.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Full Name</label>
                <input 
                  value={profileData.name} 
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Email Address</label>
                <input 
                  value={profileData.email} 
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  type="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Phone Number</label>
                <input 
                  value={profileData.phone} 
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  type="tel"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Company</label>
                <input 
                  value={profileData.company} 
                  onChange={(e) => setProfileData({...profileData, company: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                />
              </div>
            </div>
            <button 
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </section>

        {/* WhatsApp Configuration */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">WhatsApp Integration</h3>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded">CONNECTED</span>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">Default Country Code</p>
                  <p className="text-xs text-slate-500">Prefix added to phone numbers if missing</p>
                </div>
                <input 
                  value={whatsappCountryCode} 
                  onChange={(e) => setWhatsappCountryCode(e.target.value)}
                  className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-center font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                />
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">WhatsApp Reminder Nudges</p>
                  <p className="text-xs text-slate-500">Send automatic reminders to yourself on WhatsApp</p>
                </div>
                <button 
                  onClick={() => toggleNotification('whatsapp')}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    notifications.whatsapp ? "bg-emerald-500" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    notifications.whatsapp ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">App Preferences</h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                    <Bell size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Email Notifications</p>
                    <p className="text-xs text-slate-500">Weekly performance summary and lead reports</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleNotification('email')}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    notifications.email ? "bg-emerald-500" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    notifications.email ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Daily Digest</p>
                    <p className="text-xs text-slate-500">Morning briefing of today's tasks at 8:00 AM</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleNotification('dailyDigest')}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    notifications.dailyDigest ? "bg-emerald-500" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    notifications.dailyDigest ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Currency Settings</p>
                    <p className="text-xs text-slate-500">Used for deal values and revenue tracking</p>
                  </div>
                </div>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="AED">AED (د.إ) - UAE Dirham</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-red-800">Delete Workspace</p>
              <p className="text-xs text-red-600">Permanently delete all lead data, tasks, and history.</p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors">
              Delete All Data
            </button>
          </div>
        </section>

        <div className="pt-4 pb-8 flex justify-end gap-3">
          <button className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
            Cancel Changes
          </button>
          <button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg shadow-slate-200">
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RecoveryPage = ({ leads, tasks }: { leads: any[], tasks: any[] }) => {
  const coldLeads = leads.filter(l => {
    const lastContactDate = l.lastContacted === '-' ? new Date(l.date) : new Date(l.lastContacted);
    const today = new Date('2026-01-31');
    const diffTime = Math.abs(today.getTime() - lastContactDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Check if there are any upcoming tasks
    const hasUpcomingTask = tasks.some(t => t.leadId === l.id && t.status === 'Pending');
    
    return diffDays > 7 && !hasUpcomingTask && l.status !== 'Won' && l.status !== 'Lost';
  }).map(l => ({
    ...l,
    lastContact: l.lastContacted === '-' ? `Added ${l.date}` : l.lastContacted,
    reason: l.lastContacted === '-' ? 'Lead added but never contacted' : `No follow-up activity for ${Math.ceil(Math.abs(new Date('2026-01-31').getTime() - new Date(l.lastContacted).getTime()) / (1000 * 60 * 60 * 24))} days`,
    strategy: l.status === 'Proposal' ? 'Send follow-up WhatsApp with client testimonial' : 'Send re-engagement WhatsApp: "Quick check-in"'
  }));

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4 p-6 bg-emerald-600 rounded-3xl text-white shadow-xl shadow-emerald-200">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
          <Zap size={32} fill="white" />
        </div>
        <div>
          <h2 className="text-2xl font-black">AI Lead Recovery</h2>
          <p className="text-emerald-100 font-medium">We found {coldLeads.length} leads that need urgent attention to prevent loss.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {coldLeads.length > 0 ? coldLeads.map((lead, i) => (
          <motion.div 
            key={lead.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-start relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                i < 2 ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
              )}>
                {i < 2 ? "Urgent Risk" : "Moderate Risk"}
              </span>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-xl font-black text-slate-400">
                  {lead.name[0]}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{lead.name}</h3>
                  <p className="text-sm text-slate-500 font-medium">{lead.company} • {lead.status} • ₹{lead.value.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">AI Analysis</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                    Last activity: {lead.lastContact}
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                    {lead.reason}
                  </li>
                </ul>
              </div>
            </div>

            <div className="w-full md:w-80 space-y-4 shrink-0">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Recommended Strategy</p>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">{lead.strategy}</p>
              </div>
              <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2">
                Take Action Now
                <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )) : (
          <div className="bg-white p-20 rounded-3xl border border-slate-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare size={32} />
            </div>
            <p className="text-slate-500 font-bold">Great job! All active leads have upcoming follow-ups scheduled.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  // --- State hooks (must be at top) ---
  const [authState, setAuthState] = useState<AuthState>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [activeTab, setActiveTab] = useState('today'); // Changed from 'dashboard' - PRIMARY landing page
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [leads, setLeads] = useState<UiLead[]>(INITIAL_LEADS);
  const [tasks, setTasks] = useState<UiTask[]>(INITIAL_TASKS as UiTask[]);
  const [notes, setNotes] = useState(INITIAL_NOTES);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isLeadDrawerOpen, setIsLeadDrawerOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  // Show modal on first app load for today's action item
  const [showTodayActionModal, setShowTodayActionModal] = useState(false);
  useEffect(() => {
    // Only show on first load (not after reloads or tab switches)
    if (authState === 'authenticated' && !window.sessionStorage.getItem('todayActionModalShown')) {
      setShowTodayActionModal(true);
      window.sessionStorage.setItem('todayActionModalShown', '1');
    }
  }, [authState]);

  // Add Note Handler
  const handleAddNote = (note: any) => {
    setNotes(prev => [note, ...prev]);
    setIsAddNoteOpen(false);
    toast.success('Note added!');
  };
  // Add Task Handler
  const handleAddTask = async (task: any) => {
    try {
      // Prepare payload for API
      const payload = {
        title: task.title,
        type: task.type?.toLowerCase() || 'call',
        priority: task.priority?.toLowerCase() || 'medium',
        leadId: task.leadId,
        dueDate: task.dueDate || task.date,
        dueTime: task.time || '',
      };
      const created = await taskService.createTask(payload);
      const mapped = mapTaskFromApi(created);
      setTasks(prev => [mapped, ...prev]);
      toast.success('Task added!');
      setIsAddTaskOpen(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add task');
    }
  };
  const [isImportLeadsOpen, setIsImportLeadsOpen] = useState(false);
  const [isEditLeadOpen, setIsEditLeadOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ id: string, status: string } | null>(null);
  const [isLostLeadModalOpen, setIsLostLeadModalOpen] = useState(false);
  const [lostLeadPending, setLostLeadPending] = useState<{ id: string, name: string } | null>(null);

  const [isLogCallOpen, setIsLogCallOpen] = useState(false);
  const [isTaskOutcomeOpen, setIsTaskOutcomeOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [leadActivities, setLeadActivities] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsLoadedRef, setAnalyticsLoadedRef] = useState(false);

  // Fetch activities for a specific lead
  const fetchLeadActivities = useCallback(async (leadId: string) => {
    try {
      const data = await activityService.getLeadActivities(leadId, { limit: 50 });
      const mappedActivities = data.activities.map((a: any) => ({
        id: a._id,
        leadId: a.leadId,
        content: a.description || a.title,
        title: a.title,
        type: a.type,
        date: new Date(a.createdAt).toISOString().split('T')[0],
        time: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timelineType: 'activity'
      }));
      setLeadActivities(mappedActivities);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setLeadActivities([]);
    }
  }, []);

  // Fetch dashboard analytics data - only when needed
  // Prevents duplicate calls using ref-based deduplication
  const fetchDashboardAnalytics = useCallback(async (forceRefresh = false) => {
    // Prevent duplicate calls while one is already in progress
    if (isLoadingAnalytics && !forceRefresh) return;
    // Skip if already loaded and not forcing refresh
    if (analyticsLoadedRef && !forceRefresh) return;
    
    setIsLoadingAnalytics(true);
    try {
      const [overview, funnel, activityAnalytics] = await Promise.all([
        analyticsService.getOverview().catch(err => {
          console.error('Failed to fetch overview:', err);
          return null;
        }),
        analyticsService.getFunnel().catch(err => {
          console.error('Failed to fetch funnel:', err);
          return null;
        }),
        analyticsService.getActivityAnalytics().catch(err => {
          console.error('Failed to fetch activity analytics:', err);
          return null;
        })
      ]);

      setAnalyticsData({
        overview,
        funnel,
        activityAnalytics
      });
      setAnalyticsLoadedRef(true);
    } catch (error) {
      console.error('Failed to fetch dashboard analytics:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [isLoadingAnalytics, analyticsLoadedRef]);

  // Handle lead click - fetch activities and open drawer
  const handleLeadClick = useCallback(async (lead: any) => {
    setSelectedLead(lead);
    setIsLeadDrawerOpen(true);
    await fetchLeadActivities(lead.id);
  }, [fetchLeadActivities]);

  const loadInitialData = useCallback(async () => {
    setIsBootstrapping(true);
    try {
      // Load leads and tasks in parallel
      const [{ leads: apiLeads }, dashboard] = await Promise.all([
        leadService.getLeads({ limit: 50 }),
        taskService.getTodaysDashboard().catch(() => ({ overdue: [], today: [], upcoming: [] }))
      ]);

      setLeads(apiLeads.map(mapLeadFromApi));

      const tasksCombined = [
        ...(dashboard?.overdue || []),
        ...(dashboard?.today || []),
        ...(dashboard?.upcoming || [])
      ];
      setTasks(tasksCombined.map(mapTaskFromApi));
      
      // DO NOT fetch analytics here - let tab-specific handlers do it
      // This prevents unnecessary API calls when user is on other tabs
    } catch (error: any) {
      toast.error(error?.message || 'Failed to sync data');
    } finally {
      setIsBootstrapping(false);
    }
  }, []);

  const handleAuthSuccess = useCallback(async (currentUser?: User | null) => {
    try {
      setAuthState('authenticated');
      if (!currentUser) {
        currentUser = await authService.getCurrentUser();
      }
      setUser(currentUser || null);
      await loadInitialData();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to restore session');
    }
  }, [loadInitialData]);

  useEffect(() => {
    // Auto-restore session if token exists
    const token = getAuthToken();
    if (token) {
      handleAuthSuccess();
    }
  }, [handleAuthSuccess]);

  // TAB-SPECIFIC API LOADING
  // Only fetch analytics when dashboard tab is active
  useEffect(() => {
    if (activeTab === 'dashboard' && authState === 'authenticated') {
      // Only fetch if not already loaded
      fetchDashboardAnalytics();
    }
  }, [activeTab, authState, fetchDashboardAnalytics]);

  const handleAddLead = async (lead: any) => {
    try {
      const [first, ...rest] = lead.name.split(' ');
      // TODO: Implement add lead logic here
      // Example: await leadService.addLead({ ... })
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add lead');
    }
  };

  const triggerStatusUpdate = (id: string, status: string) => {
    // If marking as lost, show the reason modal instead
    if (status.toLowerCase() === 'lost') {
      const lead = leads.find(l => l.id === id);
      if (lead) {
        setLostLeadPending({ id, name: lead.name });
        setIsLostLeadModalOpen(true);
      }
      return;
    }
    
    setPendingStatusUpdate({ id, status });
    setIsConfirmOpen(true);
  };

  const confirmStatusUpdate = async () => {
    if (pendingStatusUpdate) {
      await handleUpdateLeadStatus(pendingStatusUpdate.id, pendingStatusUpdate.status);
      setPendingStatusUpdate(null);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string, lostReason?: string) => {
    try {
      const apiStatus = newStatus.toLowerCase();
      const reasonToSend = apiStatus === 'lost' ? lostReason : undefined;
      const updated = await leadService.updateLeadStatus(leadId, apiStatus, reasonToSend);
      const mapped = mapLeadFromApi(updated);
      setLeads(prevLeads => prevLeads.map(lead => 
        lead.id === leadId ? mapped : lead
      ));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(mapped);
      }
      // Show appropriate toast
      if (apiStatus === 'lost') {
        toast.success(`Lead marked as lost (${lostReason})`);
      } else {
        toast.success(`Status updated to ${newStatus}`);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update status');
    }
  };

  // Handle WhatsApp Click-to-Chat
  const handleWhatsAppClick = async (lead: any) => {
    try {
      const token = localStorage.getItem('followupx_token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/whatsapp/generate-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id || lead._id,
          templateId: null,
          customMessage: null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate WhatsApp link');
      }

      const data = await response.json();

      // Log activity
      try {
        await activityService.createActivity({
          leadId: lead.id || lead._id,
          type: 'whatsapp_initiated',
          title: `WhatsApp message initiated`,
          description: `Initiated WhatsApp contact with ${lead.name}`
        });
      } catch (actError) {
        console.warn('Failed to log activity:', actError);
      }

      // Open WhatsApp with pre-filled message
      window.open(data.data.link, '_blank');
      toast.success('Opening WhatsApp...');
    } catch (error: any) {
      console.error('WhatsApp error:', error);
      toast.error(error.message || 'Failed to open WhatsApp');
    }
  };

  const handleImportLeadsCSV = async (leads: any[]) => {
    try {
      let importedCount = 0;
      for (const leadData of leads) {
        try {
          await leadService.createLead({
            name: `${leadData.name}`,
            phone: leadData.phone,
            email: leadData.email,
            company: leadData.company || '',
            source: leadData.source || 'import',
            status: leadData.status || 'new',
            estimatedValue: leadData.estimatedValue || 0,
            notes: `Imported from CSV on ${new Date().toLocaleDateString()}`
          });
          importedCount++;
        } catch (leadErr) {
          console.warn(`Failed to import lead ${leadData.name}:`, leadErr);
        }
      }
      
      if (importedCount > 0) {
        toast.success(`Successfully imported ${importedCount} lead(s)`);
        await loadInitialData();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to import leads');
    }
  };

  const pageTitle = useMemo(() => {
    switch (activeTab) {
      case 'today': return '📋 Today\'s Action Items';
      case 'dashboard': return 'Today\'s Overview';
      case 'leads': return 'Lead Directory';
      case 'tasks': return 'Follow-up Manager';
      case 'team': return 'Team Management';
      case 'recovery': return 'AI Lead Recovery';
      case 'templates': return 'Message Templates';
      case 'analytics': return 'Performance Stats';
      case 'settings': return 'App Settings';
      default: return 'Overview';
    }
  }, [activeTab]);

  if (authState === 'landing') {
    return <LandingPage onAuthSuccess={handleAuthSuccess} />;
  }

  if (authState === 'onboarding') {
    return <OnboardingWizard onComplete={() => handleAuthSuccess(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      <Toaster position="top-right" richColors />
      {isBootstrapping && (
        <div className="fixed top-4 right-4 z-[9999] px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-md text-sm font-semibold text-slate-600">
          Syncing with FollowUpX…
        </div>
      )}
      {/* Sidebar: Remove separate side menu for today's action item */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        user={user}
        onLogout={() => {
          authService.logout();
          setUser(null);
          setAuthState('unauthenticated');
          window.location.href = '/login';
        }}
      />
            {/* Modal for today's action item on first load */}
            <TodayActionModal
              open={showTodayActionModal}
              onClose={() => setShowTodayActionModal(false)}
              tasks={tasks}
              onActionClick={(task) => {
                setActiveTab('tasks');
                setActiveTask(task);
                setIsTaskOutcomeOpen(true);
              }}
            />
      
      <main className="lg:ml-64 min-h-screen flex flex-col transition-all duration-300">
        <Header 
          title={pageTitle} 
          onAddLeadClick={() => setIsAddLeadOpen(true)} 
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'today' && (
                <TodayDashboard
                  leads={leads}
                  tasks={tasks}
                  onTaskComplete={async (taskId: string) => {
                    await taskService.completeTask(taskId, { outcome: 'completed' });
                    await loadInitialData();
                  }}
                  onWhatsAppClick={(lead: any) => { setSelectedLead(lead); setIsWhatsAppOpen(true); }}
                  onTaskNavigate={(task: any) => {
                    setActiveTask(task);
                    setActiveTab('tasks');
                  }}
                />
              )}
              {activeTab === 'dashboard' && (
                <DashboardPage 
                  leads={leads} 
                  tasks={tasks}
                  analyticsData={analyticsData}
                  isLoadingAnalytics={isLoadingAnalytics}
                  user={user}
                  onTaskAction={(task: any, action: string) => {
                    setActiveTask(task);
                    if (action === 'open') {
                      setActiveTab('tasks');
                      return;
                    }
                    if (action === 'complete') setIsTaskOutcomeOpen(true);
                    if (action === 'reschedule') setIsRescheduleOpen(true);
                  }}
                />
              )}
              {activeTab === 'leads' && (
                <LeadsPage
                  leads={leads}
                  onLeadClick={handleLeadClick}
                  onWhatsAppClick={(lead: any) => { setSelectedLead(lead); setIsWhatsAppOpen(true); }}
                  onImportClick={() => setIsImportLeadsOpen(true)}
                />
              )}
              {activeTab === 'tasks' && (
                <TasksPage 
                  leads={leads} 
                  tasks={tasks} 
                  onTaskAction={(task: any, action: string) => {
                    setActiveTask(task);
                    if (action === 'complete') setIsTaskOutcomeOpen(true);
                    if (action === 'reschedule') setIsRescheduleOpen(true);
                  }}
                  onAddTask={() => {
                    setSelectedLead(leads[0]); 
                    setIsAddTaskOpen(true);
                  }} 
                />
              )}
              {activeTab === 'recovery' && <AIRecoveryPage onWhatsAppClick={handleWhatsAppClick} />}
              {activeTab === 'templates' && <TemplateLibrary />}
              {activeTab === 'team' && (
                <TeamPage
                  currentUserRole={(user?.role as 'owner' | 'manager' | 'rep') || 'owner'}
                  leads={leads}
                  onLeadAssigned={loadInitialData}
                />
              )}
              {activeTab === 'analytics' && <AnalyticsPage leads={leads} tasks={tasks} />}
              {activeTab === 'settings' && <SettingsPage user={user} onUserUpdate={setUser} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <WhatsAppModal 
        isOpen={isWhatsAppOpen} 
        onClose={() => setIsWhatsAppOpen(false)} 
        lead={selectedLead} 
      />

      <LostLeadModal
        isOpen={isLostLeadModalOpen}
        leadName={lostLeadPending?.name || ''}
        onConfirm={async (reason) => {
          if (lostLeadPending) {
            await handleUpdateLeadStatus(lostLeadPending.id, 'lost', reason);
            setIsLostLeadModalOpen(false);
            setLostLeadPending(null);
          }
        }}
        onCancel={() => {
          setIsLostLeadModalOpen(false);
          setLostLeadPending(null);
        }}
      />

      <AnimatePresence>
        {isLeadDrawerOpen && (
          <LeadDetailsDrawer
            isOpen={isLeadDrawerOpen}
            onClose={() => setIsLeadDrawerOpen(false)}
            lead={selectedLead}
            tasks={tasks}
            notes={notes}
            leadActivities={leadActivities}
            onAddTaskClick={() => setIsAddTaskOpen(true)}
            onAddNoteClick={() => setIsAddNoteOpen(true)}
            onWhatsAppClick={(l: any) => { setSelectedLead(l); setIsWhatsAppOpen(true); }}
            onLogCallClick={() => setIsLogCallOpen(true)}
            onUpdateStatus={triggerStatusUpdate}
            onEditClick={() => setIsEditLeadOpen(true)}
          />
        )}
      </AnimatePresence>

      <EditLeadModal 
        isOpen={isEditLeadOpen} 
        onClose={() => setIsEditLeadOpen(false)} 
        lead={selectedLead} 
        onUpdate={handleUpdateLeadStatus}
      />

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => { setIsConfirmOpen(false); setPendingStatusUpdate(null); }}
        onConfirm={confirmStatusUpdate}
        title="Change Lead Status?"
        message={`Are you sure you want to update ${selectedLead?.name}'s status to ${pendingStatusUpdate?.status}? This will update your pipeline analytics.`}
      />

      <AddTaskModal 
        isOpen={isAddTaskOpen} 
        onClose={() => setIsAddTaskOpen(false)} 
        lead={selectedLead} 
        onAdd={handleAddTask} 
      />

      <AddNoteModal 
        isOpen={isAddNoteOpen} 
        onClose={() => setIsAddNoteOpen(false)} 
        lead={selectedLead} 
        onAdd={handleAddNote} 
      />

      <AddLeadModal 
        isOpen={isAddLeadOpen} 
        onClose={() => setIsAddLeadOpen(false)} 
        onAdd={handleAddLead} 
        leads={leads}
      />

      <TaskOutcomeModal 
        isOpen={isTaskOutcomeOpen}
        onClose={() => setIsTaskOutcomeOpen(false)}
        task={activeTask}
        onComplete={async (outcome, notes) => {
          try {
            if (!activeTask) return;
            const payload = { outcome: uiOutcomeToApi(outcome), outcomeNotes: notes };
            const { task } = await taskService.completeTask(activeTask.id, payload);
            const mapped = mapTaskFromApi(task);
            setTasks(prev => prev.map(t => t.id === activeTask.id ? mapped : t));
            toast.success("Task completed!");
          } catch (error: any) {
            toast.error(error?.message || 'Failed to complete task');
          }
        }}
      />

      <RescheduleModal 
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        task={activeTask}
        onReschedule={async (date, time) => {
          try {
            if (!activeTask) return;
            // Combine date and time into ISO string
            let newDueDate = date;
            if (date && time) {
              // time is in HH:mm (24h) format
              newDueDate = `${date}T${time.length === 5 ? time : time.padStart(5, '0')}:00`;
            }
            const rescheduled = await taskService.rescheduleTask(activeTask.id, newDueDate, `Rescheduled to ${time}`);
            const mapped = mapTaskFromApi({ ...rescheduled, dueTime: time });
            setTasks(prev => prev.map(t => t.id === activeTask.id ? mapped : t));
            toast.success("Task rescheduled!");
          } catch (error: any) {
            toast.error(error?.message || 'Failed to reschedule task');
          }
        }}
      />

      <LogCallModal
        isOpen={isLogCallOpen}
        onClose={() => setIsLogCallOpen(false)}
        lead={selectedLead}
        onLog={async (log) => {
          try {
            const outcomeMap: Record<string, string> = {
              'Connected': 'successful',
              'Connected - Positive': 'successful',
              'Connected - Needs follow-up': 'callback_requested',
              'Connected - Not interested': 'not_interested',
              'No answer': 'no_answer',
              'Busy': 'rescheduled',
              'Wrong number': 'other',
              'Voicemail': 'no_answer'
            };
            const activity = await activityService.logCall({
              leadId: selectedLead.id,
              duration: log.duration,
              outcome: outcomeMap[log.outcome] || 'other',
              notes: log.notes,
              direction: 'outgoing'
            });
            setNotes(prev => [{
              id: activity._id,
              leadId: selectedLead.id,
              content: `📞 Call Logged: ${log.outcome}. Notes: ${log.notes}`,
              date: new Date(activity.createdAt).toISOString().split('T')[0],
              time: new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }, ...prev]);
            toast.success("Call activity saved!");
          } catch (error: any) {
            toast.error(error?.message || 'Failed to log call');
          }
        }}
      />

      <ImportLeadsModal
        isOpen={isImportLeadsOpen}
        onClose={() => setIsImportLeadsOpen(false)}
        onImported={loadInitialData}
      />

      <CSVImportModal
        isOpen={false}
        onClose={() => {}}
        onConfirm={handleImportLeadsCSV}
      />

      {/* Floating Action Button - Hide on mobile with bottom nav */}
      <div className="fixed bottom-8 right-8 z-40 hidden lg:flex">
        <button 
          onClick={() => { setSelectedLead(leads[1]); setIsWhatsAppOpen(true); }}
          className="w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-200 flex items-center justify-center hover:scale-110 transition-transform active:scale-95 group relative"
        >
          <MessageSquare size={24} />
          <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Quick Message
          </span>
        </button>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Bottom padding for mobile to account for nav */}
      <div className="h-20 lg:h-0" />
    </div>
  );
}
