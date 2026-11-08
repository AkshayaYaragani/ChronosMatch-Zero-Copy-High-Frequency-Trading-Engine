import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Play, ShieldCheck, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { apiFetch } from '../api';

interface RiskSnapshot {
  equity: number;
  grossExposure: number;
  netExposure: number;
  utilization: number;
  dailyLoss: number;
  limits: { maxGrossExposure: number; maxDailyLoss: number; maxOrderRate: number };
  breaches: string[];
}

interface BacktestResult {
  symbol: string;
  strategy: string;
  trades: number;
  returnPct: number;
  sharpe: number;
  maxDrawdownPct: number;
  winRatePct: number;
  implementationShortfallBps: number;
  equityCurve: Array<{ step: number; equity: number }>;
}

interface ExecutionQuality {
  symbol: string;
  fills: number;
  fillRatePct: number;
  averageSlippageBps: number;
  adverseSelectionBps: number;
  estimatedMarketImpactBps: number;
}

const money = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const RiskResearchControlPlane: React.FC = () => {
  const [risk, setRisk] = useState<RiskSnapshot | null>(null);
  const [quality, setQuality] = useState<ExecutionQuality | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [symbol, setSymbol] = useState('NVDA');
  const [strategy, setStrategy] = useState('MOMENTUM');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Ready for research and risk analysis');

  const load = async () => {
    const [riskResponse, qualityResponse] = await Promise.all([
      apiFetch('/api/control/risk'),
      apiFetch(`/api/control/execution-quality?symbol=${encodeURIComponent(symbol)}`)
    ]);
    if (!riskResponse.ok || !qualityResponse.ok) throw new Error('Control-plane data unavailable');
    setRisk(await riskResponse.json());
    setQuality(await qualityResponse.json());
  };

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Control-plane data unavailable'));
    const timer = window.setInterval(() => load().catch(() => undefined), 5000);
    return () => window.clearInterval(timer);
  }, [symbol]);

  const runBacktest = async () => {
    setLoading(true);
    setMessage('Running deterministic tick replay...');
    try {
      const response = await apiFetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, strategy, initialCapital: 100000, steps: 240 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Backtest failed');
      setResult(data);
      setMessage(`Completed ${data.trades} simulated trades`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Backtest failed');
    } finally {
      setLoading(false);
    }
  };

  const riskColor = risk?.breaches.length ? 'text-amber-300' : 'text-emerald-300';
  const curve = useMemo(() => result?.equityCurve.slice(-36) || [], [result]);

  return (
    <div className="space-y-4 font-mono">
      <section className="rounded-xl border border-[#2a2e39] bg-[#1c2030] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-100 uppercase">
              <ShieldCheck className="h-5 w-5 text-emerald-400" /> Risk & Research Control Plane
            </div>
            <p className="mt-1 text-[11px] text-[#8ca0b4]">Backtest strategies, monitor exposure, and measure live execution quality without sending broker orders.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={symbol} onChange={event => setSymbol(event.target.value)} className="rounded border border-[#3b455c] bg-[#131722] px-2 py-2 text-xs text-slate-200">
              {['NVDA', 'AAPL', 'TSLA', 'SPY', 'BTCUSD'].map(item => <option key={item}>{item}</option>)}
            </select>
            <select value={strategy} onChange={event => setStrategy(event.target.value)} className="rounded border border-[#3b455c] bg-[#131722] px-2 py-2 text-xs text-slate-200">
              {['MOMENTUM', 'MEAN_REVERSION', 'VWAP'].map(item => <option key={item}>{item}</option>)}
            </select>
            <button onClick={runBacktest} disabled={loading} className="flex items-center gap-1.5 rounded border border-cyan-700/60 bg-cyan-950/30 px-3 py-2 text-xs font-bold text-cyan-300 disabled:opacity-50">
              <Play className="h-3.5 w-3.5" /> {loading ? 'RUNNING' : 'RUN BACKTEST'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-[10px] text-[#8ca0b4]">{message}</p>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ['Net exposure', risk ? money(risk.netExposure) : '--', riskColor],
          ['Gross exposure', risk ? money(risk.grossExposure) : '--', 'text-slate-100'],
          ['Risk utilization', risk ? `${risk.utilization.toFixed(1)}%` : '--', riskColor],
          ['Daily loss', risk ? money(risk.dailyLoss) : '--', risk?.dailyLoss ? 'text-amber-300' : 'text-emerald-300'],
          ['Order fill rate', quality ? `${quality.fillRatePct.toFixed(1)}%` : '--', 'text-cyan-300']
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-lg border border-[#2a2e39] bg-[#1c2030] p-3">
            <div className="text-[10px] uppercase text-[#64748b]">{label}</div>
            <div className={`mt-1 text-sm font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-[#2a2e39] bg-[#1c2030] p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-100 uppercase"><Activity className="h-4 w-4 text-rose-300" /> Live risk guardrails</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#8ca0b4]">
            <div>Gross limit <strong className="text-slate-200">{risk ? money(risk.limits.maxGrossExposure) : '--'}</strong></div>
            <div>Daily loss limit <strong className="text-slate-200">{risk ? money(risk.limits.maxDailyLoss) : '--'}</strong></div>
            <div>Order-rate limit <strong className="text-slate-200">{risk?.limits.maxOrderRate.toLocaleString() || '--'}/s</strong></div>
            <div>Breaches <strong className={risk?.breaches.length ? 'text-amber-300' : 'text-emerald-300'}>{risk?.breaches.length || 0}</strong></div>
          </div>
          {risk?.breaches.length ? <div className="mt-3 rounded border border-amber-700/50 bg-amber-950/20 p-2 text-[11px] text-amber-200"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />{risk.breaches.join(' • ')}</div> : <div className="mt-3 text-[11px] text-emerald-300">All configured guardrails are within limits.</div>}
        </section>

        <section className="rounded-xl border border-[#2a2e39] bg-[#1c2030] p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-100 uppercase"><Target className="h-4 w-4 text-cyan-300" /> Execution quality • {symbol}</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
            <div><span className="text-[#64748b]">Slippage</span><strong className="ml-2 text-amber-300">{quality?.averageSlippageBps.toFixed(2) || '--'} bps</strong></div>
            <div><span className="text-[#64748b]">Adverse selection</span><strong className="ml-2 text-rose-300">{quality?.adverseSelectionBps.toFixed(2) || '--'} bps</strong></div>
            <div><span className="text-[#64748b]">Market impact</span><strong className="ml-2 text-cyan-300">{quality?.estimatedMarketImpactBps.toFixed(2) || '--'} bps</strong></div>
            <div><span className="text-[#64748b]">Fills</span><strong className="ml-2 text-slate-100">{quality?.fills ?? '--'}</strong></div>
          </div>
        </section>
      </div>

      {result && <section className="rounded-xl border border-cyan-800/50 bg-[#172331] p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-cyan-200 uppercase"><BarChart3 className="h-4 w-4" /> Backtest results • {result.strategy}</div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ['Return', `${result.returnPct.toFixed(2)}%`, result.returnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'],
            ['Sharpe', result.sharpe.toFixed(2), 'text-cyan-300'],
            ['Max drawdown', `${result.maxDrawdownPct.toFixed(2)}%`, 'text-amber-300'],
            ['Win rate', `${result.winRatePct.toFixed(1)}%`, 'text-slate-100'],
            ['Shortfall', `${result.implementationShortfallBps.toFixed(2)} bps`, 'text-violet-300']
          ].map(([label, value, color]) => <div key={label}><div className="text-[10px] uppercase text-[#64748b]">{label}</div><div className={`mt-1 text-sm font-bold ${color}`}>{value}</div></div>)}
        </div>
        <div className="mt-4 flex h-24 items-end gap-1">{curve.map((point, index) => <div key={`${point.step}-${index}`} title={`${money(point.equity)} at step ${point.step}`} className={`flex-1 rounded-t ${point.equity >= 100000 ? 'bg-emerald-400/70' : 'bg-rose-400/70'}`} style={{ height: `${Math.max(8, Math.min(100, (point.equity / Math.max(...curve.map(item => item.equity), 1)) * 100))}%` }} />)}</div>
        <div className="mt-2 flex justify-between text-[10px] text-[#64748b]"><span>Initial capital {money(100000)}</span><span>{result.trades} simulated trades</span></div>
      </section>}
    </div>
  );
};
