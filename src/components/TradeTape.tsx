import React from 'react';
import { ListFilter, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface TradeItem {
  trade_id: number;
  maker_id: number;
  taker_id: number;
  timestamp_ns: number;
  latency_us: number;
  price: number;
  quantity: number;
  is_whale: boolean;
}

interface TradeTapeProps {
  trades: TradeItem[];
}

export const TradeTape: React.FC<TradeTapeProps> = ({ trades = [] }) => {
  const { isDark } = useTheme();

  return (
    <div
      className={`border rounded-xl p-3 sm:p-4 flex flex-col h-full shadow-lg font-mono transition-colors duration-200 ${
        isDark ? 'bg-[#1c2030] border-[#2a2e39] text-slate-200' : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between pb-2.5 border-b mb-2.5 ${
          isDark ? 'border-[#2a2e39]' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <ListFilter className={`w-4 h-4 ${isDark ? 'text-[#8ca0b4]' : 'text-blue-600'}`} />
          <h2 className={`text-xs font-semibold tracking-wider uppercase ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            REAL-TIME MATCH TAPE
          </h2>
        </div>
        <span className="text-[11px] text-[#64748b]">
          Last {trades.length} Executions
        </span>
      </div>

      {/* Column Headers */}
      <div
        className={`grid grid-cols-5 text-[10px] font-semibold text-[#64748b] pb-1.5 px-2 border-b uppercase tracking-wider ${
          isDark ? 'border-[#2a2e39]' : 'border-slate-200'
        }`}
      >
        <span>Trade ID</span>
        <span>Price ($)</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Latency</span>
        <span className="text-right">Taker / Maker</span>
      </div>

      {/* Trades List */}
      <div className="flex flex-col gap-0.5 overflow-y-auto flex-1 pr-1 text-xs mt-1">
        {trades.length === 0 ? (
          <div className="text-center text-[#64748b] py-8 italic text-xs">Listening to execution pipe...</div>
        ) : (
          trades.slice().reverse().map((t, idx) => (
            <div
              key={`trade-${t.trade_id}-${idx}`}
              className={`grid grid-cols-5 items-center py-1 px-2 rounded transition-all text-xs ${
                t.is_whale
                  ? isDark
                    ? 'bg-[#292218] border border-[#4a3a24] text-[#d6b77c] font-medium'
                    : 'bg-amber-50 border border-amber-200 text-amber-900 font-medium'
                  : isDark
                  ? 'bg-[#151926]/60 hover:bg-[#1a1f2e] border border-transparent'
                  : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
              }`}
            >
              {/* ID */}
              <span className="flex items-center gap-1 text-[#64748b]">
                {t.is_whale && <Zap className="w-3 h-3 text-[#c29850] fill-current" />}
                #{t.trade_id}
              </span>

              {/* Price */}
              <span className={`font-semibold ${t.is_whale ? (isDark ? 'text-[#d6b77c]' : 'text-amber-800') : (isDark ? 'text-slate-200' : 'text-slate-900')}`}>
                ${t.price.toFixed(2)}
              </span>

              {/* Quantity */}
              <span className="text-right font-medium">
                {t.quantity.toLocaleString()}
              </span>

              {/* Latency */}
              <span className={`text-right font-bold ${isDark ? 'text-[#7da98f]' : 'text-emerald-700'}`}>
                {t.latency_us} µs
              </span>

              {/* Taker / Maker IDs */}
              <span className="text-right text-[10px] text-[#64748b]">
                T#{t.taker_id} <span className="text-slate-400">/</span> M#{t.maker_id}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
