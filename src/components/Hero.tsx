import React, { useState } from 'react';
import { ArrowRight, Play, Sparkles, Check, Flame } from 'lucide-react';
import { UserSession } from '../types.ts';

interface HeroProps {
  user: UserSession;
  onOpenAuth: (tab?: 'customer' | 'team') => void;
  onOpenOrderModal: () => void;
  onScrollToServices: () => void;
  onScrollToCalculator?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  user,
  onOpenAuth,
  onOpenOrderModal,
  onScrollToServices,
  onScrollToCalculator,
}) => {
  const [selectedPill, setSelectedPill] = useState<string | null>('Hook');

  const videoPills = [
    {
      id: 'Hook',
      label: 'Hook',
      bg: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25',
      desc: 'First 0-3s high-retention hook: visual pattern interrupts, dynamic sound punch, kinetic caption entrance.',
    },
    {
      id: 'Story',
      label: 'Story',
      bg: 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/25',
      desc: 'Snappy narrative arc: cut out pauses, match cut rhythm, B-roll overlays, and pacing shifts to avoid viewer drop-off.',
    },
    {
      id: 'Offer',
      label: 'Offer',
      bg: 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/25',
      desc: 'Crisp value delivery: on-screen graphics, animated arrows, feature spotlights, and clear social proof.',
    },
    {
      id: 'CTA',
      label: 'CTA',
      bg: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-amber-500/25',
      desc: 'High-conversion call-to-action: seamless loop ending, comment keyword trigger, and bio link prompt.',
    },
  ];

  const postPills = [
    {
      id: 'Mon',
      label: 'Mon',
      bg: 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/25',
      desc: 'Educational Reel: Industry breakdown + carousel summary to start the week with saveable authority content.',
    },
    {
      id: 'Wed',
      label: 'Wed',
      bg: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25',
      desc: 'Behind-the-scenes / Founder POV: High-relatability format driving comments and direct message inquiries.',
    },
    {
      id: 'Fri',
      label: 'Fri',
      bg: 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/25',
      desc: 'Trending Audio Cut: High-velocity entertainment edit built specifically for Instagram Explore & Reels algorithm.',
    },
    {
      id: 'Sun',
      label: 'Sun',
      bg: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-amber-500/25',
      desc: 'Weekly Recap & Engagement story series: Polls, Q&As, and community interaction preparing audience for Monday.',
    },
  ];

  const activeInfo = [...videoPills, ...postPills].find(p => p.id === selectedPill);

  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 sm:w-[600px] sm:h-[600px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-pink-500/5 blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center sm:text-left space-y-6 max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>High Retention Video Editing & Social Growth</span>
          </div>

          {/* Heading from screenshot */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
            We cut your videos and run your socials.
          </h1>

          {/* Subheading from screenshot */}
          <p className="text-lg sm:text-xl text-slate-400 font-normal leading-relaxed max-w-2xl">
            Reels, YouTube edits and ad videos, plus content calendars, posting and page management.
            Tell us what you need and we&apos;ll reply with a quote.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            {user.role === 'customer' ? (
              <button
                onClick={onOpenOrderModal}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-98 transition-all"
              >
                <span>Place Order Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onOpenAuth('customer')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-98 transition-all"
              >
                <span>Login to explore more</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onScrollToServices}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 active:scale-98 transition-all shadow-xs"
            >
              <span>Explore Services</span>
            </button>

            <button
              onClick={onScrollToCalculator}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-500/30 active:scale-98 transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Calculate Price</span>
            </button>
          </div>
        </div>

        {/* Visual Pill Workflow Component (matching screenshot layout) */}
        <div className="mt-12 sm:mt-16 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 sm:p-7 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cutline Production Framework
            </span>
            <span className="text-[11px] text-indigo-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Tap any stage to preview methodology
            </span>
          </div>

          {/* Row 1: Video */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="text-xs font-medium text-slate-400 w-14 shrink-0">Video</span>
            <div className="flex flex-wrap items-center gap-2.5">
              {videoPills.map(pill => (
                <button
                  key={pill.id}
                  onClick={() => setSelectedPill(pill.id)}
                  className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md active:scale-95 ${pill.bg} ${
                    selectedPill === pill.id ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-105' : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Posts */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="text-xs font-medium text-slate-400 w-14 shrink-0">Posts</span>
            <div className="flex flex-wrap items-center gap-2.5">
              {postPills.map(pill => (
                <button
                  key={pill.id}
                  onClick={() => setSelectedPill(pill.id)}
                  className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md active:scale-95 ${pill.bg} ${
                    selectedPill === pill.id ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-105' : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pill Description Tooltip Banner */}
          {activeInfo && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/60 flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800/40">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0 animate-pulse" />
              <div>
                <strong className="text-slate-900 dark:text-white font-semibold mr-1.5">[{activeInfo.label} Phase]:</strong>
                <span>{activeInfo.desc}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
