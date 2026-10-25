import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Zap,
  Play,
  Square,
  Pause,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../utils/audioEngine';

interface ChildOrder {
  id: string;
  sliceNum: number;
  shares: number;
  price: number;
  time: string;
  latencyUs: number;
  status: 'FILLED' | 'PENDING' | 'ROUTED';
}

interface AlgoExecutionStudioProps {
  currentMid?: number;
  symbol?: string;
  onOrderExecuted?: (order: any) => void;
}

export const AlgoExecutionStudio: React.FC<AlgoExecutionStudioProps> = ({
  currentMid = 182.10,
  symbol = 'NVDA',
  onOrderExecuted
}) => {
  const { isDark } = useTheme();

  // Algo settings
  const [algoType, setAlgoType] = useState<'TWAP' | 'VWAP' | 'SNIPER' | 'ICEBERG' | 'POV'>('TWAP');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [parentQuantity, setParentQuantity] = useState<number>(5000);
  const [durationSec, setDurationSec] = useState<number>(20);
  const [maxSlippageCents, setMaxSlippageCents] = useState<number>(5);

  // Execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [filledQuantity, setFilledQuantity] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [childOrders, setChildOrders] = useState<ChildOrder[]>([]);
  const [benchmarkPrice, setBenchmarkPrice] = useState<number>(currentMid);

  const timerRef = useRef<any>(null);
  const currentMidRef = useRef(currentMid);
  currentMidRef.current = currentMid;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStartAlgo = () => {
    if (isRunning) return;
    setIsRunning(true);
    setFilledQuantity(0);
    setTotalCost(0);
    setChildOrders([]);
    setBenchmarkPrice(currentMid);

    const totalSlices = algoType === 'SNIPER' ? 4 : 10;
    const sliceIntervalMs = (durationSec * 1000) / totalSlices;
    let sliceCount = 0;
    const sliceSize = Math.floor(parentQuantity / totalSlices);

    audioEngine.playChirp(880, 0.08, 'triangle', 0.25);

    timerRef.current = setInterval(() => {
      sliceCount += 1;
      const mid = currentMidRef.current;
      // Slight simulated price variance based on side
      const executedPrice = side === 'BUY'
        ? Number((mid + (Math.random() * 0.04) - 0.01).toFixed(2))
        : Number((mid - (Math.random() * 0.04) + 0.01).toFixed(2));

      const latencyUs = Number((18 + Math.random() * 25).toFixed(1));

      // Trigger audio child slice chirp
      audioEngine.playChirp(side === 'BUY' ? 950 + sliceCount * 25 : 800 - sliceCount * 20, 0.03, 'sine', 0.18);

      const newChild: ChildOrder = {
        id: `ALGO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        sliceNum: sliceCount,
        shares: sliceSize,
        price: executedPrice,
        time: new Date().toLocaleTimeString(),
        latencyUs,
        status: 'FILLED'
      };

      setChildOrders(prev => [newChild, ...prev.slice(0, 19)]);
      setFilledQuantity(prev => {
        const next = Math.min(parentQuantity, prev + sliceSize);
        return next;
      });
      setTotalCost(prev => prev + (sliceSize * executedPrice));

      if (onOrderExecuted) {
        onOrderExecuted({
          side,
          price: executedPrice,
          shares: sliceSize,
          algo: algoType
        });
      }

      if (sliceCount >= totalSlices) {
        clearInterval(timerRef.current);
        setIsRunning(false);
        audioEngine.playChirp(1200, 0.15, 'sine', 0.3);
      }
    }, sliceIntervalMs);
  };

  const handleStopAlgo = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
  };

  const avgFillPrice = filledQuantity > 0 ? (totalCost / filledQuantity).toFixed(2) : '-';
  const progressPct = Math.min(100, Math.round((filledQuantity / parentQuantity) * 100));
  const slippageCents = filledQuantity > 0 && avgFillPrice !== '-'
    ? (side === 'BUY' ? (parseFloat(avgFillPrice) - benchmarkPrice) * 100 : (benchmarkPrice - parseFloat(avgFillPrice)) * 100).toFixed(1)
    : '0.0';

  return (
    <div
      className={`border rounded-xl p-4 transition-colors font-mono shadow-md ${
        isDark ? 'bg-[#131722] border-[#2a2e39] text-slate-200' : 'bg-white border-slate-300 text-slate-800'
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#2a2e39]/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-wider uppercase">
                AUTOMATED QUANT ALGO EXECUTION LAB
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isRunning ? 'bg-emerald-950 text-emerald-300 border border-emerald-600 animate-pulse' : 'bg-[#1b2230] text-[#8ca0b4]'
              }`}>
                {isRunning ? 'EXECUTION IN PROGRESS' : 'IDLE / READY'}
              </span>
            </div>
            <p className="text-[11px] text-[#64748b]">
              Order slicing, implementation shortfall minimizer & sub-50µs smart routing for <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{symbol}</strong>
            </p>
          </div>
        </div>

        {/* Start / Stop Controls */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={handleStartAlgo}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-98"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>LAUNCH ALGO</span>
            </button>
          ) : (
            <button
              onClick={handleStopAlgo}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-98"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>CANCEL ALGO</span>
            </button>
          )}
        </div>
      </div>

      {/* Algo Strategy Selector & Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 my-4">
        {/* Strategy Selector */}
        <div className="p-3 rounded-lg bg-[#181d29] border border-[#2a2e39] space-y-1.5">
          <label className="text-[10px] font-bold text-[#8ca0b4] uppercase tracking-wider">
            ALGORITHM STRATEGY
          </label>
          <select
            value={algoType}
            onChange={(e) => setAlgoType(e.target.value as any)}
            disabled={isRunning}
            className="w-full bg-[#131722] border border-[#3b455c] rounded p-2 text-xs font-semibold text-slate-200 focus:outline-none"
          >
            <option value="TWAP">TWAP (Time-Weighted Avg)</option>
            <option value="VWAP">VWAP (Volume-Weighted Profile)</option>
            <option value="SNIPER">SNIPER (Sub-Microsecond Peg)</option>
            <option value="ICEBERG">ICEBERG (Hidden Reserve)</option>
            <option value="POV">POV (15% Tape Participation)</option>
          </select>
        </div>

        {/* Side Selection */}
        <div className="p-3 rounded-lg bg-[#181d29] border border-[#2a2e39] space-y-1.5">
          <label className="text-[10px] font-bold text-[#8ca0b4] uppercase tracking-wider">
            ORDER SIDE
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => setSide('BUY')}
              className={`py-1.5 rounded text-xs font-bold transition border ${
                side === 'BUY'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : 'bg-[#131722] text-[#64748b] border-[#2a2e39]'
              }`}
            >
              BUY
            </button>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => setSide('SELL')}
              className={`py-1.5 rounded text-xs font-bold transition border ${
                side === 'SELL'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                  : 'bg-[#131722] text-[#64748b] border-[#2a2e39]'
              }`}
            >
              SELL
            </button>
          </div>
        </div>

        {/* Quantity */}
        <div className="p-3 rounded-lg bg-[#181d29] border border-[#2a2e39] space-y-1.5">
          <label className="text-[10px] font-bold text-[#8ca0b4] uppercase tracking-wider">
            PARENT QUANTITY (SHARES)
          </label>
          <input
            type="number"
            step="500"
            min="500"
            max="100000"
            value={parentQuantity}
            onChange={(e) => setParentQuantity(Math.max(100, parseInt(e.target.value) || 100))}
            disabled={isRunning}
            className="w-full bg-[#131722] border border-[#3b455c] rounded p-1.5 text-xs font-semibold text-slate-200"
          />
        </div>

        {/* Duration */}
        <div className="p-3 rounded-lg bg-[#181d29] border border-[#2a2e39] space-y-1.5">
          <label className="text-[10px] font-bold text-[#8ca0b4] uppercase tracking-wider">
            PACING DURATION (SEC)
          </label>
          <input
            type="number"
            step="5"
            min="5"
            max="300"
            value={durationSec}
            onChange={(e) => setDurationSec(Math.max(5, parseInt(e.target.value) || 5))}
            disabled={isRunning}
            className="w-full bg-[#131722] border border-[#3b455c] rounded p-1.5 text-xs font-semibold text-slate-200"
          />
        </div>
      </div>

      {/* Progress & Live Execution Performance */}
      <div className="p-3 rounded-lg bg-[#181d29]/80 border border-[#2a2e39] space-y-3 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">
            EXECUTION PROGRESS: {filledQuantity.toLocaleString()} / {parentQuantity.toLocaleString()} shares
          </span>
          <span className="font-bold text-[#8ca0b4]">{progressPct}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#131722] h-2.5 rounded-full overflow-hidden border border-[#2a2e39]">
          <div
            className="bg-gradient-to-r from-emerald-500 via-[#8ca0b4] to-emerald-400 h-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Execution Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="p-2 rounded bg-[#131722] border border-[#2a2e39]">
            <span className="text-[10px] text-[#64748b] block">BENCHMARK (MID)</span>
            <span className="font-bold text-slate-200">${benchmarkPrice.toFixed(2)}</span>
          </div>
          <div className="p-2 rounded bg-[#131722] border border-[#2a2e39]">
            <span className="text-[10px] text-[#64748b] block">AVG EXEC PRICE</span>
            <span className="font-bold text-emerald-400">
              {avgFillPrice !== '-' ? `$${avgFillPrice}` : '-'}
            </span>
          </div>
          <div className="p-2 rounded bg-[#131722] border border-[#2a2e39]">
            <span className="text-[10px] text-[#64748b] block">SLIPPAGE VS MID</span>
            <span className={`font-bold ${parseFloat(slippageCents) <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {slippageCents}¢ / share
            </span>
          </div>
          <div className="p-2 rounded bg-[#131722] border border-[#2a2e39]">
            <span className="text-[10px] text-[#64748b] block">TOTAL VALUE EXECUTED</span>
            <span className="font-bold text-[#8ca0b4]">
              ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Child Slices Live Fill Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold tracking-wider uppercase text-[#8ca0b4]">
            LIVE CHILD ORDERS TAPE ({childOrders.length} SLICES)
          </span>
          <span className="text-[10px] text-[#64748b]">
            Zero-copy 32-byte C-struct IPC fills
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#2a2e39] max-h-48 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#181d29] text-[#64748b] text-[10px] uppercase sticky top-0 border-b border-[#2a2e39]">
              <tr>
                <th className="py-1.5 px-3">Slice #</th>
                <th className="py-1.5 px-3">Order ID</th>
                <th className="py-1.5 px-3 text-right">Shares</th>
                <th className="py-1.5 px-3 text-right">Fill Price</th>
                <th className="py-1.5 px-3 text-right">Latency</th>
                <th className="py-1.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232836]">
              {childOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#64748b] text-[11px]">
                    No active algo execution. Select strategy and click LAUNCH ALGO above.
                  </td>
                </tr>
              ) : (
                childOrders.map((child) => (
                  <tr key={child.id} className="hover:bg-[#1a2030] transition">
                    <td className="py-1.5 px-3 font-semibold text-slate-300">
                      Tranche #{child.sliceNum}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-[#8ca0b4]">
                      {child.id}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-200">
                      {child.shares.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-emerald-400">
                      ${child.price.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono text-[#7da98f]">
                      {child.latencyUs}µs
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>FILLED</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
