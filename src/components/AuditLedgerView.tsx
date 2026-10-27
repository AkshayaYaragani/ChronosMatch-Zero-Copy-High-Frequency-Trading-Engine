import React, { useState, useEffect } from 'react';
import { Database, Search, Download, RefreshCw, Zap, ShieldCheck } from 'lucide-react';

interface AuditTrade {
  trade_id: number;
  maker_order_id: number;
  taker_order_id: number;
  timestamp_ns: number;
  latency_us: number;
  price: number;
  quantity: number;
  is_whale: boolean;
  created_at: string;
}

export const AuditLedgerView: React.FC = () => {
  const [trades, setTrades] = useState<AuditTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [whaleOnly, setWhaleOnly] = useState(false);

  const fetchAuditTrades = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit/trades');
      if (res.ok) {
        const data = await res.json();
        setTrades(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditTrades();
    const interval = setInterval(fetchAuditTrades, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredTrades = trades.filter(t => {
    if (whaleOnly && !t.is_whale) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        String(t.trade_id).includes(q) ||
        String(t.maker_order_id).includes(q) ||
        String(t.taker_order_id).includes(q) ||
        String(t.price).includes(q)
      );
    }
    return true;
  });

  const exportCSV = () => {
    if (!trades.length) return;
    const headers = ['trade_id', 'maker_id', 'taker_id', 'timestamp_ns', 'latency_us', 'price', 'quantity', 'is_whale', 'created_at'];
    const rows = trades.map(t => [
      t.trade_id, t.maker_order_id, t.taker_order_id, t.timestamp_ns, t.latency_us, t.price, t.quantity, t.is_whale ? 1 : 0, t.created_at
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `chronos_audit_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Overview Card */}
      <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg p-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#131722] text-[#8ca0b4] border border-[#2a2e39] text-[9px] font-bold tracking-widest uppercase">
                WEEK 4 RESILIENCY MILESTONE
              </span>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 uppercase">
                <Database className="w-4 h-4 text-[#8ca0b4]" />
                Permanent SQLite / ClickHouse Regulatory Audit Ledger
              </h2>
            </div>
            <p className="text-xs text-[#64748b] mt-1 max-w-3xl leading-relaxed">
              Matched trades are asynchronously drained from the trade output ring buffer and committed into SQLite using Write-Ahead Logging (WAL) and <code className="text-[#8ca0b4]">PRAGMA synchronous = NORMAL</code>.
              This guarantees zero latency penalty on the critical matching path while ensuring an immutable audit trail.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#131722] text-slate-200 border border-[#2a2e39] hover:bg-[#232734] transition"
            >
              <Download className="w-3.5 h-3.5 text-[#8ca0b4]" />
              <span>EXPORT CSV</span>
            </button>
            <button
              onClick={fetchAuditTrades}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#131722] text-slate-200 border border-[#2a2e39] hover:bg-[#232734] transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#8ca0b4] ${loading ? 'animate-spin' : ''}`} />
              <span>REFRESH</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-[#2a2e39] text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Trade ID, Order ID, Price..."
                className="w-full bg-[#131722] border border-[#2a2e39] rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-[#556376] outline-none focus:border-[#4d5b70]"
              />
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer bg-[#131722] border border-[#2a2e39] px-3 py-1.5 rounded">
              <input
                type="checkbox"
                checked={whaleOnly}
                onChange={(e) => setWhaleOnly(e.target.checked)}
                className="accent-[#c29850] rounded"
              />
              <span className="text-[#d6b77c] text-xs flex items-center gap-1">
                <Zap className="w-3 h-3 fill-current text-[#c29850]" /> Whale Trades Only
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#64748b]">
            <span>Journal Mode: <strong className="text-[#7da98f]">WAL</strong></span>
            <span>Database: <strong className="text-slate-300">/tmp/chronos_trades_audit.db</strong></span>
            <span>Persisted: <strong className="text-slate-200">{trades.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#151926] text-[#64748b] border-b border-[#2a2e39] text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-2 px-3">Trade ID</th>
                <th className="py-2 px-3">Maker Order</th>
                <th className="py-2 px-3">Taker Order</th>
                <th className="py-2 px-3">Execution Price</th>
                <th className="py-2 px-3">Volume</th>
                <th className="py-2 px-3">Match Latency</th>
                <th className="py-2 px-3">Classification</th>
                <th className="py-2 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242834]">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#64748b] italic">
                    {loading ? 'Reading audit transactions...' : 'No trade records matching filter.'}
                  </td>
                </tr>
              ) : (
                filteredTrades.slice(0, 50).map((t) => (
                  <tr
                    key={t.trade_id}
                    className={`hover:bg-[#1f2538] transition-colors ${
                      t.is_whale ? 'bg-[#261f18]' : ''
                    }`}
                  >
                    <td className="py-1.5 px-3 font-semibold text-slate-300">#{t.trade_id}</td>
                    <td className="py-1.5 px-3 text-[#64748b]">ORD-{t.maker_order_id}</td>
                    <td className="py-1.5 px-3 text-[#64748b]">ORD-{t.taker_order_id}</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-200">${t.price.toFixed(2)}</td>
                    <td className={`py-1.5 px-3 ${t.is_whale ? 'font-semibold text-[#d6b77c]' : 'text-slate-300'}`}>
                      {t.quantity.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-3 text-[#7da98f] font-semibold">
                      {t.latency_us.toFixed(1)} µs
                    </td>
                    <td className="py-1.5 px-3">
                      {t.is_whale ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-[#292218] text-[#d6b77c] border border-[#4a3a24] text-[9px] font-semibold">
                          <Zap className="w-2.5 h-2.5 fill-current text-[#c29850]" /> WHALE SWEEP
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#556376]">STANDARD</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-[#556376] text-[11px]">{t.created_at}</td>
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
