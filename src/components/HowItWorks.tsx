import React from 'react';
import { UploadCloud, Users, Sparkles, Receipt, ArrowRight } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Submit Brief & Cloud Link',
      desc: 'Enter your target deadline, brief, and raw footage link (Google Drive, Dropbox, YouTube). No cumbersome file upload size limits.',
      icon: <UploadCloud className="w-5 h-5 text-indigo-400" />,
    },
    {
      num: '02',
      title: 'Direct Creative Assignment',
      desc: 'Our team assigns your project to a dedicated video editor or social strategist with instant WhatsApp confirmation.',
      icon: <Users className="w-5 h-5 text-purple-400" />,
    },
    {
      num: '03',
      title: 'Paced Cuts & Rapid Revisions',
      desc: 'Receive dynamic hook-driven cuts with sound design, kinetic text, and motion graphics. Fast turnaround with included revisions.',
      icon: <Sparkles className="w-5 h-5 text-pink-400" />,
    },
    {
      num: '04',
      title: 'Clear Digital Bill & Final Handover',
      desc: 'Receive a transparent digital invoice (INV-XXXXXX) with official payment tracking and direct master file delivery.',
      icon: <Receipt className="w-5 h-5 text-emerald-400" />,
    },
  ];

  return (
    <section id="how-it-works-section" className="py-16 sm:py-20 border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Frictionless Process
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How Cutline Studio Works
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
            From raw clips in your cloud folder to final viral reels and social growth in four simple stages.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 relative flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700/80 transition-colors shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700/60 shadow-xs">
                    {step.icon}
                  </div>
                  <span className="text-2xl font-black text-slate-300 dark:text-slate-800 font-mono">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
