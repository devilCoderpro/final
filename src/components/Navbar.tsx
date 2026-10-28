import React, { useState } from 'react';
import { UserSession, AppConfig } from '../types.ts';
import {
  Video,
  Menu,
  X,
  LogOut,
  User,
  Shield,
  Layers,
  Sparkles,
  Sun,
  Moon,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface NavbarProps {
  user: UserSession;
  config: AppConfig | null;
  activeView: 'home' | 'admin' | 'freelancer' | 'customer';
  setActiveView: (view: 'home' | 'admin' | 'freelancer' | 'customer') => void;
  onOpenAuth: (defaultTab?: 'customer' | 'team') => void;
  onOpenOrderModal: () => void;
  onLogout: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onQuickLogin: (role: 'admin' | 'freelancer' | 'customer') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  config,
  activeView,
  setActiveView,
  onOpenAuth,
  onOpenOrderModal,
  onLogout,
  theme,
  toggleTheme,
  onQuickLogin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);

  return (
    <nav className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors ${
      theme === 'dark'
        ? 'bg-slate-950/80 border-slate-800/80'
        : 'bg-white/90 border-slate-200/90 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('home')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className={`text-lg sm:text-xl font-bold tracking-tight transition-colors ${
                  theme === 'dark' ? 'text-white group-hover:text-indigo-300' : 'text-slate-900 group-hover:text-indigo-600'
                }`}>
                  {config?.businessName || 'Cutline Studio'}
                </span>
                <span className={`hidden sm:block text-[11px] font-medium tracking-wide ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Video & Socials Engine
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-5">
            <button
              onClick={() => {
                setActiveView('home');
                const el = document.getElementById('services-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`text-sm font-medium transition-colors ${
                theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Services
            </button>
            <button
              onClick={() => {
                setActiveView('home');
                const el = document.getElementById('calculator-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Price Calculator</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                theme === 'dark' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                New
              </span>
            </button>

            <button
              onClick={() => {
                setActiveView('home');
                const el = document.getElementById('how-it-works-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`text-sm font-medium transition-colors ${
                theme === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              How It Works
            </button>

            {/* Quick Demo Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Quickly test any role"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Test Role: {user.role.toUpperCase()}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {demoMenuOpen && (
                <div
                  className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                  onClick={() => setDemoMenuOpen(false)}
                >
                  <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Instant Switch / Demo
                  </div>
                  <button
                    onClick={() => onQuickLogin('admin')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                      theme === 'dark' ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-purple-400" /> Owner (Admin)
                    </span>
                    {user.role === 'admin' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                  </button>
                  <button
                    onClick={() => onQuickLogin('freelancer')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                      theme === 'dark' ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-blue-400" /> Freelancer (Editor)
                    </span>
                    {user.role === 'freelancer' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                  </button>
                  <button
                    onClick={() => onQuickLogin('customer')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                      theme === 'dark' ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-emerald-400" /> Client (Customer)
                    </span>
                    {user.role === 'customer' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Role-Specific Portal Button */}
            {user.role === 'admin' && (
              <button
                onClick={() => setActiveView('admin')}
                className={`text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${
                  activeView === 'admin'
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-sm'
                    : theme === 'dark'
                      ? 'text-slate-300 border-slate-700/80 hover:bg-slate-800'
                      : 'text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                Admin Dashboard
              </button>
            )}

            {user.role === 'freelancer' && (
              <button
                onClick={() => setActiveView('freelancer')}
                className={`text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${
                  activeView === 'freelancer'
                    ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm'
                    : theme === 'dark'
                      ? 'text-slate-300 border-slate-700/80 hover:bg-slate-800'
                      : 'text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                My Orders & Tasks
              </button>
            )}

            {user.role === 'customer' && (
              <button
                onClick={onOpenOrderModal}
                className="text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Place New Order
              </button>
            )}
          </div>

          {/* Right Action Area */}
          <div className="hidden md:flex items-center gap-3">
            {/* Sun / Moon Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Click Sun for Light Theme' : 'Click Moon for Dark Mode'}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm border cursor-pointer active:scale-95 ${
                theme === 'dark'
                  ? 'bg-slate-900/90 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border-slate-800 hover:border-amber-500/30 ring-1 ring-amber-400/10'
                  : 'bg-amber-50 hover:bg-amber-100/90 text-indigo-700 hover:text-indigo-800 border-amber-200/90 hover:border-indigo-300 ring-1 ring-amber-300/30'
              }`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 shrink-0 transition-transform duration-300 hover:rotate-45" />
                  <span className="text-xs font-bold text-slate-200 tracking-tight">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600 shrink-0 transition-transform duration-300 hover:-rotate-12" />
                  <span className="text-xs font-bold text-slate-800 tracking-tight">Dark</span>
                </>
              )}
            </button>

            <PWAInstallButton variant="nav" />
            {user.role === 'guest' ? (
              <button
                onClick={() => onOpenAuth('customer')}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 active:scale-98 transition-all"
              >
                Login to explore more
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{user.name}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider capitalize">
                    {user.role}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu & Theme Button */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile Sun / Moon Toggle: Sun turns to light, Moon returns to dark */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Mode'}
              className={`p-2 rounded-xl transition-all border cursor-pointer active:scale-90 ${
                theme === 'dark'
                  ? 'bg-slate-900 text-amber-400 border-slate-800 hover:bg-slate-800'
                  : 'bg-amber-50 text-indigo-700 border-amber-200 hover:bg-amber-100'
              }`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-700" />
              )}
            </button>

            {user.role === 'guest' ? (
              <button
                onClick={() => onOpenAuth('customer')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 shadow-sm"
              >
                Login
              </button>
            ) : (
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                theme === 'dark' ? 'text-slate-300 bg-slate-800' : 'text-slate-700 bg-slate-100'
              }`}>
                {user.role}
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-xl focus:outline-none ${
                theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className={`md:hidden border-t px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-4 duration-200 ${
          theme === 'dark' ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white shadow-xl'
        }`}>
          {/* Quick theme toggle row inside mobile drawer */}
          <button
            type="button"
            onClick={() => {
              toggleTheme();
            }}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
              theme === 'dark'
                ? 'bg-slate-900 text-amber-300 border-slate-800 hover:bg-slate-800'
                : 'bg-amber-50/80 text-indigo-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span className="flex items-center gap-2">
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Switch to Light Theme</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span>Switch to Dark Theme</span>
                </>
              )}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
              theme === 'dark'
                ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
                : 'bg-indigo-600/10 text-indigo-700 border border-indigo-600/20'
            }`}>
              {theme === 'dark' ? 'Dark Active' : 'Light Active'}
            </span>
          </button>

          <div className={`pb-2 border-b ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}>
            <PWAInstallButton variant="nav" className="w-full justify-center py-2.5" />
          </div>
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => {
                setActiveView('home');
                setMobileMenuOpen(false);
              }}
              className={`text-left px-3 py-2 rounded-lg text-sm font-medium ${
                theme === 'dark' ? 'text-slate-200 hover:bg-slate-900' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Home & Services
            </button>

            <button
              onClick={() => {
                setActiveView('home');
                setMobileMenuOpen(false);
                setTimeout(() => {
                  document.getElementById('calculator-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className={`text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between ${
                theme === 'dark' ? 'text-indigo-400 hover:bg-slate-900' : 'text-indigo-600 hover:bg-slate-100'
              }`}
            >
              <span>Price Calculator</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                Custom Quote
              </span>
            </button>

            {user.role === 'admin' && (
              <button
                onClick={() => {
                  setActiveView('admin');
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 rounded-lg text-sm font-semibold text-purple-300 bg-purple-900/20 border border-purple-500/30 flex items-center gap-2"
              >
                <Shield className="w-4 h-4 text-purple-400" /> Admin Dashboard
              </button>
            )}

            {user.role === 'freelancer' && (
              <button
                onClick={() => {
                  setActiveView('freelancer');
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 rounded-lg text-sm font-semibold text-blue-300 bg-blue-900/20 border border-blue-500/30 flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-blue-400" /> My Orders & Tasks
              </button>
            )}

            {user.role === 'customer' && (
              <button
                onClick={() => {
                  onOpenOrderModal();
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2 rounded-lg text-sm font-semibold text-emerald-300 bg-emerald-900/20 border border-emerald-500/30 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" /> Place New Order
              </button>
            )}
          </div>

          {/* Quick role switches on mobile */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Instant Demo Switcher
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  onQuickLogin('admin');
                  setMobileMenuOpen(false);
                }}
                className="py-1.5 px-2 text-center text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-purple-300 hover:bg-slate-800"
              >
                Admin
              </button>
              <button
                onClick={() => {
                  onQuickLogin('freelancer');
                  setMobileMenuOpen(false);
                }}
                className="py-1.5 px-2 text-center text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-blue-300 hover:bg-slate-800"
              >
                Freelancer
              </button>
              <button
                onClick={() => {
                  onQuickLogin('customer');
                  setMobileMenuOpen(false);
                }}
                className="py-1.5 px-2 text-center text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-emerald-300 hover:bg-slate-800"
              >
                Customer
              </button>
            </div>
          </div>

          {user.role !== 'guest' && (
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">{user.name}</span>
              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-rose-400 font-semibold hover:underline flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
