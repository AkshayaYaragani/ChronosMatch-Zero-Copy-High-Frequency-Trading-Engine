import React, { useState, useEffect } from 'react';
import {
  Globe,
  Radio,
  Zap,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  Server,
  Layers,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { audioEngine } from '../utils/audioEngine';

interface Venue {
  id: string;
  name: string;
  location: string;
  latencyUs: number;
  bidPrice: number;
  bidSize: number;
  askPrice: number;
  askSize: number;
  rebatePer100: string;
  hasSpeedBump?: boolean;
}

interface SmartOrderRouterProps {
  currentMid?: number;
  symbol?: string;
}

export const SmartOrderRouter: React.FC<SmartOrderRouterProps> = ({
  currentMid = 182.10,
  symbol = 'NVDA'
}) => {
  const { isDark } = useTheme();
  const [routedVenue, setRoutedVenue] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [lastArbOpportunity, setLastArbOpportunity] = useState<string | null>(
    'ARBITRAGE WINDOW: Buy BATS @ $182.02 -> Sell IEX @ $182.04 (+2¢ latency alpha before 350µs bump clears)'
  );
  const [routingHistory, setRoutingHistory] = useState<{
    id: string;
    venue: string;
    shares: number;
    price: number;
    latency: number;
    timestamp: string;
  }[]>([]);

  // Simulated live venues
  const [venues, setVenues] = useState<Venue[]>([
    {
      id: 'BATS',
      name: 'BATS EDGX',
      location: 'Secaucus, NJ (NY4)',
      latencyUs: 27.4,
      bidPrice: Number((currentMid - 0.01).toFixed(2)),
      bidSize: 31200,
      askPrice: Number((currentMid + 0.01).toFixed(2)),
      askSize: 28400,
      rebatePer100: '+$0.0020'
    },
    {
      id: 'NASDAQ',
      name: 'NASDAQ INET',
      location: 'Carteret, NJ',
      latencyUs: 32.1,
      bidPrice: Number((currentMid - 0.01).toFixed(2)),
      bidSize: 45000,
      askPrice: Number((currentMid + 0.02).toFixed(2)),
      askSize: 41000,
      rebatePer100: '+$0.0029'
    },
    {
      id: 'NYSE',
      name: 'NYSE Arca',
      location: 'Mahwah, NJ',
      latencyUs: 46.8,
      bidPrice: Number((currentMid - 0.02).toFixed(2)),
      bidSize: 22100,
      askPrice: Number((currentMid + 0.01).toFixed(2)),
      askSize: 19800,
      rebatePer100: '+$0.0025'
    },
    {
      id: 'IEX',
      name: 'IEX Exchange',
      location: 'Secaucus (38-Mile Coiled Fiber)',
      latencyUs: 350.0,
      bidPrice: Number((currentMid - 0.03).toFixed(2)),
      bidSize: 8500,
      askPrice: Number((currentMid + 0.03).toFixed(2)),
      askSize: 9400,
      rebatePer100: '-$0.0009',
      hasSpeedBump: true
    }
  ]);

  // Dynamic price jitter across venues to simulate arbitrage opportunities
  useEffect(() => {
    const timer = setInterval(() => {
      setVenues(prev =>
        prev.map(v => {
          const jitter = (Math.random() * 0.02 - 0.01);
          return {
            ...v,
            bidPrice: Number((v.bidPrice + jitter * 0.5).toFixed(2)),
            askPrice: Number((v.askPrice + jitter * 0.5).toFixed(2)),
            latencyUs: Number((v.latencyUs + (Math.random() * 2 - 1)).toFixed(1))
          };
        })
      );
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Compute National Best Bid and Offer (NBBO)
  const bestBid = Math.max(...venues.map(v => v.bidPrice));
  const bestAsk = Math.min(...venues.map(v => v.askPrice));
  const consolidatedSpread = Math.max(0.01, Number((bestAsk - bestBid).toFixed(2)));

  const handleRouteOrder = (side: 'BUY' | 'SELL') => {
    setIsRouting(true);
    audioEngine.playChirp(700, 0.06, 'triangle', 0.25);

    // Pick venue with best price, breaking ties by latency
    const sorted = [...venues].sort((a, b) => {
      if (side === 'BUY') {
        if (a.askPrice !== b.askPrice) return a.askPrice - b.askPrice;
        return a.latencyUs - b.latencyUs;
      } else {
        if (a.bidPrice !== b.bidPrice) return b.bidPrice - a.bidPrice;
        return a.latencyUs - b.latencyUs;
      }
    });

    const chosen = sorted[0];
    const execPrice = side === 'BUY' ? chosen.askPrice : chosen.bidPrice;

    setTimeout(() => {
      setRoutedVenue(chosen.id);
      setIsRouting(false);
      audioEngine.playFillSound(side === 'BUY' ? 'bid' : 'ask', chosen.latencyUs);

      setRoutingHistory(prev => [
        {
          id: `SOR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          venue: chosen.name,
          shares: 500,
          price: execPrice,
          latency: chosen.latencyUs,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev.slice(0, 9)
      ]);
    }, 250);
  };

  return (
    <div
      className={`border rounded-xl p-4 transition-colors font-mono shadow-md ${
        isDark ? 'bg-[#131722] border-[#2a2e39] text-slate-200' : 'bg-white border-slate-300 text-slate-800'
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#2a2e39]/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-wider uppercase">
                MULTI-VENUE SMART ORDER ROUTER (SOR)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1b2333] text-[#8ca0b4] border border-[#2d3a4e]">
                CONSOLIDATED NBBO
              </span>
            </div>
            <p className="text-[11px] text-[#64748b]">
              Sub-50µs fiber routing across Carteret, Mahwah, and Secaucus with IEX speed-bump arbitration for <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{symbol}</strong>
            </p>
          </div>
        </div>

        {/* Quick Route Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRouteOrder('BUY')}
            disabled={isRouting}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs active:scale-98"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>ROUTE BEST BUY (500 SH)</span>
          </button>
          <button
            onClick={() => handleRouteOrder('SELL')}
            disabled={isRouting}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs active:scale-98"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>ROUTE BEST SELL (500 SH)</span>
          </button>
        </div>
      </div>

      {/* NBBO Consolidated Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        <div className="p-3 rounded-lg bg-[#181d29] border border-[#2a2e39] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#64748b] uppercase block">
              NATIONAL BEST BID (NBB)
            </span>
            <span className="text-base font-black text-emerald-400">
              ${bestBid.toFixed(2)}
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            BATS / INET
          </span>
        </div>

        <div className="p-3 rounded-lg bg-[#181d29] border border-[#2a2e39] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#64748b] uppercase block">
              CONSOLIDATED SPREAD
            </span>
            <span className="text-base font-black text-slate-100">
              ${consolidatedSpread.toFixed(2)} ({Math.round((consolidatedSpread / currentMid) * 10000)} bps)
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1c2230] text-[#7da98f] border border-[#2e3b4e]">
            TIGHTEST
          </span>
        </div>

        <div className="p-3 rounded-lg bg-[#181d29] border border-[#2a2e39] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#64748b] uppercase block">
              NATIONAL BEST OFFER (NBO)
            </span>
            <span className="text-base font-black text-rose-400">
              ${bestAsk.toFixed(2)}
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
            BATS / ARCA
          </span>
        </div>
      </div>

      {/* Latency Arbitrage Alert Banner */}
      {lastArbOpportunity && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">{lastArbOpportunity}</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-200 border border-amber-600 font-bold shrink-0">
            RISK-FREE ALPHA
          </span>
        </div>
      )}

      {/* Multi-Venue Depth & Latency Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {venues.map((venue) => {
          const isSelected = routedVenue === venue.id;
          return (
            <div
              key={venue.id}
              className={`p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-[#1b2b22] border-[#5b9a78] shadow-[0_0_15px_rgba(91,154,120,0.3)]'
                  : 'bg-[#181d29] border-[#2a2e39] hover:border-[#3d4b64]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-100">{venue.name}</h4>
                  <span className="text-[10px] text-[#64748b] block">{venue.location}</span>
                </div>
                <div className="text-right">
                  <span className={`text-[11px] font-bold font-mono ${
                    venue.hasSpeedBump ? 'text-amber-400' : 'text-[#7da98f]'
                  }`}>
                    {venue.latencyUs}µs
                  </span>
                  {venue.hasSpeedBump && (
                    <span className="text-[9px] block text-amber-400/80">SPEED BUMP</span>
                  )}
                </div>
              </div>

              {/* Bid / Ask Depth */}
              <div className="grid grid-cols-2 gap-2 my-2 text-xs">
                <div className="p-1.5 rounded bg-[#131722] border border-[#2a2e39]">
                  <span className="text-[9px] text-[#64748b] block">BID</span>
                  <span className="font-bold text-emerald-400">${venue.bidPrice.toFixed(2)}</span>
                  <span className="text-[9px] text-[#8ca0b4] block">({venue.bidSize.toLocaleString()} sh)</span>
                </div>
                <div className="p-1.5 rounded bg-[#131722] border border-[#2a2e39]">
                  <span className="text-[9px] text-[#64748b] block">ASK</span>
                  <span className="font-bold text-rose-400">${venue.askPrice.toFixed(2)}</span>
                  <span className="text-[9px] text-[#8ca0b4] block">({venue.askSize.toLocaleString()} sh)</span>
                </div>
              </div>

              {/* Rebate */}
              <div className="flex items-center justify-between text-[10px] text-[#64748b] pt-1 border-t border-[#2a2e39]">
                <span>Maker Fee / Rebate</span>
                <span className="font-semibold text-slate-300">{venue.rebatePer100}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SOR Route Logs */}
      {routingHistory.length > 0 && (
        <div className="pt-2 border-t border-[#2a2e39]/60">
          <span className="text-[10px] font-bold text-[#8ca0b4] uppercase tracking-wider block mb-1.5">
            RECENT SMART-ROUTED EXECUTIONS
          </span>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {routingHistory.map((item) => (
              <div
                key={item.id}
                className="px-2.5 py-1 rounded bg-[#181d29] border border-[#2a2e39] flex items-center gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-slate-200">{item.venue}</span>
                <span className="text-emerald-400 font-semibold">${item.price.toFixed(2)}</span>
                <span className="text-[#64748b]">({item.shares} sh)</span>
                <span className="text-[#7da98f] font-mono">{item.latency}µs</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
