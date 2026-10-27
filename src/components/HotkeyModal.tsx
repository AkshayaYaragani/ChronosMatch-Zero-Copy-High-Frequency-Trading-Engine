import React from 'react';
import {
  X,
  Keyboard,
  Zap,
  TrendingUp,
  TrendingDown,
  Volume2,
  Pause,
  RotateCcw,
  Layers,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HotkeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HotkeyModal: React.FC<HotkeyModalProps> = ({ isOpen, onClose }) => {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const hotkeys = [
    {
      key: 'B',
      action: 'Instant Market Buy',
      desc: 'Inject aggressive 100 share limit buy at current best ask',
      badge: 'TRADE'
    },
    {
      key: 'S',
      action: 'Instant Market Sell',
      desc: 'Inject aggressive 100 share limit sell at current best bid',
      badge: 'TRADE'
    },
    {
      key: 'W',
      action: 'Inject Whale Sweep',
      desc: 'Fire 10,000+ institutional block sweeping all top book levels',
      badge: 'LIQUIDITY'
    },
    {
      key: 'Space',
      action: 'Pause / Resume Engine',
      desc: 'Toggle the high-frequency matching engine background loop',
      badge: 'ENGINE'
    },
    {
      key: 'M',
      action: 'Mute / Unmute Audio',
      desc: 'Toggle low-latency Web Audio API HFT soundscape sonification',
      badge: 'AUDIO'
    },
    {
      key: '1 - 6',
      action: 'Switch Workspace Views',
      desc: '1: LOB Floor • 2: Order Flow • 3: Algo Lab • 4: Smart Router • 5: Time Machine • 6: 3D Spatial',
      badge: 'NAV'
    },
    {
      key: 'R',
      action: 'Quant RAG Studio',
      desc: 'Jump directly to Grounded Quantitative RAG Knowledge Engine',
      badge: 'AI RAG'
    },
    {
      key: '?',
      action: 'Open Hotkeys HUD',
      desc: 'Display this Bloomberg-style keyboard command center',
      badge: 'SYSTEM'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs font-mono"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isDark
            ? 'bg-[#181d29] border-[#2e3748] text-slate-100'
            : 'bg-white border-slate-300 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b ${
            isDark ? 'border-[#2a3444] bg-[#131722]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-[#8ca0b4]/20 text-[#8ca0b4]">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-wider uppercase">
                PRO TRADER HOTKEY COMMAND CENTER
              </h2>
              <p className="text-[10px] text-[#64748b]">
                Bloomberg & Citadel-style single-key microsecond execution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#64748b] hover:text-slate-200 hover:bg-[#252c3c] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hotkeys Table */}
        <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
          {hotkeys.map((h) => (
            <div
              key={h.key}
              className={`p-2.5 rounded-lg border flex items-center justify-between transition ${
                isDark
                  ? 'bg-[#131722] border-[#272e3d] hover:border-[#3d485e]'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <kbd className="px-2.5 py-1 rounded bg-[#202838] border border-[#3b475e] text-slate-100 text-xs font-black shadow-inner min-w-[36px] text-center">
                  {h.key}
                </kbd>
                <div>
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>{h.action}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1c2230] text-[#7da98f] border border-[#2b3748]">
                      {h.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#64748b]">{h.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t text-[11px] text-[#64748b] flex items-center justify-between ${
            isDark ? 'border-[#2a3444] bg-[#131722]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <span>Press any key anywhere in the app to fire instantly.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#202738] hover:bg-[#283246] text-slate-200 font-bold border border-[#38435a] transition"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
