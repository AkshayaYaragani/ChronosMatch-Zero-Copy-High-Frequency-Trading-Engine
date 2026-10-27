import React from 'react';
import { TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface BookLevel {
  price: number;
  price_cents: number;
  volume: number;
  orders: number;
}

interface OrderBookLadderProps {
  bids: BookLevel[];
  asks: BookLevel[];
  spread: number;
  symbol: string;
}

export const OrderBookLadder: React.FC<OrderBookLadderProps> = ({
  bids = [],
  asks = [],
  spread = 0.02,
  symbol = 'NVDA'
}) => {
  const { isDark } = useTheme();

  // Compute max volume for depth visual scale
  const maxBidVol = Math.max(...bids.map(b => b.volume), 1);
  const maxAskVol = Math.max(...asks.map(a => a.volume), 1);
  const maxVolume = Math.max(maxBidVol, maxAskVol);

  const bestBid = bids[0]?.price || 0;
  const bestAsk = asks[0]?.price || 0;
  const midPrice = bestBid && bestAsk ? ((bestBid + bestAsk) / 2).toFixed(2) : '182.50';

  return (
    <div
      className={`border rounded-xl p-3 sm:p-4 flex flex-col h-full shadow-lg font-mono transition-colors duration-200 ${
        isDark ? 'bg-[#1c2030] border-[#2a2e39] text-slate-200' : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between pb-2.5 border-b mb-3 ${
          isDark ? 'border-[#2a2e39]' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Layers className={`w-4 h-4 ${isDark ? 'text-[#8ca0b4]' : 'text-blue-600'}`} />
          <h2 className={`text-xs font-semibold tracking-wider uppercase ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            L2 ORDER BOOK DEPTH <span className="text-[11px] text-[#64748b] font-normal">({symbol})</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          <span className="text-[#64748b]">
            Mid: <strong className={isDark ? 'text-slate-200' : 'text-slate-900 font-bold'}>${midPrice}</strong>
          </span>
          <span
            className={`px-2 py-0.5 rounded border text-[11px] ${
              isDark
                ? 'bg-[#131722] border-[#2a2e39] text-[#8ca0b4]'
                : 'bg-slate-50 border-slate-200 text-blue-700'
            }`}
          >
            Spread: <strong className={isDark ? 'text-slate-200' : 'text-slate-900'}>${spread.toFixed(2)}</strong>
          </span>
        </div>
      </div>

      {/* Ladder Columns */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1 text-xs select-none overflow-hidden">
        {/* BIDS SIDE (SAGE GREEN BUY LIQUIDITY) */}
        <div className="flex flex-col">
          <div
            className={`flex items-center justify-between text-[10px] font-semibold pb-1.5 border-b px-1 mb-1 uppercase tracking-wider ${
              isDark
                ? 'text-[#7da98f] border-[#2a2e39]'
                : 'text-emerald-700 border-slate-200'
            }`}
          >
            <span className="flex items-center gap-1">
              <TrendingUp className={`w-3 h-3 ${isDark ? 'text-[#5b9a78]' : 'text-emerald-600'}`} />
              BIDS (BUY)
            </span>
            <span className="text-[#64748b]">SIZE / ORDS</span>
          </div>

          <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto pr-1">
            {bids.length === 0 ? (
              <div className="text-center text-[#64748b] py-8 italic text-xs">Waiting for bid quotes...</div>
            ) : (
              bids.slice(0, 10).map((bid, i) => {
                const pct = Math.min(100, Math.round((bid.volume / maxVolume) * 100));
                return (
                  <div
                    key={`bid-${bid.price_cents}-${i}`}
                    className={`relative flex items-center justify-between py-1 px-2 rounded transition-all border overflow-hidden ${
                      isDark
                        ? 'bg-[#151926]/70 hover:bg-[#1a1f2e] border-transparent hover:border-[#384a3e]'
                        : 'bg-emerald-50/40 hover:bg-emerald-50 border-transparent hover:border-emerald-200'
                    }`}
                  >
                    {/* Volume Bar */}
                    <div
                      className={`absolute right-0 top-0 bottom-0 pointer-events-none transition-all duration-300 ${
                        isDark ? 'bg-[#5b9a78]/15' : 'bg-emerald-500/15'
                      }`}
                      style={{ width: `${pct}%` }}
                    />

                    {/* Price - Sage Green */}
                    <span className={`font-bold relative z-10 ${isDark ? 'text-[#7da98f]' : 'text-emerald-700'}`}>
                      ${bid.price.toFixed(2)}
                    </span>

                    {/* Volume and Order Count */}
                    <div className="flex items-center gap-1.5 sm:gap-2 relative z-10 text-right">
                      <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {bid.volume.toLocaleString()}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded border ${
                          isDark
                            ? 'text-[#64748b] bg-[#1c2030] border-[#2a2e39]'
                            : 'text-slate-500 bg-white border-slate-200'
                        }`}
                      >
                        {bid.orders}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ASKS SIDE (BRICK RED SELL LIQUIDITY) */}
        <div className="flex flex-col">
          <div
            className={`flex items-center justify-between text-[10px] font-semibold pb-1.5 border-b px-1 mb-1 uppercase tracking-wider ${
              isDark
                ? 'text-[#c07070] border-[#2a2e39]'
                : 'text-rose-700 border-slate-200'
            }`}
          >
            <span className="flex items-center gap-1">
              <TrendingDown className={`w-3 h-3 ${isDark ? 'text-[#b95353]' : 'text-rose-600'}`} />
              ASKS (SELL)
            </span>
            <span className="text-[#64748b]">SIZE / ORDS</span>
          </div>

          <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto pl-1">
            {asks.length === 0 ? (
              <div className="text-center text-[#64748b] py-8 italic text-xs">Waiting for ask quotes...</div>
            ) : (
              asks.slice(0, 10).map((ask, i) => {
                const pct = Math.min(100, Math.round((ask.volume / maxVolume) * 100));
                return (
                  <div
                    key={`ask-${ask.price_cents}-${i}`}
                    className={`relative flex items-center justify-between py-1 px-2 rounded transition-all border overflow-hidden ${
                      isDark
                        ? 'bg-[#151926]/70 hover:bg-[#1a1f2e] border-transparent hover:border-[#523333]'
                        : 'bg-rose-50/40 hover:bg-rose-50 border-transparent hover:border-rose-200'
                    }`}
                  >
                    {/* Volume Bar */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-300 ${
                        isDark ? 'bg-[#b95353]/15' : 'bg-rose-500/15'
                      }`}
                      style={{ width: `${pct}%` }}
                    />

                    {/* Price - Brick Red */}
                    <span className={`font-bold relative z-10 ${isDark ? 'text-[#c07070]' : 'text-rose-700'}`}>
                      ${ask.price.toFixed(2)}
                    </span>

                    {/* Volume and Order Count */}
                    <div className="flex items-center gap-1.5 sm:gap-2 relative z-10 text-right">
                      <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {ask.volume.toLocaleString()}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded border ${
                          isDark
                            ? 'text-[#64748b] bg-[#1c2030] border-[#2a2e39]'
                            : 'text-slate-500 bg-white border-slate-200'
                        }`}
                      >
                        {ask.orders}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div
        className={`pt-2 mt-2 border-t flex items-center justify-between text-[10px] text-[#64748b] ${
          isDark ? 'border-[#2a2e39]' : 'border-slate-200'
        }`}
      >
        <span>Engine: Price-Time Priority (FIFO)</span>
        <span className={isDark ? 'text-[#7da98f]' : 'text-emerald-700 font-medium'}>
          Zero-Copy Memory Slice
        </span>
      </div>
    </div>
  );
};
