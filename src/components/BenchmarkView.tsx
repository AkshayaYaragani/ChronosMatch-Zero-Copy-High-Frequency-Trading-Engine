import React, { useState } from 'react';
import { Play, Activity, CheckCircle2, BarChart3, Download, RefreshCw, TrendingUp } from 'lucide-react';
import { apiUrl } from '../api';

interface BenchmarkResult {
  mode: string;
  num_orders: number;
  total_time_sec: number;
  throughput_ops_sec: number;
  ingest_time_sec: number;
  match_time_sec: number;
  p50_us: number;
  p90_us: number;
  p99_us: number;
  p99_9_us?: number;
  gc_collections: number;
  zero_copy: boolean;
}

interface BenchmarkRun {
  completedAt: string;
  benchmarkSummary: Record<string, string | number | boolean>;
  results: BenchmarkResult[];
}

export const BenchmarkView: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [orderCount, setOrderCount] = useState(25000);
  const [results, setResults] = useState<BenchmarkRun | null>(null);
  const [history, setHistory] = useState<BenchmarkRun[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleRunBenchmark = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/benchmark/run'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: orderCount })
      });
      if (!res.ok) {
        throw new Error(`Benchmark execution failed (${res.status})`);
      }
      const data = await res.json();
      const run = {
        completedAt: new Date().toISOString(),
        benchmarkSummary: data.benchmark_summary,
        results: data.results
      } as BenchmarkRun;
      setResults(run);
      setHistory(previous => [run, ...previous].slice(0, 8));
    } catch (err: any) {
      setError(err.message || 'Benchmark error');
    } finally {
      setIsRunning(false);
    }
  };

  // Run initial lightweight benchmark if none
  React.useEffect(() => {
    if (!results) {
      handleRunBenchmark();
    }
  }, []);

  const benchmarkSummary = results?.benchmarkSummary;
  const runs = results?.results || [];
  const zeroCopyRun = runs.find(run => run.zero_copy);
  const maxThroughput = Math.max(...runs.map(run => run.throughput_ops_sec), 1);
  const maxLatency = Math.max(...runs.map(run => run.p99_us), 1);

  const downloadCsv = () => {
    if (!results) return;
    const header = 'mode,orders,throughput_ops_sec,p50_us,p90_us,p99_us,p99_9_us,total_time_sec,gc_collections';
    const rows = results.results.map(run => [
      run.mode,
      run.num_orders,
      run.throughput_ops_sec,
      run.p50_us,
      run.p90_us,
      run.p99_us,
      run.p99_9_us ?? '',
      run.total_time_sec,
      run.gc_collections
    ].join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chronosmatch-benchmark-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Intro Header */}
      <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg p-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#131722] text-[#8ca0b4] border border-[#2a2e39] text-[9px] font-bold tracking-widest uppercase">
                MID-PROJECT REVIEW MILESTONE
              </span>
              <h2 className="text-sm font-bold text-slate-100 uppercase">
                Zero-Copy Memory-Mapped IPC vs Pickle vs JSON Audit
              </h2>
            </div>
            <p className="text-xs text-[#64748b] mt-1 max-w-3xl leading-relaxed">
              In High-Frequency Trading, Python is commonly dismissed due to serializer latency and GC stop-the-world pauses.
              This automated benchmark pipes identical order streams across separate processes to prove ChronosMatch’s zero-copy architecture eliminates serialization lag.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={orderCount}
              onChange={(e) => setOrderCount(Number(e.target.value))}
              disabled={isRunning}
              className="bg-[#131722] border border-[#2a2e39] text-xs text-slate-300 rounded px-2.5 py-1.5 outline-none font-mono"
            >
              <option value={10000}>10,000 Orders</option>
              <option value={25000}>25,000 Orders</option>
              <option value={50000}>50,000 Orders</option>
              <option value={100000}>100,000 Orders</option>
            </select>

            <button
              onClick={handleRunBenchmark}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#2a3444] text-[#a4b8cc] border border-[#3d4b60] hover:bg-[#344054] hover:text-slate-100 transition-all shadow disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>AUDITING RAM...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>RUN LIVE AUDIT</span>
                </>
              )}
            </button>
            <button
              onClick={downloadCsv}
              disabled={!results || isRunning}
              title="Download the latest benchmark as CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#131722] text-[#8ca0b4] border border-[#2a2e39] hover:text-slate-100 hover:border-[#4a5b74] transition-all disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT CSV</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded bg-[#291818] border border-[#4a2424] text-[#c07070] text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {benchmarkSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg p-3.5 shadow">
            <span className="text-[10px] text-[#64748b] uppercase tracking-wider block">Throughput Advantage</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-[#7da98f]">
                {benchmarkSummary.zero_copy_speedup_vs_pickle}
              </span>
              <span className="text-xs text-[#64748b]">faster than Pickle IPC</span>
            </div>
            <p className="text-[10px] text-[#556376] mt-0.5">
              {benchmarkSummary.zero_copy_speedup_vs_json} faster than JSON microservice
            </p>
          </div>

          <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg p-3.5 shadow">
            <span className="text-[10px] text-[#64748b] uppercase tracking-wider block">Latency Reduction</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-[#8ca0b4]">
                {benchmarkSummary.latency_reduction_pct}%
              </span>
              <span className="text-xs text-[#64748b]">p50 time saved</span>
            </div>
            <p className="text-[10px] text-[#556376] mt-0.5">
              Direct pointer access without deserialization copy
            </p>
          </div>

          <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg p-3.5 shadow">
            <span className="text-[10px] text-[#64748b] uppercase tracking-wider block">GC Stop-The-World Spikes</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-[#bfa46f]">
                {zeroCopyRun?.gc_collections ?? '-'}
              </span>
              <span className="text-xs text-[#64748b]">Pauses in Hot Loop</span>
            </div>
            <p className="text-[10px] text-[#7da98f] mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Measured by the Python GC counter
            </p>
          </div>
        </div>
      )}

      {zeroCopyRun && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg p-4 shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Throughput comparison</h3>
                <p className="text-[10px] text-[#64748b] mt-1">Higher is better · orders processed per second</p>
              </div>
              <TrendingUp className="w-4 h-4 text-[#7da98f]" />
            </div>
            <div className="space-y-3">
              {runs.map(run => (
                <div key={run.mode}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[#8ca0b4]">{run.mode}</span>
                    <span className={run.zero_copy ? 'text-[#7da98f] font-bold' : 'text-slate-300'}>
                      {run.throughput_ops_sec.toLocaleString()} ops/s
                    </span>
                  </div>
                  <div className="h-2 rounded bg-[#131722] overflow-hidden">
                    <div
                      className={`h-full rounded ${run.zero_copy ? 'bg-[#5b9a78]' : 'bg-[#64748b]'}`}
                      style={{ width: `${Math.max(2, (run.throughput_ops_sec / maxThroughput) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg p-4 shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Latency distribution</h3>
                <p className="text-[10px] text-[#64748b] mt-1">Tail behavior matters · lower is better</p>
              </div>
              <BarChart3 className="w-4 h-4 text-[#8ca0b4]" />
            </div>
            <div className="space-y-3">
              {runs.map(run => (
                <div key={run.mode} className="grid grid-cols-[minmax(90px,1fr)_2fr] items-center gap-3">
                  <span className="text-[10px] text-[#8ca0b4] truncate">{run.mode}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded bg-[#131722] overflow-hidden">
                      <div
                        className={`h-full rounded ${run.zero_copy ? 'bg-[#8ca0b4]' : 'bg-[#bfa46f]'}`}
                        style={{ width: `${Math.max(2, (run.p99_us / maxLatency) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-300 w-20 text-right">
                      p50 {run.p50_us} / p99 {run.p99_us} µs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comparative Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {runs.map((r: any, idx: number) => {
          const isZeroCopy = r.zero_copy;
          return (
            <div
              key={idx}
              className={`rounded-lg p-4 border shadow flex flex-col justify-between ${
                isZeroCopy
                  ? 'bg-[#181d2a] border-[#384a3e]'
                  : 'bg-[#1c2030] border-[#2a2e39]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-[#2a2e39] mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isZeroCopy ? 'bg-[#5b9a78]' : 'bg-[#64748b]'}`} />
                    <h3 className="text-xs font-bold text-slate-100">{r.mode}</h3>
                  </div>
                  {isZeroCopy && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#15231c] text-[#7da98f] border border-[#294235] uppercase">
                      CHRONOSMATCH
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-[#64748b] text-[10px] block">Throughput (Orders/Sec):</span>
                    <span className={`text-lg font-bold font-mono ${isZeroCopy ? 'text-[#7da98f]' : 'text-slate-300'}`}>
                      {r.throughput_ops_sec?.toLocaleString()} <span className="text-xs text-[#64748b] font-normal">ops/s</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2a2e39]">
                    <div>
                      <span className="text-[#64748b] text-[10px] block">Ingest Phase:</span>
                      <span className="text-slate-300 font-semibold">{r.ingest_time_sec} s</span>
                    </div>
                    <div>
                      <span className="text-[#64748b] text-[10px] block">Match Phase:</span>
                      <span className="text-slate-300 font-semibold">{r.match_time_sec} s</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-[#2a2e39]">
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">p50 Latency:</span>
                      <span className={`font-semibold ${isZeroCopy ? 'text-[#7da98f]' : 'text-slate-300'}`}>
                        {r.p50_us} µs
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">p90 Latency:</span>
                      <span className="text-slate-300">{r.p90_us} µs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">p99 Tail Latency:</span>
                      <span className={`font-semibold ${isZeroCopy ? 'text-[#8ca0b4]' : 'text-[#bfa46f]'}`}>
                        {r.p99_us} µs
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mechanism badge */}
              <div className="mt-4 pt-2.5 border-t border-[#2a2e39] text-[10px]">
                <span className="text-[#64748b] block mb-0.5">Architecture:</span>
                <span className="text-slate-300">
                  {isZeroCopy
                    ? 'mmap ring buffer + packed 32B C-struct (zero serialization)'
                    : idx === 1
                    ? 'Python pickle.dumps/loads with heap allocation & GC spikes'
                    : 'Standard string JSON encoding with heavy CPU overhead'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {history.length > 0 && (
        <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg p-4 shadow">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Run history</h3>
              <p className="text-[10px] text-[#64748b] mt-1">Use repeated runs to discuss variance instead of quoting one best result.</p>
            </div>
            <Activity className="w-4 h-4 text-[#64748b]" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead className="text-[#64748b] uppercase border-b border-[#2a2e39]">
                <tr>
                  <th className="text-left py-2 font-normal">Completed</th>
                  <th className="text-right py-2 font-normal">Orders</th>
                  <th className="text-right py-2 font-normal">Zero-copy ops/s</th>
                  <th className="text-right py-2 font-normal">p50</th>
                  <th className="text-right py-2 font-normal">p99</th>
                </tr>
              </thead>
              <tbody>
                {history.map(run => {
                  const runZeroCopy = run.results.find(item => item.zero_copy);
                  return (
                    <tr key={run.completedAt} className="border-b border-[#242b3a] last:border-0">
                      <td className="py-2 text-[#8ca0b4]">{new Date(run.completedAt).toLocaleTimeString()}</td>
                      <td className="py-2 text-right text-slate-300">{runZeroCopy?.num_orders.toLocaleString() ?? '-'}</td>
                      <td className="py-2 text-right text-[#7da98f] font-semibold">{runZeroCopy?.throughput_ops_sec.toLocaleString() ?? '-'} </td>
                      <td className="py-2 text-right text-slate-300">{runZeroCopy ? `${runZeroCopy.p50_us} µs` : '-'}</td>
                      <td className="py-2 text-right text-slate-300">{runZeroCopy ? `${runZeroCopy.p99_us} µs` : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
