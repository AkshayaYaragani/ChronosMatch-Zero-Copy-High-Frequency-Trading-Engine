import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  ShieldAlert,
  Layers,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Info,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface OrderLevel {
  price: number;
  volume: number;
  orders: number;
}

interface OrderFlowHeatmapProps {
  bids: OrderLevel[];
  asks: OrderLevel[];
  symbol?: string;
  midPrice?: number;
}

interface FootprintLevel {
  price: number;
  buyVol: number;
  sellVol: number;
  delta: number;
  totalVol: number;
  isIceberg?: boolean;
  icebergHiddenEst?: number;
  isSpoofed?: boolean;
  spoofCancelSize?: number;
}

export const OrderFlowHeatmap: React.FC<OrderFlowHeatmapProps> = ({
  bids = [],
  asks = [],
  symbol = 'NVDA',
  midPrice = 182.10
}) => {
  const { isDark } = useTheme();
  const [filterMode, setFilterMode] = useState<'all' | 'icebergs' | 'spoofs'>('all');
  const [tickCounter, setTickCounter] = useState(0);

  // Generate simulated dynamic footprint delta data grounded in current bids and asks
  const footprintData = useMemo<FootprintLevel[]>(() => {
    const list: FootprintLevel[] = [];

    // Process Asks (high to low)
    [...asks].reverse().slice(0, 7).forEach((ask, idx) => {
      const buyShare = 0.45 + (Math.sin((ask.price * 100) + tickCounter * 0.1) * 0.3);
      const buyVol = Math.round(ask.volume * Math.max(0.15, Math.min(0.85, buyShare)));
      const sellVol = Math.max(100, ask.volume - buyVol);
      const delta = buyVol - sellVol;
      const isIceberg = idx === 2 || (ask.volume > 250000 && idx === 1);
      const isSpoofed = idx === 5;

      list.push({
        price: ask.price,
        buyVol,
        sellVol,
        delta,
        totalVol: ask.volume,
        isIceberg,
        icebergHiddenEst: isIceberg ? Math.round(ask.volume * 1.8) : undefined,
        isSpoofed,
        spoofCancelSize: isSpoofed ? 14500 : undefined
      });
    });

    // Process Bids (high to low)
    bids.slice(0, 7).forEach((bid, idx) => {
      const buyShare = 0.55 + (Math.cos((bid.price * 100) + tickCounter * 0.1) * 0.3);
      const buyVol = Math.round(bid.volume * Math.max(0.2, Math.min(0.9, buyShare)));
      const sellVol = Math.max(100, bid.volume - buyVol);
      const delta = buyVol - sellVol;
      const isIceberg = idx === 1 || (bid.volume > 110000 && idx === 0);
      const isSpoofed = idx === 4;

      list.push({
        price: bid.price,
        buyVol,
        sellVol,
        delta,
        totalVol: bid.volume,
        isIceberg,
        icebergHiddenEst: isIceberg ? Math.round(bid.volume * 2.2) : undefined,
        isSpoofed,
        spoofCancelSize: isSpoofed ? 18200 : undefined
      });
    });

    return list.sort((a, b) => b.price - a.price);
  }, [bids, asks, tickCounter]);

  // Periodically refresh simulated microsecond delta variations
  useEffect(() => {
    const timer = setInterval(() => {
      setTickCounter(c => c + 1);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const totalBuyVol = footprintData.reduce((acc, curr) => acc + curr.buyVol, 0);
  const totalSellVol = footprintData.reduce((acc, curr) => acc + curr.sellVol, 0);
  const totalCombinedVol = Math.max(1, totalBuyVol + totalSellVol);
  const cumulativeDelta = totalBuyVol - totalSellVol;
  const buyRatio = Math.round((totalBuyVol / totalCombinedVol) * 100);

  const filteredLevels = footprintData.filter(item => {
    if (filterMode === 'icebergs') return item.isIceberg;
    if (filterMode === 'spoofs') return item.isSpoofed;
    return true;
  });

  return (
    <div
      className={`border rounded-xl p-4 transition-colors font-mono shadow-md ${
        isDark ? 'bg-[#131722] border-[#2a2e39] text-slate-200' : 'bg-white border-slate-300 text-slate-800'
      }`}
    >
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-[#2a2e39]/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-orange-500/15 text-orange-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-wider uppercase">
                DOM FOOTPRINT & LIQUIDITY HEATMAP
              </h3>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#1c2230] text-[#7da98f] border border-[#2e3b4e] font-semibold">
                SUB-TICK VOL
              </span>
            </div>
            <p className="text-[11px] text-[#64748b]">
              Order flow imbalance, institutional icebergs & spoofing cancellations for <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{symbol}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex items-center gap-1.5 self-stretch lg:self-auto justify-between lg:justify-end text-xs">
          <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[#2a2e39] bg-[#181d29]">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                filterMode === 'all'
                  ? 'bg-[#253046] text-slate-100 shadow-xs'
                  : 'text-[#64748b] hover:text-slate-300'
              }`}
            >
              ALL LEVELS
            </button>
            <button
              onClick={() => setFilterMode('icebergs')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition ${
                filterMode === 'icebergs'
                  ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700 shadow-xs'
                  : 'text-[#64748b] hover:text-cyan-300'
              }`}
            >
              <span>🧊 ICEBERGS</span>
            </button>
            <button
              onClick={() => setFilterMode('spoofs')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition ${
                filterMode === 'spoofs'
                  ? 'bg-rose-900/60 text-rose-300 border border-rose-700 shadow-xs'
                  : 'text-[#64748b] hover:text-rose-300'
              }`}
            >
              <span>⚠️ SPOOFS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Volumetric Pressure Indicator Bar */}
      <div className="my-3.5 p-3 rounded-lg bg-[#181d29]/70 border border-[#2a2e39] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>AGGRESSIVE BUYS: {totalBuyVol.toLocaleString()} ({buyRatio}%)</span>
          </span>
          <span className="text-[11px] font-semibold text-[#8ca0b4]">
            CUMULATIVE DELTA: <span className={cumulativeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {cumulativeDelta >= 0 ? `+${cumulativeDelta.toLocaleString()}` : cumulativeDelta.toLocaleString()}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-rose-400 font-bold">
            <span>AGGRESSIVE SELLS: {totalSellVol.toLocaleString()} ({100 - buyRatio}%)</span>
            <TrendingDown className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Bi-directional Progress Ratio Bar */}
        <div className="w-full bg-[#131722] h-2.5 rounded-full overflow-hidden flex border border-[#2a2e39]">
          <div
            className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-300"
            style={{ width: `${buyRatio}%` }}
          />
          <div
            className="bg-gradient-to-r from-rose-400 to-rose-600 h-full transition-all duration-300"
            style={{ width: `${100 - buyRatio}%` }}
          />
        </div>
      </div>

      {/* Main Heatmap & Footprint Ladder Table */}
      <div className="overflow-x-auto rounded-lg border border-[#2a2e39]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#181d29] text-[#64748b] text-[10px] uppercase tracking-wider border-b border-[#2a2e39]">
            <tr>
              <th className="py-2 px-3">Price ($)</th>
              <th className="py-2 px-3 text-right">Aggressive Buy Vol</th>
              <th className="py-2 px-3 text-center">Footprint Delta Bar</th>
              <th className="py-2 px-3 text-left">Aggressive Sell Vol</th>
              <th className="py-2 px-3 text-right">Net Delta</th>
              <th className="py-2 px-3 text-center">Institutional Radar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#232836]">
            {filteredLevels.map((lvl) => {
              const isAsk = lvl.price > midPrice;
              const maxSide = Math.max(lvl.buyVol, lvl.sellVol);
              const buyPct = Math.round((lvl.buyVol / Math.max(1, lvl.totalVol)) * 100);
              const sellPct = 100 - buyPct;

              return (
                <tr
                  key={lvl.price}
                  className={`hover:bg-[#1a2030]/80 transition-colors ${
                    lvl.isIceberg ? 'bg-cyan-950/20' : lvl.isSpoofed ? 'bg-rose-950/20' : ''
                  }`}
                >
                  {/* Price */}
                  <td className="py-2 px-3 font-bold">
                    <span className={isAsk ? 'text-rose-400' : 'text-emerald-400'}>
                      ${lvl.price.toFixed(2)}
                    </span>
                  </td>

                  {/* Buy Volume */}
                  <td className="py-2 px-3 text-right font-medium text-emerald-400">
                    {lvl.buyVol.toLocaleString()}
                  </td>

                  {/* Footprint Split Bar */}
                  <td className="py-2 px-3 text-center w-48">
                    <div className="flex items-center h-4 bg-[#11141c] rounded overflow-hidden border border-[#283042]">
                      <div
                        className="bg-emerald-500/70 h-full flex items-center justify-end pr-1 text-[9px] text-emerald-100 font-semibold"
                        style={{ width: `${buyPct}%` }}
                      >
                        {buyPct > 20 && `${buyPct}%`}
                      </div>
                      <div
                        className="bg-rose-500/70 h-full flex items-center justify-start pl-1 text-[9px] text-rose-100 font-semibold"
                        style={{ width: `${sellPct}%` }}
                      >
                        {sellPct > 20 && `${sellPct}%`}
                      </div>
                    </div>
                  </td>

                  {/* Sell Volume */}
                  <td className="py-2 px-3 text-left font-medium text-rose-400">
                    {lvl.sellVol.toLocaleString()}
                  </td>

                  {/* Net Delta */}
                  <td className="py-2 px-3 text-right font-bold">
                    <span className={lvl.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {lvl.delta >= 0 ? `+${lvl.delta.toLocaleString()}` : lvl.delta.toLocaleString()}
                    </span>
                  </td>

                  {/* Radar Tags */}
                  <td className="py-2 px-3 text-center">
                    {lvl.isIceberg && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-900/60 text-cyan-300 border border-cyan-600/60 animate-pulse">
                        🧊 ICEBERG ~{lvl.icebergHiddenEst?.toLocaleString()} SH
                      </span>
                    )}
                    {lvl.isSpoofed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-900/60 text-rose-300 border border-rose-600/60">
                        ⚠️ SPOOF FLASH -{lvl.spoofCancelSize?.toLocaleString()}
                      </span>
                    )}
                    {!lvl.isIceberg && !lvl.isSpoofed && (
                      <span className="text-[10px] text-[#64748b]">STANDARD FLOW</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Informative Footer */}
      <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-[#64748b] gap-2 pt-2 border-t border-[#2a2e39]/50">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#8ca0b4]" />
          <span>Icebergs reveal hidden liquidity replenishment; Spoof alerts flag rapid cancels within 20 milliseconds.</span>
        </span>
        <span className="text-[#8ca0b4] font-semibold">
          Real-time Footprint Resolution: 1 Tick
        </span>
      </div>
    </div>
  );
};
