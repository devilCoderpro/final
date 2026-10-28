/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserSession, AppConfig, ServiceItem, OrderItem } from './types.ts';
import { Navbar } from './components/Navbar.tsx';
import { Hero } from './components/Hero.tsx';
import { ServicesSection } from './components/ServicesSection.tsx';
import { HowItWorks } from './components/HowItWorks.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { CustomerOrderModal } from './components/CustomerOrderModal.tsx';
import { InvoiceModal } from './components/InvoiceModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { FreelancerDashboard } from './components/FreelancerDashboard.tsx';
import { PricingCalculator } from './components/PricingCalculator.tsx';
import { Video, Shield, Layers, User, Sparkles, Heart } from 'lucide-react';
import { apiFetch, setStoredToken } from './utils/api.ts';
import { MobileTabBar } from './components/MobileTabBar.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';

export default function App() {
  const [user, setUser] = useState<UserSession>({
    role: 'guest',
    name: 'Guest',
  });
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [activeView, setActiveView] = useState<'home' | 'admin' | 'freelancer' | 'customer'>('home');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cutline_studio_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('cutline_studio_theme', theme);
    }
  }, [theme]);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'customer' | 'team'>('customer');
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [preselectedService, setPreselectedService] = useState<string>('Video Editing');
  const [orderBrief, setOrderBrief] = useState<string>('');
  const [orderBudget, setOrderBudget] = useState<string>('');
  const [orderDeadlineDays, setOrderDeadlineDays] = useState<number>(3);
  const [orderCustomPrice, setOrderCustomPrice] = useState<number>(0);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<OrderItem | null>(null);

  // Load config & me
  const fetchSessionAndConfig = async () => {
    try {
      const [configRes, meRes, servicesRes] = await Promise.all([
        apiFetch('/api/config'),
        apiFetch('/api/me'),
        apiFetch('/api/services'),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user) {
          setUser(meData.user);
        }
      }

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData.services || []);
      }
    } catch (err) {
      console.error('Initialization error:', err);
    }
  };

  useEffect(() => {
    fetchSessionAndConfig();
  }, []);

  // Ensure activeView matches user role permissions
  useEffect(() => {
    if (activeView === 'admin' && user.role !== 'admin') {
      setActiveView(user.role === 'freelancer' ? 'freelancer' : 'home');
    } else if (activeView === 'freelancer' && user.role !== 'freelancer') {
      setActiveView(user.role === 'admin' ? 'admin' : 'home');
    }
  }, [user.role, activeView]);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setStoredToken(null);
      setUser({ role: 'guest', name: 'Guest' });
      setActiveView('home');
    }
  };

  const handleOpenAuth = (tab: 'customer' | 'team' = 'customer') => {
    setAuthDefaultTab(tab);
    setAuthModalOpen(true);
  };

  const handleOpenOrderWithService = (serviceName: string) => {
    setPreselectedService(serviceName);
    setOrderBrief('');
    setOrderBudget('');
    setOrderCustomPrice(0);
    setOrderDeadlineDays(3);
    if (user.role === 'guest') {
      handleOpenAuth('customer');
    } else {
      setOrderModalOpen(true);
    }
  };

  const handleBookFromCalculator = (details: {
    service: string;
    price: number;
    brief: string;
    deadlineDays: number;
  }) => {
    setPreselectedService(details.service);
    setOrderBrief(details.brief);
    setOrderBudget(`₹${details.price.toLocaleString('en-IN')}`);
    setOrderCustomPrice(details.price);
    setOrderDeadlineDays(details.deadlineDays);

    if (user.role === 'guest') {
      handleOpenAuth('customer');
    } else {
      setOrderModalOpen(true);
    }
  };



  const handleQuickLogin = async (role: 'admin' | 'freelancer' | 'customer') => {
    if (role === 'customer') {
      const res = await apiFetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Aman Verma', phone: '9871234567' }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) setStoredToken(data.token);
        setUser(data.user);
        setActiveView('home');
        setOrderModalOpen(true);
      }
    } else if (role === 'admin') {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: '9876543210', password: 'admin123' }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) setStoredToken(data.token);
        setUser(data.user);
        setActiveView('admin');
      }
    } else if (role === 'freelancer') {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: '9123456780', password: 'editor123' }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) setStoredToken(data.token);
        setUser(data.user);
        setActiveView('freelancer');
      }
    }
  };

  const handleViewInvoice = (order: OrderItem) => {
    setActiveInvoiceOrder(order);
    setInvoiceModalOpen(true);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className={`min-h-screen flex flex-col overflow-x-hidden pb-20 md:pb-0 transition-colors duration-200 ${theme === 'dark' ? 'bg-[#090d16] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Navbar */}
      <Navbar
        user={user}
        config={config}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenAuth={handleOpenAuth}
        onOpenOrderModal={() => setOrderModalOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        toggleTheme={toggleTheme}
        onQuickLogin={handleQuickLogin}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeView === 'admin' && user.role === 'admin' ? (
          <AdminDashboard
            config={config}
            services={services}
            onViewInvoice={handleViewInvoice}
            onServicesUpdated={fetchSessionAndConfig}
          />
        ) : activeView === 'freelancer' && user.role === 'freelancer' ? (
          <FreelancerDashboard user={user} />
        ) : (
          <div>
            {/* Landing Hero */}
            <Hero
              user={user}
              onOpenAuth={handleOpenAuth}
              onOpenOrderModal={() => {
                setOrderBrief('');
                setOrderBudget('');
                setOrderCustomPrice(0);
                setOrderDeadlineDays(3);
                setOrderModalOpen(true);
              }}
              onScrollToServices={() => {
                const el = document.getElementById('services-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onScrollToCalculator={() => {
                const el = document.getElementById('calculator-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* Dynamic Services from Database */}
            <ServicesSection
              services={services}
              user={user}
              onSelectService={handleOpenOrderWithService}
              onOpenAuth={() => handleOpenAuth('customer')}
            />

            {/* Instant Package & Price Calculator (Feature 2) */}
            <PricingCalculator
              config={config}
              user={user}
              onBookCustomPackage={handleBookFromCalculator}
              onOpenAuth={() => handleOpenAuth('customer')}
            />

            {/* Workflow steps */}
            <HowItWorks />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`no-print border-t py-10 text-xs transition-colors ${theme === 'dark' ? 'border-slate-900 bg-slate-950 text-slate-500' : 'border-slate-200 bg-white text-slate-600'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Video className="w-3.5 h-3.5" />
            </div>
            <span className={`font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {config?.businessName || 'Cutline Studio'}
            </span>
            <span className={theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}>&bull;</span>
            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Video Editing & Social Media Management</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>WhatsApp: +{config?.whatsappNumber || '919876543210'}</span>
            <span>&bull;</span>
            <span>{config?.email || 'contact@cutlinestudio.com'}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <span>Lightweight freelance engine for Raspberry Pi & Cloud</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authDefaultTab}
        onLoginSuccess={loggedInUser => {
          setUser(loggedInUser);
          if (loggedInUser.role === 'admin') setActiveView('admin');
          else if (loggedInUser.role === 'freelancer') setActiveView('freelancer');
          else if (loggedInUser.role === 'customer') {
            setActiveView('home');
            setOrderModalOpen(true);
          }
        }}
      />

      {/* Order Modal */}
      <CustomerOrderModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        user={user}
        services={services}
        preselectedService={preselectedService}
        initialBrief={orderBrief}
        initialBudget={orderBudget}
        initialDeadlineDays={orderDeadlineDays}
        customPrice={orderCustomPrice}
        onOrderSuccess={code => {
          // fetch latest
        }}
      />

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        order={activeInvoiceOrder}
        config={config}
      />

      {/* Progressive Mobile & Tablet Bottom Navigation */}
      <MobileTabBar
        user={user}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenOrderModal={() => setOrderModalOpen(true)}
        onOpenAuth={handleOpenAuth}
        onQuickLogin={handleQuickLogin}
      />

      {/* Offline Status Connectivity Banner */}
      <OfflineIndicator />
    </div>
  );
}
