import React from 'react';
import { Timer, CheckCircle, Database, Gauge, Zap, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LatencyGaugeProps {
  p50: number;
  p90: number;
  p99: number;
  p99_9: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  bufferStats?: {
    capacity: number;
    queued: number;
    dropped: number;
    utilization_pct: number;
  };
}

export const LatencyGauge: React.FC<LatencyGaugeProps> = ({
  p50 = 1.8,
  p90 = 4.2,
  p99 = 18.4,
  p99_9 = 32.1,
  avgLatency = 3.5,
  minLatency = 0.8,
  maxLatency = 45.2,
  bufferStats
}) => {
  const { isDark } = useTheme();
  const isSub50us = p99 <= 50;

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
          <Timer className={`w-4 h-4 ${isDark ? 'text-[#8ca0b4]' : 'text-blue-600'}`} />
          <h2 className={`text-xs font-semibold tracking-wider uppercase ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            EXECUTION LATENCY TELEMETRY
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${
              isSub50us
                ? isDark
                  ? 'bg-[#15231c] text-[#7da98f] border-[#294235]'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isDark
                ? 'bg-[#291f1a] text-[#c29850] border-[#4a3928]'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {isSub50us ? 'SUB-50µs VERIFIED' : 'ELEVATED LOAD'}
          </span>
        </div>
      </div>

      {/* Main Latency Highlight */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
        {/* Median p50 */}
        <div
          className={`border rounded p-2.5 ${
            isDark ? 'bg-[#151926] border-[#2a2e39]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <span className="text-[10px] text-[#64748b] block mb-0.5 uppercase tracking-wider">p50 MEDIAN</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold tracking-tight ${isDark ? 'text-[#7da98f]' : 'text-emerald-700'}`}>
              {p50}
            </span>
            <span className="text-xs text-[#64748b]">µs</span>
          </div>
          <span className="text-[9px] text-[#64748b] mt-0.5 block">50th percentile tick-to-trade</span>
        </div>

        {/* Tail Latency p99 */}
        <div
          className={`border rounded p-2.5 ${
            isDark ? 'bg-[#151926] border-[#2a2e39]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <span className="text-[10px] text-[#64748b] block mb-0.5 uppercase tracking-wider">p99 TAIL</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold tracking-tight ${isSub50us ? (isDark ? 'text-slate-100' : 'text-slate-900') : 'text-rose-600'}`}>
              {p99}
            </span>
            <span className="text-xs text-[#64748b]">µs</span>
          </div>
          <span className="text-[9px] text-[#64748b] mt-0.5 block">99th percentile worst-case</span>
        </div>
      </div>

      {/* Latency Percentiles Spectrum Bar */}
      <div className="space-y-1.5 mb-3 flex-1">
        <div className="flex justify-between text-[10px] text-[#64748b]">
          <span>Percentile Breakdown</span>
          <span>Target &lt; 50.0 µs</span>
        </div>

        <div className="space-y-1">
          {[
            { label: 'p90', val: p90, max: 50 },
            { label: 'p99', val: p99, max: 50 },
            { label: 'p99.9', val: p99_9, max: 50 }
          ].map(p => {
            const pct = Math.min(100, Math.round((p.val / p.max) * 100));
            return (
              <div key={p.label} className="flex items-center gap-2 text-[10px]">
                <span className="w-8 text-[#64748b]">{p.label}</span>
                <div
                  className={`flex-1 h-2 rounded-full overflow-hidden border ${
                    isDark ? 'bg-[#131722] border-[#2a2e39]' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      pct > 90
                        ? 'bg-rose-500'
                        : pct > 60
                        ? 'bg-amber-500'
                        : isDark
                        ? 'bg-[#7da98f]'
                        : 'bg-emerald-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`w-12 text-right font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {p.val} µs
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ring Buffer Health Diagnostics */}
      <div
        className={`pt-2.5 border-t text-[11px] grid grid-cols-3 gap-2 ${
          isDark ? 'border-[#2a2e39]' : 'border-slate-200'
        }`}
      >
        <div>
          <span className="text-[9px] text-[#64748b] block uppercase">Avg Latency</span>
          <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{avgLatency} µs</span>
        </div>
        <div>
          <span className="text-[9px] text-[#64748b] block uppercase">Min Latency</span>
          <span className={isDark ? 'text-[#7da98f]' : 'text-emerald-700 font-bold'}>{minLatency} µs</span>
        </div>
        <div>
          <span className="text-[9px] text-[#64748b] block uppercase">Buffer Drops</span>
          <span className={`font-bold ${bufferStats?.dropped ? 'text-rose-500' : isDark ? 'text-[#7da98f]' : 'text-emerald-700'}`}>
            {bufferStats?.dropped || 0}
          </span>
        </div>
      </div>
    </div>
  );
};
