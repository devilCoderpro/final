import React from 'react';
import { ServiceItem, UserSession } from '../types.ts';
import { Check, Sparkles, Video, Share2, Crown } from 'lucide-react';

interface ServicesSectionProps {
  services: ServiceItem[];
  user: UserSession;
  onSelectService: (serviceName: string) => void;
  onOpenAuth: () => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  services,
  user,
  onSelectService,
  onOpenAuth,
}) => {
  const getIcon = (index: number) => {
    if (index === 0) return <Video className="w-5 h-5 text-indigo-400" />;
    if (index === 1) return <Share2 className="w-5 h-5 text-purple-400" />;
    return <Crown className="w-5 h-5 text-amber-400" />;
  };

  return (
    <section id="services-section" className="py-16 sm:py-24 border-t border-slate-200 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Transparent Pricing & Turnaround</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Services Built for Modern Creators & Brands
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
            No bloated retainers or surprise fees. Choose your creative service, submit your brief, and get agency-grade output.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {services.map((service, index) => {
            const isFeatured = index === 2 || service.name.toLowerCase().includes('retainer') || service.name.toLowerCase().includes('combo');
            return (
              <div
                key={service.id}
                className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                  isFeatured
                    ? 'bg-gradient-to-b from-indigo-50/80 via-white to-purple-50/40 dark:from-slate-900 dark:to-indigo-950/40 border-2 border-indigo-400 dark:border-indigo-500/40 shadow-xl shadow-indigo-500/10'
                    : 'bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 shadow-xs'
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center mb-5">
                    {getIcon(index)}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {service.name}
                  </h3>

                  <div className="mt-3 mb-4 flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-indigo-700 dark:text-indigo-300">
                      {service.price_text}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                    {service.blurb}
                  </p>

                  <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      What&apos;s included:
                    </div>
                    {service.points.map((point, pIdx) => (
                      <div key={pIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        <div className="w-4 h-4 rounded-full bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 mt-auto">
                  <button
                    onClick={() => {
                      if (user.role === 'guest') {
                        onOpenAuth();
                      } else {
                        onSelectService(service.name);
                      }
                    }}
                    className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      isFeatured
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 active:scale-98'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700/80 active:scale-98 shadow-xs'
                    }`}
                  >
                    <span>{user.role === 'customer' ? `Order ${service.name}` : 'Login & Order'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
