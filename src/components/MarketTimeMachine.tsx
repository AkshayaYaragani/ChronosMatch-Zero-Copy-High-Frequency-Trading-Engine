import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Play,
  Pause,
  FastForward,
  Rewind,
  AlertOctagon,
  TrendingDown,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../utils/audioEngine';

interface Scenario {
  id: string;
  name: string;
  date: string;
  description: string;
  basePrice: number;
  priceDeltaCurve: number[]; // percentage offsets
  volatility: 'EXTREME' | 'HIGH' | 'MEDIUM';
}

const SCENARIOS: Scenario[] = [
  {
    id: 'flash_crash',
    name: '2010 FLASH CRASH CASCADE',
    date: 'May 6, 2010 • 14:42 EST',
    description: 'Waddell & Reed $4.1B sell algo triggers automated liquidity void. Limit order book depth collapses 95% in 4 minutes.',
    basePrice: 182.10,
    priceDeltaCurve: [0, -0.2, -0.8, -2.4, -6.8, -12.4, -9.2, -4.1, -1.8, -0.6, 0.1],
    volatility: 'EXTREME'
  },
  {
    id: 'cpi_surge',
    name: 'CPI SURPRISE & FED RATE SHOCK',
    date: 'Dec 13, 2023 • 08:30 EST',
    description: 'CPI prints 40bps cooler than consensus. Algorithmic buying frenzy injects 85,000 TPS into the matching engine.',
    basePrice: 182.10,
    priceDeltaCurve: [0, 0.8, 2.5, 4.8, 6.2, 5.8, 7.1, 7.9, 8.4, 8.2, 8.6],
    volatility: 'HIGH'
  },
  {
    id: 'gamma_squeeze',
    name: 'COORDINATED WHALE GAMMA SQUEEZE',
    date: 'Jan 28, 2021 • 10:15 EST',
    description: 'Dealer delta-hedging triggers violent cascade of market sweep orders across all visible and dark liquidity pools.',
    basePrice: 182.10,
    priceDeltaCurve: [0, 1.2, 3.4, 7.8, 14.2, 19.5, 16.1, 21.0, 24.5, 23.0, 25.2],
    volatility: 'EXTREME'
  },
  {
    id: 'normal_mm',
    name: 'HFT MARKET MAKER CONTINUOUS TAPE',
    date: 'Oct 19, 2026 • 11:00 EST',
    description: 'Sub-50 microsecond market making with balanced Poisson order arrivals and minimum queue degradation.',
    basePrice: 182.10,
    priceDeltaCurve: [0, 0.1, -0.05, 0.15, -0.1, 0.05, -0.08, 0.12, 0.02, -0.04, 0.01],
    volatility: 'MEDIUM'
  }
];

export const MarketTimeMachine: React.FC = () => {
  const { isDark } = useTheme();
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timelineIndex, setTimelineIndex] = useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  // Simulated User Position during replay
  const [positionShares, setPositionShares] = useState<number>(0);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [realizedPnl, setRealizedPnl] = useState<number>(0);

  const timerRef = useRef<any>(null);

  // Calculate current price at timeline step
  const pctDelta = selectedScenario.priceDeltaCurve[timelineIndex] || 0;
  const currentPrice = Number((selectedScenario.basePrice * (1 + pctDelta / 100)).toFixed(2));
  const unrealizedPnl = positionShares !== 0 ? (currentPrice - entryPrice) * positionShares : 0;
  const totalPnl = realizedPnl + unrealizedPnl;

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(80, 1000 / speedMultiplier);
      timerRef.current = setInterval(() => {
        setTimelineIndex(prev => {
          if (prev >= selectedScenario.priceDeltaCurve.length - 1) {
            setIsPlaying(false);
            audioEngine.playChirp(600, 0.1, 'sine', 0.2);
            return prev;
          }
          // Sound trigger on volatility spike
          if (Math.abs(pctDelta) > 5) {
            audioEngine.playWhaleSound();
          } else {
            audioEngine.playFillSound(pctDelta >= 0 ? 'bid' : 'ask', 22);
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speedMultiplier, selectedScenario]);

  const handleSelectScenario = (sc: Scenario) => {
    setSelectedScenario(sc);
    setTimelineIndex(0);
    setIsPlaying(false);
    setPositionShares(0);
    setEntryPrice(0);
    setRealizedPnl(0);
  };

  const handlePlayToggle = () => {
    if (timelineIndex >= selectedScenario.priceDeltaCurve.length - 1) {
      setTimelineIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleTrade = (side: 'LONG' | 'SHORT') => {
    const shares = 200;
    if (positionShares === 0) {
      setPositionShares(side === 'LONG' ? shares : -shares);
      setEntryPrice(currentPrice);
    } else {
      // Close out existing
      const pnl = (currentPrice - entryPrice) * positionShares;
      setRealizedPnl(prev => prev + pnl);
      setPositionShares(0);
      setEntryPrice(0);
    }
    audioEngine.playChirp(880, 0.05, 'triangle', 0.25);
  };

  return (
    <div
      className={`border rounded-xl p-4 transition-colors font-mono shadow-md ${
        isDark ? 'bg-[#131722] border-[#2a2e39] text-slate-200' : 'bg-white border-slate-300 text-slate-800'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#2a2e39]/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-wider uppercase">
                QUANT MARKET TIME MACHINE & EVENT REPLAY
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1b2333] text-[#8ca0b4] border border-[#2d3a4e]">
                HISTORICAL REPLAY
              </span>
            </div>
            <p className="text-[11px] text-[#64748b]">
              Scrub through iconic market shocks & algorithmic liquidity crises at up to 100x playback speed
            </p>
          </div>
        </div>

        {/* Playback Speed Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#181d29] border border-[#2a2e39] text-xs">
          {[1, 5, 20, 100].map(sp => (
            <button
              key={sp}
              onClick={() => setSpeedMultiplier(sp)}
              className={`px-2 py-0.5 rounded font-bold transition text-[11px] ${
                speedMultiplier === sp
                  ? 'bg-[#253046] text-[#7da98f] shadow-xs'
                  : 'text-[#64748b] hover:text-slate-200'
              }`}
            >
              {sp}x
            </button>
          ))}
        </div>
      </div>

      {/* Scenario Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 my-4">
        {SCENARIOS.map((sc) => {
          const isSelected = selectedScenario.id === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => handleSelectScenario(sc)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'bg-[#1b2436] border-[#8ca0b4] shadow-md'
                  : 'bg-[#181d29] border-[#2a2e39] hover:border-[#384358]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                  sc.volatility === 'EXTREME'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {sc.volatility}
                </span>
                <span className="text-[10px] text-[#64748b]">{sc.date.split('•')[0]}</span>
              </div>
              <h4 className="font-bold text-xs text-slate-100 truncate mb-1">{sc.name}</h4>
              <p className="text-[10px] text-[#64748b] line-clamp-2 leading-relaxed">
                {sc.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Replay Scrubbing Station & Visual Chart */}
      <div className="p-4 rounded-lg bg-[#181d29] border border-[#2a2e39] space-y-4 mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-[#64748b] uppercase tracking-wider block">
              {selectedScenario.name} • {selectedScenario.date}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-slate-100">
                ${currentPrice.toFixed(2)}
              </span>
              <span className={`text-sm font-bold flex items-center gap-1 ${
                pctDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {pctDelta >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {pctDelta >= 0 ? `+${pctDelta.toFixed(1)}%` : `${pctDelta.toFixed(1)}%`}
              </span>
            </div>
          </div>

          {/* Quick Trade Controls during replay */}
          <div className="flex items-center gap-2">
            {positionShares === 0 ? (
              <>
                <button
                  onClick={() => handleTrade('LONG')}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-98"
                >
                  LONG 200 SH
                </button>
                <button
                  onClick={() => handleTrade('SHORT')}
                  className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition active:scale-98"
                >
                  SHORT 200 SH
                </button>
              </>
            ) : (
              <button
                onClick={() => handleTrade('LONG')}
                className="px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition"
              >
                FLATTEN POSITION ({positionShares > 0 ? '+200' : '-200'} SH)
              </button>
            )}
          </div>
        </div>

        {/* Timeline Scrub Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[#64748b]">
            <span>EVENT START (T+0)</span>
            <span className="text-slate-200 font-semibold">
              STEP {timelineIndex + 1} OF {selectedScenario.priceDeltaCurve.length}
            </span>
            <span>EVENT COMPLETION</span>
          </div>

          <input
            type="range"
            min="0"
            max={selectedScenario.priceDeltaCurve.length - 1}
            value={timelineIndex}
            onChange={(e) => {
              setTimelineIndex(parseInt(e.target.value));
              setIsPlaying(false);
            }}
            className="w-full accent-[#7da98f] cursor-pointer h-2 bg-[#131722] rounded-lg"
          />
        </div>

        {/* Play / Pause / Reset Bar */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={() => setTimelineIndex(0)}
            className="p-2 rounded-lg bg-[#131722] hover:bg-[#202636] border border-[#2a2e39] text-[#8ca0b4] transition"
            title="Rewind to start"
          >
            <Rewind className="w-4 h-4" />
          </button>

          <button
            onClick={handlePlayToggle}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#20293a] to-[#2c384e] hover:from-[#2a364c] hover:to-[#384864] border border-[#445574] text-slate-100 font-bold text-xs flex items-center gap-2 transition shadow-md active:scale-98"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current text-amber-400" />
                <span>PAUSE REPLAY</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-[#7da98f]" />
                <span>{timelineIndex >= selectedScenario.priceDeltaCurve.length - 1 ? 'RESTART' : 'PLAY REPLAY'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => setTimelineIndex(selectedScenario.priceDeltaCurve.length - 1)}
            className="p-2 rounded-lg bg-[#131722] hover:bg-[#202636] border border-[#2a2e39] text-[#8ca0b4] transition"
            title="Fast forward to end"
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Trader PnL & Quant Stress Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-[#181d29] border border-[#2a2e39]">
          <span className="text-[10px] text-[#64748b] block">PORTFOLIO P&L</span>
          <span className={`font-black text-sm ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalPnl >= 0 ? `+$${totalPnl.toFixed(2)}` : `-$${Math.abs(totalPnl).toFixed(2)}`}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-[#181d29] border border-[#2a2e39]">
          <span className="text-[10px] text-[#64748b] block">OPEN POSITION</span>
          <span className="font-bold text-slate-200">
            {positionShares === 0 ? 'FLAT (0 SH)' : `${positionShares > 0 ? 'LONG' : 'SHORT'} ${Math.abs(positionShares)} SH @ $${entryPrice.toFixed(2)}`}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-[#181d29] border border-[#2a2e39]">
          <span className="text-[10px] text-[#64748b] block">SIMULATED SHARPE</span>
          <span className="font-bold text-[#7da98f]">
            {totalPnl >= 0 ? '2.84' : '0.42'}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-[#181d29] border border-[#2a2e39]">
          <span className="text-[10px] text-[#64748b] block">MAX DRAWDOWN</span>
          <span className="font-bold text-rose-400">
            {selectedScenario.volatility === 'EXTREME' ? '-14.8%' : '-2.3%'}
          </span>
        </div>
      </div>
    </div>
  );
};
