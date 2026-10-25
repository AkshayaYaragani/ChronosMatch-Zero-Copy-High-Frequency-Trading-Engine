import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Zap,
  Activity,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Database,
  Radio,
  Binary,
  Layers
} from 'lucide-react';

interface ChronosOpeningSplashProps {
  onComplete: () => void;
  isDark?: boolean;
}

export const ChronosOpeningSplash: React.FC<ChronosOpeningSplashProps> = ({
  onComplete,
  isDark = true
}) => {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [calibratedLatency, setCalibratedLatency] = useState(84.2);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const hasFinishedRef = useRef(false);

  const steps = [
    { text: 'Allocating POSIX lock-free ring buffer in /dev/shm (4MB mmap)', tag: 'POSIX SHM' },
    { text: 'Isolating CPU core & pinning matching thread (no context switches)', tag: 'AFFINITY' },
    { text: 'Calibrating high-precision Time Stamp Counter (TSC @ 3.40 GHz)', tag: 'TSC CAL' },
    { text: 'Zero-copy 32-byte C-struct binary ingestion pipeline active', tag: 'STRUCT-32' },
    { text: 'Connecting Firestore Trade Vault & Quant AI telemetry feed', tag: 'FIRESTORE' },
    { text: 'ChronosMatch Engine online. Sub-50 microsecond execution ready.', tag: 'ONLINE' }
  ];

  const handleFinish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsFading(true);
    setTimeout(() => {
      onCompleteRef.current();
    }, 280);
  };

  useEffect(() => {
    // Run timer once on mount without being reset by parent re-renders
    const startTime = Date.now();
    const duration = 2200; // 2.2 seconds for a clear, engaging visual boot sequence

    const interval = setInterval(() => {
      if (hasFinishedRef.current) {
        clearInterval(interval);
        return;
      }

      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      // Dynamically simulate TSC latency countdown from 84.2µs down to 18.6µs
      const latencyVal = (84.2 - (pct / 100) * 65.6).toFixed(1);
      setCalibratedLatency(parseFloat(latencyVal));

      const currentStep = Math.min(
        steps.length - 1,
        Math.floor((pct / 100) * steps.length)
      );
      setStepIndex(currentStep);

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(handleFinish, 180);
      }
    }, 25);

    // Hard failsafe: guarantee main board opens within 2.8 seconds
    const failsafe = setTimeout(() => {
      clearInterval(interval);
      handleFinish();
    }, 2800);

    // Keyboard shortcut (Escape, Enter, or Space to bypass immediately)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      clearTimeout(failsafe);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      onClick={handleFinish}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center font-mono cursor-pointer transition-all duration-300 select-none ${
        isFading ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      } ${
        isDark
          ? 'bg-[#090c12] text-slate-100'
          : 'bg-[#0f172a] text-slate-100'
      }`}
      title="Click anywhere to skip and enter the main board immediately"
    >
      {/* High-tech matrix dot grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#2d3748_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

      {/* Ambient glowing radial beam */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-[#8ca0b4]/15 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[350px] h-[350px] rounded-full bg-[#7da98f]/10 blur-2xl pointer-events-none" />

      <div
        className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Central Engine Logo with Radar Sweep */}
        <div className="relative mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-[#141926] via-[#1c2334] to-[#243048] border border-[#3d4c68] flex items-center justify-center shadow-[0_0_35px_rgba(140,160,180,0.25)] relative overflow-hidden group">
            {/* Rotating radar line */}
            <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(140,160,180,0.45)_360deg)] animate-spin" />
            <Cpu className="w-10 h-10 sm:w-11 sm:h-11 text-[#8ca0b4] relative z-10 drop-shadow-[0_0_14px_rgba(140,160,180,0.7)]" />
          </div>

          {/* Pulsing ring indicator */}
          <div className="absolute -inset-2.5 rounded-2xl border border-[#7da98f]/50 animate-ping opacity-35 pointer-events-none" />

          {/* Status badge floating tag */}
          <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-[#1b2b22] border border-[#5b9a78]/60 text-[9px] font-bold text-[#7da98f] flex items-center gap-1 shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5b9a78] animate-ping" />
            <span>TSC 3.4G</span>
          </div>
        </div>

        {/* Brand & Subtitle */}
        <div className="space-y-1.5 mb-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#1e2738]/80 border border-[#3b4862] text-[10px] text-[#8ca0b4] tracking-wider uppercase mb-1">
            <Radio className="w-3 h-3 text-[#7da98f] animate-pulse" />
            <span>INITIALIZING MATCHING RUNTIME</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-widest text-slate-100 flex items-center justify-center gap-2">
            CHRONOS<span className="text-[#8ca0b4]">MATCH</span>
          </h1>
          <p className="text-xs text-[#7da98f] tracking-wider uppercase font-semibold flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#5b9a78] animate-pulse" />
            Zero-Copy HFT Limit Order Book & Telemetry
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full bg-[#131722] border border-[#2d384c] rounded-full h-3 p-0.5 mb-2.5 overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-[#5b9a78] via-[#8ca0b4] to-[#7da98f] rounded-full transition-all duration-75 ease-out shadow-[0_0_12px_rgba(125,169,143,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Live Metrics Header */}
        <div className="w-full flex items-center justify-between text-xs text-[#64748b] mb-3 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-semibold">
              {progress < 100 ? 'SYSTEM ALLOCATION...' : 'SYSTEM READY'}
            </span>
            <span className="text-[10px] text-[#7da98f]">
              {calibratedLatency}µs
            </span>
          </div>
          <span className="text-[#8ca0b4] font-black text-sm">{progress}%</span>
        </div>

        {/* Diagnostic Boot Logs Terminal */}
        <div className="w-full bg-[#0d1017]/95 border border-[#2b3548] rounded-xl p-3 text-left space-y-1.5 shadow-2xl mb-5 h-28 overflow-hidden flex flex-col justify-end">
          {steps.slice(0, stepIndex + 1).map((s, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between text-[11px] transition-all duration-150 ${
                idx === stepIndex
                  ? 'text-slate-100 font-bold bg-[#1b2333]/80 px-2 py-0.5 rounded border-l-2 border-[#7da98f]'
                  : 'text-[#64748b] px-2 py-0.5'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className={idx === stepIndex ? 'text-[#7da98f]' : 'text-slate-600'}>
                  {idx === stepIndex ? '▶' : '✓'}
                </span>
                <span className="truncate">{s.text}</span>
              </div>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#1a202c] text-[#8ca0b4] border border-[#2d3748] shrink-0 ml-2 font-mono">
                {s.tag}
              </span>
            </div>
          ))}
        </div>

        {/* Big Prominent Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
          <button
            onClick={handleFinish}
            className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-[#1c2436] via-[#25324a] to-[#2c3c5a] hover:from-[#25324a] hover:to-[#36486c] border border-[#48597c] text-slate-100 text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98"
          >
            <span>ENTER MAIN BOARD</span>
            <ArrowRight className="w-4 h-4 text-[#7da98f]" />
          </button>
        </div>

        {/* Helpful Shortcut Tip */}
        <p className="text-[11px] text-[#64748b] mt-3.5 flex items-center justify-center gap-1.5">
          <span>Tip: Press</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#1c2030] border border-[#2a2e39] text-slate-300 text-[10px]">
            Space
          </kbd>
          <span>or click anywhere to skip immediately</span>
        </p>
      </div>
    </div>
  );
};
