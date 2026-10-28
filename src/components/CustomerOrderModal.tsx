import React, { useState, useEffect, useMemo } from 'react';
import { X, Send, Sparkles, AlertCircle, CheckCircle2, MessageSquare, ExternalLink, IndianRupee } from 'lucide-react';
import { UserSession, ServiceItem } from '../types.ts';
import { apiFetch } from '../utils/api.ts';
import { resolveServicePrice } from '../utils/pricing.ts';
import { formatINR } from '../utils/format.ts';

interface CustomerOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSession;
  services: ServiceItem[];
  preselectedService?: string;
  initialBudget?: string;
  initialBrief?: string;
  initialDeadlineDays?: number;
  customPrice?: number;
  onOrderSuccess?: (code: string) => void;
}

export const CustomerOrderModal: React.FC<CustomerOrderModalProps> = ({
  isOpen,
  onClose,
  user,
  services,
  preselectedService,
  initialBudget,
  initialBrief,
  initialDeadlineDays,
  customPrice,
  onOrderSuccess,
}) => {
  const [service, setService] = useState<string>(preselectedService || 'Video Editing');
  const [deadline, setDeadline] = useState<string>('');
  const [budget, setBudget] = useState<string>(initialBudget || '');
  const [email, setEmail] = useState<string>('');
  const [brief, setBrief] = useState<string>(initialBrief || '');
  const [link, setLink] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculated price according to the client's service choice or custom price
  const calculatedPrice = useMemo(() => {
    if (customPrice && customPrice > 0) return customPrice;
    return resolveServicePrice(service, services);
  }, [service, services, customPrice]);

  // Success state
  const [createdOrder, setCreatedOrder] = useState<{
    code: string;
    whatsappUrl: string;
    customer_name: string;
    service: string;
    price: number;
  } | null>(null);

  useEffect(() => {
    if (preselectedService) {
      setService(preselectedService);
    }
  }, [preselectedService]);

  useEffect(() => {
    if (initialBrief !== undefined) {
      setBrief(initialBrief);
    }
  }, [initialBrief]);

  useEffect(() => {
    if (initialBudget !== undefined) {
      setBudget(initialBudget);
    }
  }, [initialBudget]);

  useEffect(() => {
    const days = initialDeadlineDays && initialDeadlineDays > 0 ? initialDeadlineDays : 3;
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDeadline(d.toISOString().split('T')[0]);
  }, [initialDeadlineDays, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!brief.trim() || brief.trim().length < 5) {
      setError('Please provide project brief / instructions (minimum 5 characters).');
      return;
    }

    const trimmedLink = link.trim().toLowerCase();
    if (!trimmedLink.startsWith('http://') && !trimmedLink.startsWith('https://')) {
      setError('Reference link must start with https:// or http:// (e.g. Google Drive, YouTube, Dropbox folder).');
      return;
    }
    if (trimmedLink.startsWith('javascript:')) {
      setError('Unsafe link detected. Please enter a valid cloud URL.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          phone: user.phone,
          email,
          service,
          deadline,
          budget: budget.trim() || formatINR(calculatedPrice),
          price: calculatedPrice,
          brief,
          link,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit order');
      }

      setCreatedOrder({
        code: data.order.code,
        whatsappUrl: data.whatsappUrl,
        customer_name: user.name,
        service: data.order.service,
        price: Number(data.order.price) || calculatedPrice,
      });

      if (onOrderSuccess) {
        onOrderSuccess(data.order.code);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setCreatedOrder(null);
    setBrief('');
    setLink('');
    onClose();
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto no-scrollbar modal-scroll-lock">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-8 my-1 sm:my-8 max-h-[92vh] overflow-y-auto no-scrollbar scrollbar-none">
        <button
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {createdOrder ? (
          /* Confirmation State with WhatsApp Button */
          <div className="text-center py-4 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Order Received Successfully
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Order Code: {createdOrder.code}
              </h2>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                Thank you <strong className="text-white">{createdOrder.customer_name}</strong>! We have registered your request for <strong className="text-white">{createdOrder.service}</strong> at an estimated package rate of <strong className="text-emerald-400">{formatINR(createdOrder.price)}</strong>.
              </p>
            </div>

            {/* Direct WhatsApp Call to Action */}
            <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-left space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <MessageSquare className="w-4 h-4" />
                <span>Next Step: Instant WhatsApp Coordination</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Send your order code directly to the Cutline Studio owner on WhatsApp to start production immediately and confirm raw asset access.
              </p>
              <a
                href={createdOrder.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <span>Message Owner on WhatsApp</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setCreatedOrder(null)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Place Another Order
              </button>
              <button
                onClick={handleResetAndClose}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
              >
                Close & Return
              </button>
            </div>
          </div>
        ) : (
          /* Order Placement Form */
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Client Intake</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Place a Project Order
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Fill in your project requirements. We review briefs and reply promptly.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client Info (Pre-filled and read-only per spec) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Client Name (Read-only)
                  </label>
                  <input
                    type="text"
                    value={user.name}
                    readOnly
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Mobile Number (Read-only)
                  </label>
                  <input
                    type="text"
                    value={user.phone ? `+91 ${user.phone}` : ''}
                    readOnly
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Service & Deadline */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Service Selection (Select individually or Both)
                </label>
                {/* 1-Tap Pills for Quick Selection */}
                <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setService('Video Editing')}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold text-center border transition-all ${
                      service === 'Video Editing'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    🎬 Video Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setService('Social Media Management')}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold text-center border transition-all ${
                      service === 'Social Media Management'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    📱 Social Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setService('Both (Video + Social Media)')}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold text-center border transition-all ${
                      service.includes('Both')
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-400 shadow-md'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    ✨ Both
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <select
                      value={service}
                      onChange={e => setService(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Video Editing" className="bg-slate-900 text-white">
                        Video Editing
                      </option>
                      <option value="Social Media Management" className="bg-slate-900 text-white">
                        Social Media Management
                      </option>
                      <option value="Both (Video + Social Media)" className="bg-slate-900 text-white">
                        Both (Video Editing + Social Media)
                      </option>
                      {services
                        .filter(
                          s =>
                            s.name !== 'Video Editing' &&
                            s.name !== 'Social Media Management' &&
                            !s.name.includes('Both')
                        )
                        .map(s => (
                          <option key={s.id} value={s.name} className="bg-slate-900 text-white">
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Auto-Updating Price Section */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/60 border border-indigo-500/30 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Package Pricing
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                        Auto-updated
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Standard price for <span className="text-indigo-300 font-semibold">{service}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-white tracking-tight">
                      {formatINR(calculatedPrice)}
                    </div>
                    <div className="text-[10px] text-slate-400">Standard studio rate</div>
                  </div>
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Includes revisions & asset management</span>
                  <span className="text-slate-500 italic">Owner can adjust final invoice on review</span>
                </div>
              </div>

              {/* Deadline & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Custom Budget / Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder={`Standard: ${formatINR(calculatedPrice)}`}
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Email Address (optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Brief */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Project Brief & Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your video or social project: style preferences, pacing, key sound design elements, reference creators, or specific deliverables..."
                  value={brief}
                  onChange={e => setBrief(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Reference Link (Google Drive / YouTube) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Raw Footage / Reference Cloud Link
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/... or YouTube link"
                  value={link}
                  onChange={e => setLink(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Must start with http:// or https://. Ensure link permissions are set to &quot;Anyone with the link can view&quot;.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:scale-98 shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Submitting Order...' : 'Submit Order'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
