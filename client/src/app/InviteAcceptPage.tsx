import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services';
import { toast } from 'sonner';

export default function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      // Call backend to accept invite and set password
      await authService.acceptInvite({ token, password, name });
      toast.success('Account created! Please log in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to accept invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Set Your Password</h2>
        <p className="text-slate-500 text-sm mb-4">Welcome! Please set a password to activate your account.</p>
        <div>
          <label className="block text-xs font-bold mb-1">Your Name</label>
          <input type="text" className="w-full px-4 py-3 border rounded-xl" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Password</label>
          <input type="password" className="w-full px-4 py-3 border rounded-xl" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Confirm Password</label>
          <input type="password" className="w-full px-4 py-3 border rounded-xl" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} />
        </div>
        <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors" disabled={loading}>
          {loading ? 'Setting Password...' : 'Activate Account'}
        </button>
      </form>
    </div>
  );
}
