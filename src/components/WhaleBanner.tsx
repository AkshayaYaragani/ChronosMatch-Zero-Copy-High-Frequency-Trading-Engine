import React from 'react';
import { Zap, AlertOctagon, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface WhaleAlert {
  type: string;
  trade_id: number;
  price: number;
  quantity: number;
  latency_us: number;
  time: string;
}

interface WhaleBannerProps {
  alerts: WhaleAlert[];
}

export const WhaleBanner: React.FC<WhaleBannerProps> = ({ alerts = [] }) => {
  const { isDark } = useTheme();
  if (!alerts || alerts.length === 0) return null;
  const latest = alerts[alerts.length - 1];

  return (
    <div
      className={`border rounded-xl p-3 shadow-md mb-3 font-mono transition-colors ${
        isDark
          ? 'bg-[#1c2030] border-[#4a3a24]'
          : 'bg-amber-50/80 border-amber-300 text-amber-950'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-1.5 rounded-lg border ${
              isDark
                ? 'bg-[#292218] text-[#c29850] border-[#4a3a24]'
                : 'bg-amber-100 text-amber-700 border-amber-300'
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#d6b77c]' : 'text-amber-900'}`}>
                INSTITUTIONAL WHALE SWEEP
              </span>
              <span
                className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
                  isDark
                    ? 'bg-[#292218] text-[#d6b77c] border-[#4a3a24]'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                MULTI-LEVEL CLEAR
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Aggressive market order executed <strong className={isDark ? 'text-[#d6b77c] font-bold' : 'text-amber-900 font-bold'}>{latest.quantity.toLocaleString()} shares</strong> at <strong className={isDark ? 'text-slate-100' : 'text-slate-900'}>${latest.price.toFixed(2)}</strong> sweeping limit order books in <strong className={isDark ? 'text-[#7da98f]' : 'text-emerald-700'}>{latest.latency_us} µs</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#64748b] self-end sm:self-center">
          <span>Trade #{latest.trade_id}</span>
          <span>•</span>
          <span>{latest.time}</span>
        </div>
      </div>
    </div>
  );
};
