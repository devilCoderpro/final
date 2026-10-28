import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Sparkles,
  Zap,
  Clock,
  Check,
  ChevronRight,
  TrendingDown,
  Calendar,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Film,
  Layers,
  Palette,
  Volume2,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';
import { formatINR } from '../utils/format.ts';
import { AppConfig, UserSession } from '../types.ts';

interface PricingCalculatorProps {
  config: AppConfig | null;
  user: UserSession;
  onBookCustomPackage: (details: {
    service: string;
    price: number;
    brief: string;
    deadlineDays: number;
  }) => void;
  onOpenAuth: () => void;
}

interface VideoTypeOption {
  id: string;
  name: string;
  shortName: string;
  aspect: string;
  basePrice: number;
  description: string;
  recommendedDuration: string;
}

const VIDEO_TYPES: VideoTypeOption[] = [
  {
    id: 'short-form',
    name: 'Instagram Reels & Shorts / TikTok',
    shortName: 'Reels & Shorts',
    aspect: '9:16 Vertical',
    basePrice: 1200,
    description: 'Hook-driven, high-velocity vertical edits with kinetic captions and sound design.',
    recommendedDuration: '< 60 sec',
  },
  {
    id: 'youtube-long',
    name: 'YouTube Long-Form (Vlog / Talking Head)',
    shortName: 'YouTube Long-Form',
    aspect: '16:9 Landscape',
    basePrice: 3200,
    description: 'Retention-focused narrative pacing, B-roll overlays, visual effects, and sound mix.',
    recommendedDuration: '5 - 15 min',
  },
  {
    id: 'commercial-ad',
    name: 'High-Converting Commercial / Ad',
    shortName: 'Commercial & Ad',
    aspect: 'Multi-Format',
    basePrice: 4500,
    description: 'High-stakes sales promo, direct-response hooks, polished branding, and 3D titles.',
    recommendedDuration: '30 - 60 sec',
  },
  {
    id: 'podcast-repurpose',
    name: 'Podcast & Webinar Repurposing',
    shortName: 'Podcast Repurposing',
    aspect: 'Split & Multi-cam',
    basePrice: 2200,
    description: 'Multi-camera audio sync, active speaker zoom, animated waveform, and viral clips.',
    recommendedDuration: '10 - 30 min',
  },
  {
    id: 'motion-graphics',
    name: 'Motion Graphics & 3D Intro/Outro',
    shortName: 'Motion Design',
    aspect: 'Custom Aspect',
    basePrice: 2800,
    description: 'Kinetic typography, animated logo stings, custom lower-thirds, and HUD graphics.',
    recommendedDuration: '10 - 45 sec',
  },
];

const DURATION_MULTIPLIERS = [
  { id: 'under-60', label: '< 60 Seconds', mult: 1.0, desc: 'Ideal for TikTok, Shorts & Reels' },
  { id: '1-3-min', label: '1 - 3 Minutes', mult: 1.25, desc: 'Explainer videos & teaser cuts' },
  { id: '3-10-min', label: '3 - 10 Minutes', mult: 1.6, desc: 'Standard YouTube videos & tutorials' },
  { id: '10-20-min', label: '10 - 20 Minutes', mult: 2.2, desc: 'Deep dive vlogs & in-depth reviews' },
  { id: '20-plus-min', label: '20+ Minutes', mult: 2.8, desc: 'Full podcasts, webinars & keynotes' },
];

const VOLUME_PACKS = [
  { count: 1, label: 'Single Video', discount: 0, tag: 'Pay As You Go' },
  { count: 4, label: 'Starter Pack (4 Videos)', discount: 0.05, tag: 'Save 5%' },
  { count: 8, label: 'Growth Pack (8 Videos)', discount: 0.12, tag: 'Most Popular • Save 12%' },
  { count: 15, label: 'Scale Pack (15 Videos)', discount: 0.20, tag: 'Best Value • Save 20%' },
];

const TURNAROUND_OPTIONS = [
  { id: 'standard', label: 'Standard Delivery', days: 3, fee: 0, badge: 'Standard' },
  { id: 'priority', label: 'Priority Express', days: 2, fee: 600, badge: '48 Hours' },
  { id: 'lightning', label: 'Same-Day Rush', days: 1, fee: 1200, badge: '24 Hours' },
];

interface AddonOption {
  id: string;
  name: string;
  pricePerUnit: number;
  description: string;
  icon: any;
}

const ADDON_OPTIONS: AddonOption[] = [
  {
    id: 'captions',
    name: 'Viral Kinetic Subtitles',
    pricePerUnit: 250,
    description: 'Dynamic word-by-word highlights, emojis & custom fonts (Hormozi style)',
    icon: Sparkles,
  },
  {
    id: 'thumbnail',
    name: 'High-CTR Custom Thumbnail',
    pricePerUnit: 400,
    description: 'Click-tested visual thumbnail designed for high YouTube / Reel CTR',
    icon: ImageIcon,
  },
  {
    id: 'sound-design',
    name: 'Pro Sound Design & Licensed SFX',
    pricePerUnit: 300,
    description: 'Curated whooshes, risers, ambient layers, and copyright-cleared music',
    icon: Volume2,
  },
  {
    id: 'color-grading',
    name: 'Cinematic Color Grading & LUTs',
    pricePerUnit: 250,
    description: 'Precise skin tone recovery, film contrast curves, and studio grade look',
    icon: Palette,
  },
  {
    id: 'project-files',
    name: 'Full Source Project Files',
    pricePerUnit: 500,
    description: 'Organized Premiere / DaVinci / After Effects project archive',
    icon: FileCode,
  },
];

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  config,
  user,
  onBookCustomPackage,
  onOpenAuth,
}) => {
  const [selectedType, setSelectedType] = useState<string>('short-form');
  const [selectedDuration, setSelectedDuration] = useState<string>('under-60');
  const [selectedVolume, setSelectedVolume] = useState<number>(4);
  const [selectedTurnaround, setSelectedTurnaround] = useState<string>('standard');
  const [selectedAddons, setSelectedAddons] = useState<string[]>(['captions', 'sound-design']);

  // Selected object references
  const currentType = useMemo(
    () => VIDEO_TYPES.find(t => t.id === selectedType) || VIDEO_TYPES[0],
    [selectedType]
  );
  const currentDuration = useMemo(
    () => DURATION_MULTIPLIERS.find(d => d.id === selectedDuration) || DURATION_MULTIPLIERS[0],
    [selectedDuration]
  );
  const currentPack = useMemo(
    () => VOLUME_PACKS.find(p => p.count === selectedVolume) || VOLUME_PACKS[1],
    [selectedVolume]
  );
  const currentTurnaround = useMemo(
    () => TURNAROUND_OPTIONS.find(t => t.id === selectedTurnaround) || TURNAROUND_OPTIONS[0],
    [selectedTurnaround]
  );

  // Toggle addon
  const toggleAddon = (id: string) => {
    setSelectedAddons(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Financial Calculations
  const baseSinglePrice = Math.round(currentType.basePrice * currentDuration.mult);
  const addonsPerVideo = selectedAddons.reduce((sum, addonId) => {
    const addon = ADDON_OPTIONS.find(a => a.id === addonId);
    return sum + (addon ? addon.pricePerUnit : 0);
  }, 0);

  const singleVideoWithAddons = baseSinglePrice + addonsPerVideo;
  const rawSubtotal = singleVideoWithAddons * selectedVolume;
  const discountAmount = Math.round(rawSubtotal * currentPack.discount);
  const afterDiscountSubtotal = rawSubtotal - discountAmount;
  const turnaroundFee = currentTurnaround.fee;
  const finalTotalPrice = afterDiscountSubtotal + turnaroundFee;

  // Estimated Delivery Date
  const estimatedDeliveryDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + currentTurnaround.days);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, [currentTurnaround]);

  const handleBookNow = () => {
    const briefSummary = [
      `Custom Package: ${currentType.name} (${currentPack.label})`,
      `Target Duration: ${currentDuration.label}`,
      `Turnaround: ${currentTurnaround.label} (${currentTurnaround.badge})`,
      `Included Add-ons: ${
        selectedAddons.length > 0
          ? selectedAddons
              .map(id => ADDON_OPTIONS.find(a => a.id === id)?.name)
              .filter(Boolean)
              .join(', ')
          : 'None'
      }`,
      `Volume Discount Applied: ${currentPack.discount > 0 ? `${currentPack.discount * 100}% off (-${formatINR(discountAmount)})` : 'None'}`,
      `Calculated Total Estimate: ${formatINR(finalTotalPrice)}`,
    ].join('\n');

    onBookCustomPackage({
      service: currentType.name,
      price: finalTotalPrice,
      brief: briefSummary,
      deadlineDays: currentTurnaround.days,
    });
  };

  const handleWhatsAppInquiry = () => {
    const waNumber = config?.whatsappNumber || '919876543210';
    const message = encodeURIComponent(
      `Hi ${config?.businessName || 'Cutline Studio'}! I just customized an estimate on your website:\n\n` +
        `• Type: *${currentType.name}*\n` +
        `• Volume: *${currentPack.label}*\n` +
        `• Duration: *${currentDuration.label}*\n` +
        `• Turnaround: *${currentTurnaround.label}*\n` +
        `• Add-ons: *${selectedAddons.length > 0 ? selectedAddons.map(id => ADDON_OPTIONS.find(a => a.id === id)?.name).join(', ') : 'None'}*\n` +
        `• Estimated Quote: *${formatINR(finalTotalPrice)}*\n\n` +
        `Can we discuss and proceed with this order?`
    );
    window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
  };

  const applyPreset = (preset: 'reel' | 'youtube' | 'ad' | 'bundle') => {
    if (preset === 'reel') {
      setSelectedType('short-form');
      setSelectedDuration('under-60');
      setSelectedVolume(1);
      setSelectedAddons(['subtitles', 'sound-sfx']);
      setSelectedTurnaround('standard');
    } else if (preset === 'youtube') {
      setSelectedType('youtube-long');
      setSelectedDuration('3-10-min');
      setSelectedVolume(1);
      setSelectedAddons(['subtitles', 'broll']);
      setSelectedTurnaround('standard');
    } else if (preset === 'ad') {
      setSelectedType('commercial-ad');
      setSelectedDuration('under-60');
      setSelectedVolume(1);
      setSelectedAddons(['motion-graphics', 'sound-sfx']);
      setSelectedTurnaround('express');
    } else if (preset === 'bundle') {
      setSelectedType('short-form');
      setSelectedDuration('under-60');
      setSelectedVolume(8);
      setSelectedAddons(['subtitles', 'sound-sfx']);
      setSelectedTurnaround('standard');
    }
  };

  return (
    <section id="calculator-section" className="py-14 sm:py-24 relative overflow-hidden bg-slate-950">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/10 blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Calculator className="w-3.5 h-3.5" />
            <span>Instant Package & Price Calculator</span>
          </div>
          <h2 className="text-2xl sm:text-5xl font-extrabold tracking-tight text-white">
            Custom estimate in <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">30 seconds</span>.
          </h2>
          <p className="text-xs sm:text-base text-slate-400">
            Select your video style, duration, quantity, and add-ons. 100% transparent rates with automatic bundle discounts and instant booking.
          </p>

          {/* 1-Tap Quick Presets for Mobile, Tablets & Laptop */}
          <div className="pt-2">
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Popular 1-Tap Quick Presets
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => applyPreset('reel')}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700/80 text-slate-200 hover:border-indigo-500 hover:text-indigo-300 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>📱 Viral Reel (60s)</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('youtube')}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700/80 text-slate-200 hover:border-indigo-500 hover:text-indigo-300 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>🎬 YouTube Video (10m)</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('ad')}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700/80 text-slate-200 hover:border-indigo-500 hover:text-indigo-300 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>⚡ Commercial Ad (30s)</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('bundle')}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-950/60 border border-indigo-500/50 text-indigo-200 hover:bg-indigo-900/60 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>📦 Monthly Pack (8x Reels • 15% off)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Layout: Controls (Left) + Live Summary Receipt (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-8">
            {/* Step 1: Video Format / Type */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Select Video Format & Style</h3>
                </div>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{currentType.aspect}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {VIDEO_TYPES.map(type => {
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedType(type.id)}
                      className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-50/90 dark:bg-indigo-600/15 border-indigo-500 text-indigo-950 dark:text-white shadow-md'
                          : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{type.shortName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                            {type.aspect}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {type.description}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Base:</span>
                        <span className="font-bold text-indigo-700 dark:text-indigo-300">{formatINR(type.basePrice)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Target Duration */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Target Video Length</h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{currentDuration.desc}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {DURATION_MULTIPLIERS.map(d => {
                  const isSelected = selectedDuration === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDuration(d.id)}
                      className={`py-3 px-2 rounded-xl text-center border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold border-indigo-500 shadow-md shadow-indigo-600/30'
                          : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold">{d.label}</div>
                      <div className="text-[10px] opacity-75 mt-0.5 font-mono">
                        {d.mult === 1.0 ? '1.0x' : `${d.mult}x rate`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Package Quantity / Volume */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Quantity & Volume Bundles</h3>
                </div>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">{currentPack.tag}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {VOLUME_PACKS.map(pack => {
                  const isSelected = selectedVolume === pack.count;
                  return (
                    <button
                      key={pack.count}
                      type="button"
                      onClick={() => setSelectedVolume(pack.count)}
                      className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gradient-to-b from-indigo-50 to-purple-50 dark:from-indigo-600/25 dark:to-purple-600/25 border-indigo-500 text-indigo-950 dark:text-white shadow-md'
                          : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
                        {pack.count}x
                      </div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {pack.count === 1 ? '1 Video' : `${pack.count} Videos`}
                      </div>
                      <div className="mt-2 text-[10px] font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 py-0.5 px-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                        {pack.discount > 0 ? `${pack.discount * 100}% Discount` : 'Regular'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Add-ons & Creative Enhancements */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add-on Enhancements</h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{selectedAddons.length} Selected</span>
              </div>

              <div className="space-y-2">
                {ADDON_OPTIONS.map(addon => {
                  const isChecked = selectedAddons.includes(addon.id);
                  const Icon = addon.icon;
                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddon(addon.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-indigo-50/90 dark:bg-indigo-600/10 border-indigo-400 dark:border-indigo-500/70 text-indigo-950 dark:text-white'
                          : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                            isChecked
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{addon.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {addon.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">
                          +{formatINR(addon.pricePerUnit)}/vid
                        </span>
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 5: Turnaround Time */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs dark:shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    5
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Delivery Turnaround</h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Est: {estimatedDeliveryDate}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {TURNAROUND_OPTIONS.map(opt => {
                  const isSelected = selectedTurnaround === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedTurnaround(opt.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-950 dark:text-white shadow-md'
                          : 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{opt.label}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300">
                          {opt.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {opt.fee === 0 ? 'Included in base' : `+${formatINR(opt.fee)} express`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Estimate Receipt (Right Sticky Column) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl space-y-6 relative overflow-hidden">
              {/* Highlight ribbon */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
                <div>
                  <div className="text-xs uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">
                    Live Package Estimate
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {currentType.shortName}
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>{currentPack.label}</span>
                </div>
              </div>

              {/* Price Breakdown Breakdown */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span>Base Editing ({selectedVolume}x {currentDuration.label}):</span>
                  </span>
                  <span className="font-mono text-slate-900 dark:text-white font-semibold">
                    {formatINR(baseSinglePrice * selectedVolume)}
                  </span>
                </div>

                {selectedAddons.length > 0 && (
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span>Add-ons ({selectedAddons.length} enhancements):</span>
                    </span>
                    <span className="font-mono text-slate-900 dark:text-white font-semibold">
                      +{formatINR(addonsPerVideo * selectedVolume)}
                    </span>
                  </div>
                )}

                {currentTurnaround.fee > 0 && (
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Express Turnaround ({currentTurnaround.badge}):</span>
                    <span className="font-mono text-amber-700 dark:text-amber-300 font-semibold">
                      +{formatINR(currentTurnaround.fee)}
                    </span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                    <span className="font-semibold flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>Volume Savings ({currentPack.discount * 100}% off):</span>
                    </span>
                    <span className="font-mono font-bold">
                      -{formatINR(discountAmount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Delivery Timeline Pill */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Target First Draft:</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{estimatedDeliveryDate}</span>
              </div>

              {/* Grand Total */}
              <div className="border-t border-slate-200 dark:border-slate-800/80 pt-5 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                    Total Estimated Investment:
                  </span>
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight text-right">
                    {formatINR(finalTotalPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>~{formatINR(Math.round(finalTotalPrice / selectedVolume))}/video all-inclusive</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">✓ No hidden taxes</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleBookNow}
                  className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-xl shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
                >
                  <Zap className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                  <span>Book This Custom Package</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppInquiry}
                  className="w-full py-3 rounded-2xl font-semibold text-xs text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600/30 border border-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Inquire with this Spec on WhatsApp</span>
                </button>
              </div>

              {/* Security & Guarantees */}
              <div className="border-t border-slate-800/60 pt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>2 Free Revision Rounds</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>100% Commercial Rights</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>4K ProRes / MP4 Exports</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Dedicated Editor Assigned</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Quick Sticky Quote Bar */}
      <div className="lg:hidden sticky bottom-14 sm:bottom-16 z-30 px-3 py-2 mt-6 max-w-lg mx-auto">
        <div className="p-3 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 shadow-2xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400 truncate">
              {selectedVolume}x {currentType.shortName}
            </div>
            <div className="text-lg font-black text-white font-mono leading-tight">
              {formatINR(finalTotalPrice)}
              {discountAmount > 0 && (
                <span className="ml-1 text-[10px] font-semibold text-emerald-400">
                  (-{currentPack.discount * 100}%)
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleBookNow}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 active:scale-95 shadow-md shadow-indigo-600/30 flex items-center gap-1.5 shrink-0"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Book Now</span>
          </button>
        </div>
      </div>
    </section>
  );
};
