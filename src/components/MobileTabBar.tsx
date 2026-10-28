import React, { useState } from 'react';
import { UserSession } from '../types.ts';
import {
  Home,
  Calculator,
  Shield,
  Layers,
  Sparkles,
  User,
  Download,
  Share2,
  CheckCircle2,
  X,
  PlusSquare,
  Smartphone,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface MobileTabBarProps {
  user: UserSession;
  activeView: 'home' | 'admin' | 'freelancer' | 'customer';
  setActiveView: (view: 'home' | 'admin' | 'freelancer' | 'customer') => void;
  onOpenOrderModal: () => void;
  onOpenAuth: (defaultTab?: 'customer' | 'team') => void;
  onQuickLogin: (role: 'admin' | 'freelancer' | 'customer') => void;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  user,
  activeView,
  setActiveView,
  onOpenOrderModal,
  onOpenAuth,
  onQuickLogin,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  const scrollToCalculator = () => {
    if (activeView !== 'home') {
      setActiveView('home');
      setTimeout(() => {
        document.getElementById('calculator-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('calculator-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-slate-950/92 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] transition-all"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {/* Home */}
          <button
            onClick={() => setActiveView('home')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
              activeView === 'home'
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl ${activeView === 'home' ? 'bg-indigo-600/20' : ''}`}>
              <Home className="w-4 h-4" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Home</span>
          </button>

          {/* Calculator */}
          <button
            onClick={scrollToCalculator}
            className="flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl text-slate-400 hover:text-slate-200 font-medium transition-all cursor-pointer"
          >
            <div className="p-1 rounded-xl">
              <Calculator className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Pricing</span>
          </button>

          {/* Center Action: Context-Aware Portal Button */}
          {user.role === 'admin' ? (
            <button
              onClick={() => setActiveView('admin')}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                activeView === 'admin'
                  ? 'text-purple-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div className={`p-1 rounded-xl ${activeView === 'admin' ? 'bg-purple-600/30' : ''}`}>
                <Shield className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Admin</span>
            </button>
          ) : user.role === 'freelancer' ? (
            <button
              onClick={() => setActiveView('freelancer')}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                activeView === 'freelancer'
                  ? 'text-blue-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div className={`p-1 rounded-xl ${activeView === 'freelancer' ? 'bg-blue-600/30' : ''}`}>
                <Layers className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">My Tasks</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (user.role === 'guest') {
                  onOpenAuth('customer');
                } else {
                  onOpenOrderModal();
                }
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 text-white group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 -mt-2 group-active:scale-95 transition-transform">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] tracking-tight font-bold text-indigo-300 mt-0.5">Order</span>
            </button>
          )}

          {/* Quick Demo Switcher / Profile */}
          <button
            onClick={() => setShowRoleModal(true)}
            className="flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl text-slate-400 hover:text-slate-200 font-medium transition-all cursor-pointer"
          >
            <div className="p-1 rounded-xl">
              <User className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 capitalize">
              {user.role === 'guest' ? 'Role Switch' : user.role}
            </span>
          </button>

          {/* PWA Install Button or Quick Auth */}
          {!isInstalled && (isInstallable || isIOS) ? (
            <button
              onClick={handleInstallClick}
              className="flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl text-indigo-300 font-semibold hover:text-white transition-all cursor-pointer"
            >
              <div className="p-1 rounded-xl bg-indigo-600/20 border border-indigo-500/30">
                <Download className="w-4 h-4 text-indigo-300 animate-pulse" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">App</span>
            </button>
          ) : user.role === 'guest' ? (
            <button
              onClick={() => onOpenAuth('customer')}
              className="flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl text-indigo-300 font-semibold hover:text-white transition-all cursor-pointer"
            >
              <div className="p-1 rounded-xl bg-indigo-600/20">
                <User className="w-4 h-4 text-indigo-300" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Login</span>
            </button>
          ) : null}
        </div>
      </nav>

      {/* Quick Role Switcher Modal for Mobile */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Switch Demo Role
              </span>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Instantly test Cutline Studio from any user perspective on mobile:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  onQuickLogin('admin');
                  setActiveView('admin');
                  setShowRoleModal(false);
                }}
                className={`w-full p-3 rounded-xl text-left border flex items-center justify-between transition-all ${
                  user.role === 'admin'
                    ? 'bg-purple-900/30 border-purple-500/50 text-purple-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Owner / Admin</div>
                    <div className="text-[10px] text-slate-400">Manage orders, payouts, team & backups</div>
                  </div>
                </div>
                {user.role === 'admin' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
              </button>

              <button
                onClick={() => {
                  onQuickLogin('freelancer');
                  setActiveView('freelancer');
                  setShowRoleModal(false);
                }}
                className={`w-full p-3 rounded-xl text-left border flex items-center justify-between transition-all ${
                  user.role === 'freelancer'
                    ? 'bg-blue-900/30 border-blue-500/50 text-blue-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Freelancer / Editor</div>
                    <div className="text-[10px] text-slate-400">Assigned videos, file submission & earnings</div>
                  </div>
                </div>
                {user.role === 'freelancer' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
              </button>

              <button
                onClick={() => {
                  onQuickLogin('customer');
                  setActiveView('home');
                  setShowRoleModal(false);
                }}
                className={`w-full p-3 rounded-xl text-left border flex items-center justify-between transition-all ${
                  user.role === 'customer'
                    ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Client / Customer</div>
                    <div className="text-[10px] text-slate-400">Track orders, invoices & live review</div>
                  </div>
                </div>
                {user.role === 'customer' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>

            <button
              onClick={() => setShowRoleModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span>Install on iPhone or iPad</span>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-xs">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-slate-800 text-indigo-400 font-bold shrink-0">1</div>
                <p className="text-slate-300">
                  Tap the <strong className="text-white">Share</strong> icon at the bottom of Safari.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-slate-800 text-indigo-400 font-bold shrink-0">2</div>
                <p className="text-slate-300">
                  Tap <strong className="text-white">Add to Home Screen</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 font-bold text-xs text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
