import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { Download, Share, PlusSquare, X, CheckCircle, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'nav' | 'compact' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'nav', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running inside standalone PWA, suppress
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If not installable and not iOS, render a progressive install guide button so users on any device know it can be added to home screen
  const isActionable = isInstallable || isIOS;

  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 active:scale-95 transition-all ${className}`}
          title="Install Cutline Studio app"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <IOSInstallModal onClose={() => setShowIOSGuide(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-500/20 active:scale-95 transition-all ${className}`}
        title="Install Progressive Web App on mobile, tablet or desktop"
      >
        {installSuccess ? (
          <>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
            <span>Installed!</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 text-white animate-bounce" />
            <span>Install App</span>
          </>
        )}
      </button>

      {showIOSGuide && (
        <IOSInstallModal onClose={() => setShowIOSGuide(false)} />
      )}
    </>
  );
};

const IOSInstallModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 text-white font-bold text-base">
          <Smartphone className="w-5 h-5 text-indigo-400" />
          <span>Install on iPhone & iPad</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        Install <strong>Cutline Studio</strong> as a fullscreen app without browser URL bars or clunky controls:
      </p>

      <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-slate-800 text-indigo-400 font-bold shrink-0">1</div>
          <p className="text-slate-300">
            Tap the <span className="inline-flex items-center gap-1 font-semibold text-white px-1.5 py-0.5 rounded bg-slate-800"><Share className="w-3.5 h-3.5" /> Share</span> icon in Safari toolbar.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-slate-800 text-indigo-400 font-bold shrink-0">2</div>
          <p className="text-slate-300">
            Scroll down and select <span className="inline-flex items-center gap-1 font-semibold text-white px-1.5 py-0.5 rounded bg-slate-800"><PlusSquare className="w-3.5 h-3.5" /> Add to Home Screen</span>.
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow-lg shadow-indigo-600/30 transition-all"
      >
        Got It, Thanks!
      </button>
    </div>
  </div>
);
