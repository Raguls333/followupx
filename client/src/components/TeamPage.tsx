/**
 * Team Management Page
 * Handles team members, invitations, role management, and lead assignment
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  MoreVertical,
  Trash2,
  Edit3,
  UserCheck,
  X,
  Search,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Target,
  Phone,
  Building,
  Calendar,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';
import { teamService, leadService } from '../services';
import type { TeamMember, Lead } from '../services';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TeamPageProps {
  currentUserRole: 'owner' | 'manager' | 'rep';
  leads: Array<{
    id: string;
    name: string;
    phone: string;
    email?: string;
    company?: string;
    status: string;
    value: number;
    assigneeId?: string;
  }>;
  onLeadAssigned?: () => void;
}

interface TeamMemberUI {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'owner' | 'manager' | 'rep';
  avatar?: string;
  stats: {
    leadsCount: number;
    pendingTasks: number;
    completedTasksLast30Days: number;
  };
  createdAt?: string;
}

// Invite Member Modal
const InviteMemberModal = ({
  isOpen,
  onClose,
  onInvite,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: 'manager' | 'rep') => Promise<void>;
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'rep'>('rep');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await onInvite(email.trim(), role);
      setEmail('');
      setRole('rep');
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <UserPlus size={20} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Invite Team Member</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('rep')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  role === 'rep'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Users size={18} className={role === 'rep' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span className={cn('font-semibold', role === 'rep' ? 'text-emerald-700' : 'text-slate-700')}>
                    Sales Rep
                  </span>
                </div>
                <p className="text-xs text-slate-500">Can manage assigned leads and tasks</p>
              </button>

              <button
                type="button"
                onClick={() => setRole('manager')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  role === 'manager'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={18} className={role === 'manager' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span className={cn('font-semibold', role === 'manager' ? 'text-emerald-700' : 'text-slate-700')}>
                    Manager
                  </span>
                </div>
                <p className="text-xs text-slate-500">Can assign leads to team members</p>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Mail size={18} />
                  Send Invite
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Update Role Modal
const UpdateRoleModal = ({
  isOpen,
  onClose,
  member,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMemberUI | null;
  onUpdate: (memberId: string, role: 'manager' | 'rep') => Promise<void>;
}) => {
  const [role, setRole] = useState<'manager' | 'rep'>('rep');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member && member.role !== 'owner') {
      setRole(member.role);
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setIsSubmitting(true);
    try {
      await onUpdate(member._id, role);
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Edit3 size={20} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Update Role</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{member.name}</p>
              <p className="text-sm text-slate-500">{member.email}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              New Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('rep')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  role === 'rep'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Users size={18} className={role === 'rep' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span className={cn('font-semibold', role === 'rep' ? 'text-emerald-700' : 'text-slate-700')}>
                    Sales Rep
                  </span>
                </div>
                <p className="text-xs text-slate-500">Can manage assigned leads</p>
              </button>

              <button
                type="button"
                onClick={() => setRole('manager')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  role === 'manager'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={18} className={role === 'manager' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span className={cn('font-semibold', role === 'manager' ? 'text-emerald-700' : 'text-slate-700')}>
                    Manager
                  </span>
                </div>
                <p className="text-xs text-slate-500">Can assign leads to team</p>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || role === member.role}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle size={18} />
                  Update Role
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Remove Member Confirmation Modal
const RemoveMemberModal = ({
  isOpen,
  onClose,
  member,
  onRemove,
}: {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMemberUI | null;
  onRemove: (memberId: string) => Promise<void>;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRemove = async () => {
    if (!member) return;

    setIsSubmitting(true);
    try {
      await onRemove(member._id);
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle size={20} className="text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Remove Member</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100">
            <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{member.name}</p>
              <p className="text-sm text-slate-500">{member.email}</p>
            </div>
          </div>

          <p className="text-slate-600">
            Are you sure you want to remove <strong>{member.name}</strong> from your team?
            Their assigned leads will need to be reassigned.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Trash2 size={18} />
                  Remove Member
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Assign Lead Modal
const AssignLeadModal = ({
  isOpen,
  onClose,
  leads,
  members,
  onAssign,
}: {
  isOpen: boolean;
  onClose: () => void;
  leads: TeamPageProps['leads'];
  members: TeamMemberUI[];
  onAssign: (leadId: string, userId: string, reason?: string) => Promise<void>;
}) => {
  const [selectedLead, setSelectedLead] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchLead, setSearchLead] = useState('');
  const [searchMember, setSearchMember] = useState('');

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchLead.toLowerCase()) ||
      lead.phone.includes(searchLead) ||
      lead.company?.toLowerCase().includes(searchLead.toLowerCase())
  );

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchMember.toLowerCase()) ||
      member.email.toLowerCase().includes(searchMember.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !selectedMember) return;

    setIsSubmitting(true);
    try {
      await onAssign(selectedLead, selectedMember, reason || undefined);
      setSelectedLead('');
      setSelectedMember('');
      setReason('');
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedLeadData = leads.find((l) => l.id === selectedLead);
  const selectedMemberData = members.find((m) => m._id === selectedMember);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <UserCheck size={20} className="text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Assign Lead</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Lead Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Lead
            </label>
            <div className="relative mb-2">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchLead}
                onChange={(e) => setSearchLead(e.target.value)}
                placeholder="Search leads..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
              {filteredLeads.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 text-center">No leads found</p>
              ) : (
                filteredLeads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setSelectedLead(lead.id)}
                    className={cn(
                      'w-full p-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100 last:border-0',
                      selectedLead === lead.id && 'bg-emerald-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm',
                        selectedLead === lead.id
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-br from-slate-400 to-slate-500'
                      )}
                    >
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{lead.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {lead.company || lead.phone} • {lead.status}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      ₹{lead.value.toLocaleString()}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Arrow Indicator */}
          {selectedLead && (
            <div className="flex justify-center">
              <ArrowRight size={24} className="text-emerald-500" />
            </div>
          )}

          {/* Member Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Assign To
            </label>
            <div className="relative mb-2">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder="Search team members..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 text-center">No team members found</p>
              ) : (
                filteredMembers.map((member) => (
                  <button
                    key={member._id}
                    type="button"
                    onClick={() => setSelectedMember(member._id)}
                    className={cn(
                      'w-full p-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100 last:border-0',
                      selectedMember === member._id && 'bg-purple-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm',
                        selectedMember === member._id
                          ? 'bg-purple-500'
                          : 'bg-gradient-to-br from-emerald-400 to-cyan-400'
                      )}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{member.name}</p>
                      <p className="text-xs text-slate-500 truncate">{member.email}</p>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-1 rounded-full',
                        member.role === 'owner'
                          ? 'bg-amber-100 text-amber-700'
                          : member.role === 'manager'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {member.role}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Assignment Preview */}
          {selectedLeadData && selectedMemberData && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-purple-50 rounded-xl border border-emerald-100">
              <p className="text-sm text-slate-600">
                Assigning <strong className="text-emerald-700">{selectedLeadData.name}</strong> to{' '}
                <strong className="text-purple-700">{selectedMemberData.name}</strong>
              </p>
            </div>
          )}

          {/* Reason (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Reason <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Better geographic coverage, specialized expertise..."
              rows={2}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedLead || !selectedMember}
              className="flex-1 px-4 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserCheck size={18} />
                  Assign Lead
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Member Card Component
const MemberCard = ({
  member,
  currentUserRole,
  onEditRole,
  onRemove,
}: {
  member: TeamMemberUI;
  currentUserRole: 'owner' | 'manager' | 'rep';
  onEditRole: (member: TeamMemberUI) => void;
  onRemove: (member: TeamMemberUI) => void;
}) => {
  const isOwner = member.role === 'owner';
  const canManage = currentUserRole === 'owner' && !isOwner;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border-2 border-slate-200 hover:border-emerald-300 p-6 hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300"
    >
      {/* Member Info */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-emerald-200/50">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div
            className={cn(
              'absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center',
              member.role === 'owner'
                ? 'bg-amber-400'
                : member.role === 'manager'
                ? 'bg-blue-400'
                : 'bg-slate-400'
            )}
          >
            {member.role === 'owner' ? (
              <Target size={12} className="text-white" />
            ) : member.role === 'manager' ? (
              <Shield size={12} className="text-white" />
            ) : (
              <Users size={12} className="text-white" />
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-slate-900 truncate">{member.name}</h3>
          <span
            className={cn(
              'inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full',
              member.role === 'owner'
                ? 'bg-amber-100 text-amber-700'
                : member.role === 'manager'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600'
            )}
          >
            {member.role === 'owner' ? 'Owner' : member.role === 'manager' ? 'Manager' : 'Sales Rep'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 text-center border border-slate-200">
          <p className="text-2xl font-bold text-slate-900">{member.stats.leadsCount}</p>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Leads</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 text-center border border-amber-200">
          <p className="text-2xl font-bold text-amber-600">{member.stats.pendingTasks}</p>
          <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">Pending</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 text-center border border-emerald-200">
          <p className="text-2xl font-bold text-emerald-600">{member.stats.completedTasksLast30Days}</p>
          <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">Done</p>
        </div>
      </div>

      {/* Action Buttons */}
      {canManage && (
        <div className="flex gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={() => onEditRole(member)}
            className="flex-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Edit3 size={14} />
            Change Role
          </button>
          <button
            onClick={() => onRemove(member)}
            className="flex-1 px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={14} />
            Remove
          </button>
        </div>
      )}
    </motion.div>
  );
};

// Main Team Page Component
export const TeamPage: React.FC<TeamPageProps> = ({ currentUserRole, leads, onLeadAssigned }) => {
  const [members, setMembers] = useState<TeamMemberUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isUpdateRoleOpen, setIsUpdateRoleOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isAssignLeadOpen, setIsAssignLeadOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberUI | null>(null);

  const [teamStats, setTeamStats] = useState<{
    totalLeads: number;
    activeLeads: number;
    totalTasks: number;
    completedTasksThisMonth: number;
  } | null>(null);

  const fetchTeamData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [membersData, statsData] = await Promise.all([
        teamService.getMembers(),
        teamService.getTeamStats(),
      ]);

      setMembers(membersData.members as TeamMemberUI[]);
      setTeamStats(statsData.team);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team data');
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const handleInviteMember = async (email: string, role: 'manager' | 'rep') => {
    try {
      await teamService.inviteMember(email, role);
      toast.success(`Invitation sent to ${email}`);
      fetchTeamData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite');
      throw err;
    }
  };

  const handleUpdateRole = async (memberId: string, role: 'manager' | 'rep') => {
    try {
      await teamService.updateMemberRole(memberId, role);
      toast.success('Role updated successfully');
      fetchTeamData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
      throw err;
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await teamService.removeMember(memberId);
      toast.success('Member removed successfully');
      fetchTeamData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
      throw err;
    }
  };

  const handleAssignLead = async (leadId: string, userId: string, reason?: string) => {
    try {
      await teamService.assignLead(leadId, userId, reason);
      toast.success('Lead assigned successfully');
      onLeadAssigned?.();
      fetchTeamData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign lead');
      throw err;
    }
  };

  const isOwner = currentUserRole === 'owner';
  const canAssignLeads = currentUserRole === 'owner' || currentUserRole === 'manager';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading team data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-slate-700 font-semibold mb-2">Failed to load team</p>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchTeamData}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
        <div className="flex gap-3">
          {canAssignLeads && (
            <button
              onClick={() => setIsAssignLeadOpen(true)}
              className="px-5 py-2.5 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors flex items-center gap-2 shadow-lg shadow-purple-200"
            >
              <UserCheck size={18} />
              Assign Lead
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => setIsInviteOpen(true)}
              className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-200"
            >
              <UserPlus size={18} />
              Invite Member
            </button>
          )}
        </div>
      </div>

      {/* Team Stats */}
      {teamStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 hover:shadow-lg hover:shadow-blue-100/50 transition-all">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
              <Users size={24} className="text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{members.length}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Team Size</p>
          </div>

          <div className="bg-white rounded-2xl border-2 border-emerald-200 p-5 hover:shadow-lg hover:shadow-emerald-100/50 transition-all">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
              <Target size={24} className="text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{teamStats.totalLeads}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Total Leads</p>
          </div>

          <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 hover:shadow-lg hover:shadow-amber-100/50 transition-all">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
              <TrendingUp size={24} className="text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{teamStats.activeLeads}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Active Leads</p>
          </div>

          <div className="bg-white rounded-2xl border-2 border-purple-200 p-5 hover:shadow-lg hover:shadow-purple-100/50 transition-all">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
              <CheckCircle size={24} className="text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{teamStats.completedTasksThisMonth}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Tasks Done</p>
          </div>
        </div>
      )}

      {/* Team Members Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-5">Team Members</h2>
        {members.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
            <Users size={48} className="text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No team members yet</h3>
            <p className="text-slate-500 mb-5">Start building your team by inviting members</p>
            {isOwner && (
              <button
                onClick={() => setIsInviteOpen(true)}
                className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors inline-flex items-center gap-2"
              >
                <UserPlus size={18} />
                Invite First Member
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {members.map((member) => (
              <MemberCard
                key={member._id}
                member={member}
                currentUserRole={currentUserRole}
                onEditRole={(m) => {
                  setSelectedMember(m);
                  setIsUpdateRoleOpen(true);
                }}
                onRemove={(m) => {
                  setSelectedMember(m);
                  setIsRemoveOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isInviteOpen && (
          <InviteMemberModal
            isOpen={isInviteOpen}
            onClose={() => setIsInviteOpen(false)}
            onInvite={handleInviteMember}
          />
        )}

        {isUpdateRoleOpen && (
          <UpdateRoleModal
            isOpen={isUpdateRoleOpen}
            onClose={() => {
              setIsUpdateRoleOpen(false);
              setSelectedMember(null);
            }}
            member={selectedMember}
            onUpdate={handleUpdateRole}
          />
        )}

        {isRemoveOpen && (
          <RemoveMemberModal
            isOpen={isRemoveOpen}
            onClose={() => {
              setIsRemoveOpen(false);
              setSelectedMember(null);
            }}
            member={selectedMember}
            onRemove={handleRemoveMember}
          />
        )}

        {isAssignLeadOpen && (
          <AssignLeadModal
            isOpen={isAssignLeadOpen}
            onClose={() => setIsAssignLeadOpen(false)}
            leads={leads}
            members={members}
            onAssign={handleAssignLead}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamPage;
