import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, CircleAlert, RotateCw, ShieldCheck, Square, Terminal } from 'lucide-react';
import { apiFetch, publicApiFetch } from '../api';

interface EngineStatus {
  running: boolean;
  pid: number | null;
  latestTelemetry?: {
    ingest_tps?: number;
    match_tps?: number;
    total_ingested?: number;
    total_matched?: number;
    buffer?: { capacity?: number; size?: number; dropped?: number };
  } | null;
}

const formatNumber = (value: number | undefined) => (value ?? 0).toLocaleString();

export const ReliabilityCenter: React.FC = () => {
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'stop' | 'restart' | null>(null);
  const [message, setMessage] = useState('Waiting for engine health telemetry...');

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/engine/status');
      if (!response.ok) throw new Error(`Health endpoint returned HTTP ${response.status}`);
      setStatus(await response.json());
      setMessage('Health check completed');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Health check failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const timer = window.setInterval(loadStatus, 3000);
    return () => window.clearInterval(timer);
  }, [loadStatus]);

  const runOperatorAction = async (type: 'stop' | 'restart') => {
    setAction(type);
    setMessage(type === 'restart' ? 'Restarting engine...' : 'Stopping engine...');
    try {
      const stopResponse = await publicApiFetch('/api/engine/stop', { method: 'POST' });
      if (!stopResponse.ok) throw new Error((await stopResponse.json()).error || 'Engine stop failed');
      if (type === 'restart') {
        await new Promise(resolve => window.setTimeout(resolve, 800));
        const startResponse = await publicApiFetch('/api/engine/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rate: 25000, symbol: 'NVDA' })
        });
        if (!startResponse.ok) throw new Error((await startResponse.json()).error || 'Engine restart failed');
      }
      setMessage(type === 'restart' ? 'Engine restart requested' : 'Engine stop requested');
      await loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Operator action failed');
    } finally {
      setAction(null);
    }
  };

  const healthChecks = useMemo(() => {
    const telemetry = status?.latestTelemetry;
    return [
      { label: 'Python process', ok: !!status?.running, detail: status?.pid ? `PID ${status.pid}` : 'Not running' },
      { label: 'Telemetry heartbeat', ok: !!telemetry, detail: telemetry ? 'Receiving engine telemetry' : 'No telemetry received' },
      { label: 'Order flow', ok: (telemetry?.ingest_tps ?? 0) > 0 && (telemetry?.match_tps ?? 0) > 0, detail: telemetry ? `${formatNumber(telemetry.match_tps)} matches/s` : 'Waiting for metrics' },
      { label: 'Ring buffer drops', ok: (telemetry?.buffer?.dropped ?? 0) === 0, detail: `${formatNumber(telemetry?.buffer?.dropped)} dropped messages` }
    ];
  }, [status]);

  const allHealthy = healthChecks.every(check => check.ok);
  const telemetry = status?.latestTelemetry;
  const alerts = [
    (telemetry?.buffer?.dropped ?? 0) > 0 ? `Ring buffer dropped ${formatNumber(telemetry?.buffer?.dropped)} messages` : null,
    (telemetry as any)?.p99_9_us > 100 ? `Tail latency exceeded 100µs (${Number((telemetry as any).p99_9_us).toFixed(1)}µs)` : null,
    telemetry && (telemetry.ingest_tps ?? 0) > 0 && (telemetry.match_tps ?? 0) < (telemetry.ingest_tps ?? 0) * 0.9 ? 'Matching throughput is trailing ingestion rate' : null
  ].filter((alert): alert is string => !!alert);

  return (
    <div className="space-y-4 font-mono">
      <section className="rounded-xl border border-[#2a2e39] bg-[#1c2030] p-4 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-100 uppercase">
              <ShieldCheck className="h-5 w-5 text-[#7da98f]" /> Reliability Center
            </div>
            <p className="mt-1 text-[11px] text-[#64748b]">
              Live engine health, telemetry heartbeat, ring-buffer safety, and operator recovery controls.
            </p>
          </div>
          <div className={`flex items-center gap-2 rounded border px-3 py-2 text-xs font-bold ${allHealthy ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-300' : 'border-amber-700/50 bg-amber-950/30 text-amber-300'}`}>
            {allHealthy ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
            {loading ? 'CHECKING' : allHealthy ? 'SYSTEM HEALTHY' : 'ATTENTION REQUIRED'}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => loadStatus()} className="flex items-center gap-1.5 rounded border border-[#3b455c] bg-[#131722] px-3 py-2 text-xs text-slate-200">
            <RotateCw className="h-3.5 w-3.5" /> REFRESH
          </button>
          <button onClick={() => runOperatorAction('restart')} disabled={action !== null} className="flex items-center gap-1.5 rounded border border-emerald-700/60 bg-emerald-950/30 px-3 py-2 text-xs font-bold text-emerald-300 disabled:opacity-50">
            <RotateCw className={`h-3.5 w-3.5 ${action === 'restart' ? 'animate-spin' : ''}`} /> RESTART ENGINE
          </button>
          <button onClick={() => runOperatorAction('stop')} disabled={action !== null} className="flex items-center gap-1.5 rounded border border-red-800/60 bg-red-950/30 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-50">
            <Square className="h-3.5 w-3.5" /> STOP ENGINE
          </button>
        </div>
        <p className="mt-3 text-[10px] text-[#8ca0b4]">{message}</p>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {healthChecks.map(check => (
          <div key={check.label} className="rounded-lg border border-[#2a2e39] bg-[#1c2030] p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <span className={`h-2 w-2 rounded-full ${check.ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {check.label}
            </div>
            <p className="mt-2 text-[10px] text-[#64748b]">{check.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {[
          ['Ingest rate', `${formatNumber(telemetry?.ingest_tps)} ord/s`],
          ['Match rate', `${formatNumber(telemetry?.match_tps)} match/s`],
          ['Processed orders', formatNumber(telemetry?.total_matched)]
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[#2a2e39] bg-[#1c2030] p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#64748b]">
              <Activity className="h-3.5 w-3.5" /> {label}
            </div>
            <div className="mt-2 text-xl font-bold text-slate-100">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[#2a2e39] bg-[#1c2030] p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-100 uppercase">
          <CircleAlert className="h-4 w-4 text-amber-300" /> Active observability alerts
        </div>
        {alerts.length ? (
          <ul className="mt-3 space-y-2 text-[11px] text-amber-200">{alerts.map(alert => <li key={alert} className="rounded border border-amber-800/50 bg-amber-950/20 px-3 py-2">{alert}</li>)}</ul>
        ) : (
          <p className="mt-3 text-[11px] text-emerald-300">No active latency, throughput, or ring-buffer alerts.</p>
        )}
      </div>

      <div className="rounded-lg border border-[#2a2e39] bg-[#1c2030] p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-100 uppercase">
          <Terminal className="h-4 w-4 text-[#8ca0b4]" /> Recovery runbook
        </div>
        <ol className="mt-3 grid gap-2 text-[11px] text-[#8ca0b4] md:grid-cols-3">
          <li><span className="text-[#7da98f]">01.</span> Confirm telemetry heartbeat and process PID.</li>
          <li><span className="text-[#7da98f]">02.</span> Stop the engine before investigating dropped messages.</li>
          <li><span className="text-[#7da98f]">03.</span> Restart only after the order-flow checks are green.</li>
        </ol>
      </div>
    </div>
  );
};
