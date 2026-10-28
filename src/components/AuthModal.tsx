import React, { useState } from 'react';
import { X, User, Shield, Layers, AlertCircle, Sparkles, Lock, Phone } from 'lucide-react';
import { UserSession } from '../types.ts';
import { apiFetch, setStoredToken } from '../utils/api.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'customer' | 'team';
  onLoginSuccess: (user: UserSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'customer',
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<'customer' | 'team'>(defaultTab);

  // Customer state
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');

  // Team state
  const [teamIdentifier, setTeamIdentifier] = useState('');
  const [teamPassword, setTeamPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!custName.trim()) {
      setError('Please enter your name.');
      return;
    }
    const cleanNum = custPhone.replace(/\D/g, '');
    if (cleanNum.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: custName, phone: custPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }
      if (data.token) {
        setStoredToken(data.token);
      }
      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!teamIdentifier.trim() || !teamPassword) {
      setError('Please enter both identifier (email or mobile) and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: teamIdentifier,
          password: teamPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }
      if (data.token) {
        setStoredToken(data.token);
      }
      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'admin' | 'freelancer' | 'customer') => {
    setError(null);
    if (role === 'customer') {
      setTab('customer');
      setCustName('Aman Verma');
      setCustPhone('9871234567');
    } else if (role === 'admin') {
      setTab('team');
      setTeamIdentifier('9876543210');
      setTeamPassword('admin123');
    } else if (role === 'freelancer') {
      setTab('team');
      setTeamIdentifier('9123456780');
      setTeamPassword('editor123');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto no-scrollbar modal-scroll-lock">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-8 max-h-[92vh] overflow-y-auto no-scrollbar scrollbar-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Welcome to Cutline Studio
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Sign in to place orders, track editing workflows, or access team dashboards.
          </p>
        </div>

        {/* Tab Selectors */}
        <div className="flex rounded-xl bg-slate-950 p-1 mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setTab('customer');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              tab === 'customer'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Customer Login</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('team');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              tab === 'team'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Team / Admin Login</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Customer Login Form */}
        {tab === 'customer' && (
          <form onSubmit={handleCustomerLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Aman Verma"
                value={custName}
                onChange={e => setCustName(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                10-Digit Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-semibold text-slate-500">
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Any valid 10-digit number auto-registers you instantly. No password required.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Continue to Order Form'}
            </button>
          </form>
        )}

        {/* Team Login Form */}
        {tab === 'team' && (
          <form onSubmit={handleTeamLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mobile Number or Email
              </label>
              <input
                type="text"
                placeholder="9876543210 or admin@cutlinestudio.com"
                value={teamIdentifier}
                onChange={e => setTeamIdentifier(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={teamPassword}
                onChange={e => setTeamPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Security note: 5 failed attempts locks login for 15 minutes.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-500 active:scale-98 shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
            </button>
          </form>
        )}

        {/* 1-Click Demo Logins for Fast Review */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Quick Fill Demo Credentials:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('admin')}
              className="px-2 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-[11px] font-semibold text-purple-300 text-center transition-colors"
            >
              👑 Owner
            </button>
            <button
              type="button"
              onClick={() => fillDemo('freelancer')}
              className="px-2 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-[11px] font-semibold text-blue-300 text-center transition-colors"
            >
              🎬 Editor
            </button>
            <button
              type="button"
              onClick={() => fillDemo('customer')}
              className="px-2 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-[11px] font-semibold text-emerald-300 text-center transition-colors"
            >
              👤 Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
