/**
 * ChronosMatch: Zero-Copy High-Frequency Trading Engine
 * Web Terminal & Quantitative Telemetry Control Plane
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { OrderBookLadder } from './components/OrderBookLadder';
import { LatencyGauge } from './components/LatencyGauge';
import { TradeTape } from './components/TradeTape';
import { WhaleBanner } from './components/WhaleBanner';
import { BenchmarkView } from './components/BenchmarkView';
import { AuditLedgerView } from './components/AuditLedgerView';
import { OrderInjectorModal } from './components/OrderInjectorModal';
import { FirebaseSyncPanel } from './components/FirebaseSyncPanel';
import { ThreeDTradingFloor } from './components/ThreeDTradingFloor';
import { GeminiChatbot } from './components/GeminiChatbot';
import { GeminiFloatingChat } from './components/GeminiFloatingChat';
import { ChronosOpeningSplash } from './components/ChronosOpeningSplash';
import { TraderLoginModal } from './components/TraderLoginModal';
import { OrderFlowHeatmap } from './components/OrderFlowHeatmap';
import { AlgoExecutionStudio } from './components/AlgoExecutionStudio';
import { SmartOrderRouter } from './components/SmartOrderRouter';
import { MarketTimeMachine } from './components/MarketTimeMachine';
import { HotkeyModal } from './components/HotkeyModal';
import { QuantRAGStudio } from './components/QuantRAGStudio';
import { PaperTradingDashboard } from './components/PaperTradingDashboard';
import { ReliabilityCenter } from './components/ReliabilityCenter';
import { audioEngine } from './utils/audioEngine';
import { MobileTabBar, SidebarNavigation, NavTabId } from './components/SidebarNavigation';
import { testConnection, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useTheme } from './context/ThemeContext';
import { apiFetch, apiUrl, publicApiFetch } from './api';
import {
  Layers,
  Activity,
  Database,
  Send,
  Cloud,
  Box,
  MessageSquare,
  Sparkles,
  Flame,
  Cpu,
  Globe,
  RotateCcw,
  Keyboard,
  Volume2,
  VolumeX,
  Zap,
  Menu,
  PanelLeft,
  Brain
} from 'lucide-react';

export default function App() {
  const { isDark } = useTheme();
  // Dynamic opening animation screen always displays on initial application load
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  const [activeTab, setActiveTab] = useState<NavTabId>('trading');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
  const [isHotkeyModalOpen, setIsHotkeyModalOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(() => audioEngine.getIsMuted());
  const [hotkeyToast, setHotkeyToast] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [pid, setPid] = useState<number | null>(null);
  const [targetRate, setTargetRate] = useState<number>(20000);
  const [burstMode, setBurstMode] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);

  const handleToggleAudio = useCallback(() => {
    const muted = audioEngine.toggleMute();
    setIsAudioMuted(muted);
    setHotkeyToast(muted ? '🔇 HFT Audio Muted' : '🔊 HFT Audio Active');
  }, []);

  // Monitor Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleAuthRequired = () => setIsLoginModalOpen(true);
    window.addEventListener('chronos-auth-required', handleAuthRequired);
    return () => window.removeEventListener('chronos-auth-required', handleAuthRequired);
  }, []);

  // Validate connection to Firestore on initial boot
  useEffect(() => {
    testConnection();
  }, []);

  // Connect to SSE stream from full-stack server
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      eventSource = new EventSource(apiUrl('/api/engine/stream'));

      eventSource.addEventListener('telemetry', (e) => {
        try {
          const data = JSON.parse(e.data);
          setTelemetry(data);
          setTargetRate(data.target_rate || 20000);
          setBurstMode(!!data.burst_mode);
        } catch (err) {
          console.error('Telemetry parse error', err);
        }
      });

      eventSource.addEventListener('engine_status', (e) => {
        try {
          const data = JSON.parse(e.data);
          setIsRunning(data.running);
          if (!data.running) {
            setPid(null);
            setTelemetry(null);
          }
        } catch (err) {}
      });

      eventSource.onerror = () => {
        eventSource?.close();
        setTimeout(connectSSE, 2000);
      };
    };

    connectSSE();

    // Check status
    fetch(apiUrl('/api/engine/status'))
      .then(res => res.json())
      .then(data => {
        setIsRunning(data.running);
        setPid(data.pid);
        if (data.running && data.latestTelemetry) {
          setTelemetry(data.latestTelemetry);
        } else if (!data.running) {
          setTelemetry(null);
        }
      })
      .catch(() => {});

    return () => {
      eventSource?.close();
    };
  }, []);

  const handleToggleEngine = async () => {
    if (isRunning) {
      await publicApiFetch('/api/engine/stop', { method: 'POST' });
      setIsRunning(false);
    } else {
      const res = await publicApiFetch('/api/engine/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: targetRate })
      });
      const data = await res.json();
      setIsRunning(true);
      setPid(data.pid);
    }
  };

  const handleSetRate = async (rate: number) => {
    setTargetRate(rate);
    await apiFetch('/api/engine/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_rate', rate })
    });
  };

  const handleToggleBurst = async () => {
    setBurstMode(!burstMode);
    await apiFetch('/api/engine/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_burst' })
    });
  };

  const handleInjectWhale = async () => {
    await apiFetch('/api/engine/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'inject',
        price: 182.80,
        quantity: 15000,
        side: 'BUY',
        order_type: 'MARKET',
        is_whale: true
      })
    });
  };

  const handleManualOrderInject = async (order: any) => {
    await apiFetch('/api/engine/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'inject',
        price: order.price,
        quantity: order.quantity,
        side: order.side,
        order_type: order.order_type,
        is_whale: order.is_whale
      })
    });
  };

  // Global Pro Hotkey Command Engine (Single-Key Execution)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea or select
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      if (key === 'B') {
        e.preventDefault();
        const bestAsk = asks[0]?.price || 182.25;
        handleManualOrderInject({
          price: bestAsk,
          quantity: 100,
          side: 'BUY',
          order_type: 'LIMIT',
          is_whale: false
        });
        audioEngine.playFillSound('bid', 18.2);
        setHotkeyToast(`⚡ HOTKEY BUY: 100 NVDA @ $${bestAsk.toFixed(2)} FILLED`);
      } else if (key === 'S') {
        e.preventDefault();
        const bestBid = bids[0]?.price || 182.20;
        handleManualOrderInject({
          price: bestBid,
          quantity: 100,
          side: 'SELL',
          order_type: 'LIMIT',
          is_whale: false
        });
        audioEngine.playFillSound('ask', 19.5);
        setHotkeyToast(`⚡ HOTKEY SELL: 100 NVDA @ $${bestBid.toFixed(2)} FILLED`);
      } else if (key === 'W') {
        e.preventDefault();
        handleInjectWhale();
        audioEngine.playWhaleSound();
        setHotkeyToast('🐳 INSTITUTIONAL WHALE SWEEP INJECTED');
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleToggleEngine();
        setHotkeyToast(isRunning ? '⏸️ Engine Paused' : '▶️ Engine Resumed');
      } else if (key === 'M') {
        e.preventDefault();
        handleToggleAudio();
      } else if (key === '1') {
        setActiveTab('trading');
        setHotkeyToast('📊 View: Trading Floor & LOB');
      } else if (key === '2') {
        setActiveTab('orderflow');
        setHotkeyToast('🔥 View: DOM Footprint & Heatmap');
      } else if (key === '3') {
        setActiveTab('algo');
        setHotkeyToast('⚡ View: Quant Algo Lab');
      } else if (key === '4') {
        setActiveTab('sor');
        setHotkeyToast('🌐 View: Smart Order Router (SOR)');
      } else if (key === '5') {
        setActiveTab('timemachine');
        setHotkeyToast('⏪ View: Market Time Machine');
      } else if (key === '6') {
        setActiveTab('3d');
        setHotkeyToast('🎲 View: 3D Spatial Floor');
      } else if (key === 'R') {
        setActiveTab('rag');
        setHotkeyToast('🧠 View: Quant RAG Studio');
      } else if (key === 'P') {
        setActiveTab('paper');
        setHotkeyToast('🛡️ View: Paper Trading Desk');
      } else if (e.key === '?') {
        e.preventDefault();
        setIsHotkeyModalOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [telemetry, isRunning, handleToggleAudio]);

  // Auto-dismiss hotkey feedback toast
  useEffect(() => {
    if (!hotkeyToast) return;
    const t = setTimeout(() => setHotkeyToast(null), 2000);
    return () => clearTimeout(t);
  }, [hotkeyToast]);

  // Safe fallbacks while connecting
  const bids = isRunning ? telemetry?.bids || [
    { price: 182.48, price_cents: 18248, volume: 4200, orders: 12 },
    { price: 182.47, price_cents: 18247, volume: 8500, orders: 19 },
    { price: 182.46, price_cents: 18246, volume: 14200, orders: 31 },
    { price: 182.45, price_cents: 18245, volume: 22000, orders: 45 },
    { price: 182.44, price_cents: 18244, volume: 38000, orders: 62 },
  ] : [];

  const asks = isRunning ? telemetry?.asks || [
    { price: 182.50, price_cents: 18250, volume: 3800, orders: 9 },
    { price: 182.51, price_cents: 18251, volume: 7600, orders: 16 },
    { price: 182.52, price_cents: 18252, volume: 15100, orders: 28 },
    { price: 182.53, price_cents: 18253, volume: 24500, orders: 48 },
    { price: 182.54, price_cents: 18254, volume: 34000, orders: 58 },
  ] : [];

  const spread = telemetry?.spread ?? 0.02;
  const recentTrades = telemetry?.recent_trades || [];
  const whaleAlerts = telemetry?.whale_alerts || [];
  const midPrice = bids[0] && asks[0] ? (bids[0].price + asks[0].price) / 2 : 182.49;

  return (
    <div
      className={`min-h-screen flex flex-col font-mono selection:bg-[#2a3444] selection:text-slate-100 transition-colors duration-200 ${
        isDark ? 'bg-[#131722] text-[#d1d5db]' : 'bg-[#f4f6f9] text-[#1e293b]'
      }`}
    >
      {/* Dynamic Opening Animation while loading application */}
      {showSplash && (
        <ChronosOpeningSplash
          onComplete={handleSplashComplete}
          isDark={isDark}
        />
      )}

      {/* Top Telemetry Header */}
      <Header
        isRunning={isRunning}
        pid={pid}
        targetRate={targetRate}
        burstMode={burstMode}
        ingestTps={telemetry?.ingest_tps || 24800}
        matchTps={telemetry?.match_tps || 24780}
        totalIngested={telemetry?.total_ingested || 128450}
        totalMatched={telemetry?.total_matched || 128410}
        onToggleEngine={handleToggleEngine}
        onSetRate={handleSetRate}
        onToggleBurst={handleToggleBurst}
        onInjectWhale={handleInjectWhale}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onReplaySplash={() => setShowSplash(true)}
        isAudioMuted={isAudioMuted}
        onToggleAudio={handleToggleAudio}
        onOpenHotkeys={() => setIsHotkeyModalOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        onToggleDesktopSidebar={() => setIsSidebarCollapsed(prev => !prev)}
        isDesktopSidebarCollapsed={isSidebarCollapsed}
        user={user}
      />

      <MobileTabBar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Floating Hotkey HUD Toast */}
      {hotkeyToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#1c2436] border border-[#5b9a78] text-slate-100 font-mono text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <Zap className="w-4 h-4 text-[#7da98f]" />
          <span>{hotkeyToast}</span>
        </div>
      )}

      {/* Main Workstation Workspace: Left Sidebar + Right Content Board */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Segment Sidebar Panel */}
        <SidebarNavigation
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenInjector={() => setIsModalOpen(true)}
          onOpenHotkeys={() => setIsHotkeyModalOpen(true)}
          isAudioMuted={isAudioMuted}
          onToggleAudio={handleToggleAudio}
          tps={telemetry?.ingest_tps || 24800}
        />

        {/* Right Dashboard Content Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {/* Active Segment Breadcrumb & Quick Status Header */}
          <div
            className={`border-b px-3 sm:px-5 py-2 flex items-center justify-between text-xs sticky top-0 z-10 backdrop-blur shrink-0 ${
              isDark
                ? 'border-[#242b3a] bg-[#10141f]/95 text-slate-200'
                : 'border-slate-200 bg-slate-50/95 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 font-bold tracking-wider uppercase truncate">
              <span className="text-[#64748b] hidden sm:inline">SEGMENT</span>
              <span className="text-[#8ca0b4] hidden sm:inline">›</span>
              <span className={`truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {activeTab === 'trading' && 'TRADING FLOOR & LIMIT ORDER BOOK'}
                {activeTab === 'orderflow' && 'DOM FOOTPRINT & LIQUIDITY HEATMAP'}
                {activeTab === 'algo' && 'QUANT ALGO EXECUTION LAB (TWAP / VWAP / SNIPER)'}
                {activeTab === 'sor' && 'MULTI-VENUE SMART ORDER ROUTER (NBBO)'}
                {activeTab === 'timemachine' && 'MARKET TIME MACHINE (HISTORICAL REPLAY)'}
                {activeTab === 'rag' && 'QUANTITATIVE RAG KNOWLEDGE BASE & SEMANTIC GROUNDING'}
                {activeTab === '3d' && '3D SPATIAL TRADING FLOOR'}
                {activeTab === 'chat' && 'QUANT AI COPILOT & SEARCH GROUNDING'}
                {activeTab === 'benchmark' && 'ZERO-COPY BENCHMARK & RING BUFFER'}
                {activeTab === 'ledger' && 'AUDIT LEDGER & WRITE-AHEAD LOG (WAL)'}
                {activeTab === 'firebase' && 'FIREBASE CLOUD VAULT & RECENT TRADES'}
                {activeTab === 'paper' && 'PAPER TRADING CONTROL PLANE (SAFE MODE)'}
                {activeTab === 'reliability' && 'RELIABILITY CENTER & ENGINE RECOVERY'}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#64748b]">
                <span>TICK: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>182.20</strong></span>
                <span>•</span>
                <span>SPREAD: <strong className="text-emerald-400 font-mono">${spread.toFixed(2)}</strong></span>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition border text-[11px] ${
                  isDark
                    ? 'bg-[#182030] hover:bg-[#222e44] text-slate-200 border-[#2d3950]'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
                }`}
              >
                <Send className="w-3 h-3 text-[#7da98f]" />
                <span className="hidden sm:inline">INJECT ORDER</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="mx-auto w-full max-w-[1600px] flex-1 p-2 sm:p-4">
        {/* Flash Whale Sweep Alert Banner */}
        <WhaleBanner alerts={whaleAlerts} />

        {activeTab === 'trading' && (
          <div className="space-y-3 sm:space-y-4">
            {/* Top Grid: Order Book Depth + Latency Gauge */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 h-auto lg:h-[480px]">
              {/* L2 Order Book Ladder (7 cols) */}
              <div className="lg:col-span-7 h-[420px] lg:h-full">
                <OrderBookLadder
                  bids={bids}
                  asks={asks}
                  spread={spread}
                  symbol={telemetry?.symbol || 'NVDA'}
                />
              </div>

              {/* Execution Latency Telemetry (5 cols) */}
              <div className="lg:col-span-5 h-[340px] lg:h-full">
                <LatencyGauge
                  p50={telemetry?.p50_us || 1.8}
                  p90={telemetry?.p90_us || 4.2}
                  p99={telemetry?.p99_us || 18.6}
                  p99_9={telemetry?.p99_9_us || 32.4}
                  avgLatency={telemetry?.avg_latency_us || 3.5}
                  minLatency={telemetry?.min_latency_us || 0.8}
                  maxLatency={telemetry?.max_latency_us || 42.1}
                  bufferStats={telemetry?.buffer}
                />
              </div>
            </div>

            {/* Bottom Grid: Real-Time Trade Execution Tape */}
            <div className="h-[280px]">
              <TradeTape trades={recentTrades} />
            </div>
          </div>
        )}

        {activeTab === '3d' && (
          <ThreeDTradingFloor
            bids={bids}
            asks={asks}
            ingestTps={telemetry?.ingest_tps || 24800}
            matchTps={telemetry?.match_tps || 24780}
            burstMode={burstMode}
          />
        )}

        {activeTab === 'orderflow' && (
          <OrderFlowHeatmap
            bids={bids}
            asks={asks}
            symbol={telemetry?.symbol || 'NVDA'}
            midPrice={midPrice}
          />
        )}

        {activeTab === 'algo' && (
          <AlgoExecutionStudio
            currentMid={midPrice}
            symbol={telemetry?.symbol || 'NVDA'}
            onOrderExecuted={handleManualOrderInject}
          />
        )}

        {activeTab === 'sor' && (
          <SmartOrderRouter
            currentMid={midPrice}
            symbol={telemetry?.symbol || 'NVDA'}
          />
        )}

        {activeTab === 'timemachine' && (
          <MarketTimeMachine />
        )}

        {activeTab === 'rag' && (
          <QuantRAGStudio />
        )}

        {activeTab === 'chat' && (
          <GeminiChatbot
            currentSymbol={telemetry?.symbol || 'NVDA'}
            currentSpread={spread}
            currentTps={telemetry?.ingest_tps || 24800}
          />
        )}

        {activeTab === 'benchmark' && <BenchmarkView />}

        {activeTab === 'ledger' && <AuditLedgerView />}

        {activeTab === 'firebase' && <FirebaseSyncPanel recentTrades={recentTrades} />}

        {activeTab === 'paper' && <PaperTradingDashboard />}

        {activeTab === 'reliability' && <ReliabilityCenter />}
          </main>
        </div>
      </div>

      {/* Dynamic Floating Gemini Chatbot at bottom right */}
      <GeminiFloatingChat
        currentSymbol={telemetry?.symbol || 'NVDA'}
        currentSpread={spread}
        currentTps={telemetry?.ingest_tps || 24800}
        isOpen={isFloatingChatOpen}
        onOpenChange={setIsFloatingChatOpen}
      />

      {/* Manual Order Injector Modal */}
      <OrderInjectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onInject={handleManualOrderInject}
        currentMid={midPrice}
      />

      {/* Institutional Trader Login Modal */}
      <TraderLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        isDark={isDark}
        currentUser={user}
      />

      {/* Pro Trader Hotkey Command Center Modal */}
      <HotkeyModal
        isOpen={isHotkeyModalOpen}
        onClose={() => setIsHotkeyModalOpen(false)}
      />
    </div>
  );
}
