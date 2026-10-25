import React from 'react';
import {
  Activity,
  Zap,
  Play,
  Pause,
  AlertTriangle,
  ShieldCheck,
  Cpu,
  Sun,
  Moon,
  Terminal,
  Volume2,
  VolumeX,
  Keyboard,
  Menu,
  PanelLeft
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  isRunning: boolean;
  pid: number | null;
  targetRate: number;
  burstMode: boolean;
  ingestTps: number;
  matchTps: number;
  totalIngested: number;
  totalMatched: number;
  onToggleEngine: () => void;
  onSetRate: (rate: number) => void;
  onToggleBurst: () => void;
  onInjectWhale: () => void;
  onOpenLogin?: () => void;
  onReplaySplash?: () => void;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
  onOpenHotkeys?: () => void;
  onToggleMobileSidebar?: () => void;
  onToggleDesktopSidebar?: () => void;
  isDesktopSidebarCollapsed?: boolean;
  user?: any;
}

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  pid,
  targetRate,
  burstMode,
  ingestTps,
  matchTps,
  totalIngested,
  totalMatched,
  onToggleEngine,
  onSetRate,
  onToggleBurst,
  onInjectWhale,
  onOpenLogin,
  onReplaySplash,
  isAudioMuted,
  onToggleAudio,
  onOpenHotkeys,
  onToggleMobileSidebar,
  onToggleDesktopSidebar,
  isDesktopSidebarCollapsed,
  user
}) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <header
      className={`border-b sticky top-0 z-40 px-3 sm:px-4 py-2.5 transition-colors duration-200 backdrop-blur ${
        isDark
          ? 'border-[#2a2e39] bg-[#131722]/95 text-slate-200'
          : 'border-slate-200 bg-white/95 text-slate-800 shadow-xs'
      }`}
    >
      <div className="w-full px-1 sm:px-2 flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Title, Sidebar Toggle, and Status */}
        <div className="flex items-center justify-between w-full lg:w-auto gap-3">
          <div className="flex items-center gap-2">
            {/* Mobile Sidebar Hamburger Toggle */}
            {onToggleMobileSidebar && (
              <button
                onClick={onToggleMobileSidebar}
                className="md:hidden p-2 rounded-lg border border-[#2a2e39] bg-[#1c2030] text-[#8ca0b4] hover:text-slate-100 transition"
                title="Toggle Segments Sidebar Menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            {/* Desktop Sidebar Rail Toggle */}
            {onToggleDesktopSidebar && (
              <button
                onClick={onToggleDesktopSidebar}
                className="hidden md:flex p-2 rounded-lg border border-[#2a2e39] bg-[#1c2030] text-[#8ca0b4] hover:text-slate-100 hover:bg-[#232a3c] transition"
                title={isDesktopSidebarCollapsed ? "Expand Sidebar Panel" : "Collapse Sidebar Panel"}
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <div
              className={`p-2 rounded-lg border transition-colors ${
                isDark
                  ? 'bg-[#1c2030] border-[#2a2e39] text-[#8ca0b4]'
                  : 'bg-slate-100 border-slate-300 text-blue-600'
              }`}
            >
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-wider flex items-center gap-1">
                  CHRONOS<span className={isDark ? 'text-[#8ca0b4]' : 'text-blue-600'}>MATCH</span>
                </h1>
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-semibold tracking-widest uppercase rounded border ${
                    isDark
                      ? 'bg-[#1c2030] text-[#8ca0b4] border-[#2a2e39]'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  ZERO-COPY LOB
                </span>

                <div
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono border ${
                    isDark ? 'bg-[#1c2030] border-[#2a2e39]' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isRunning ? 'bg-[#5b9a78] animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span className={isRunning ? (isDark ? 'text-[#7da98f]' : 'text-emerald-700 font-bold') : 'text-slate-400'}>
                    {isRunning ? `ONLINE (PID ${pid ?? 'AUTO'})` : 'OFFLINE'}
                  </span>
                </div>

                <div
                  className={`hidden md:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono border ${
                    isDark
                      ? 'bg-[#1c2030] border-[#2a2e39] text-[#7da98f]'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5b9a78]"></span>
                  <span>FIRESTORE SYNC</span>
                </div>
              </div>

              <p className="text-[10px] sm:text-[11px] text-[#64748b] flex items-center gap-2 mt-0.5">
                <span>IPC: <code className="font-mono text-[#8ca0b4]">/dev/shm mmap (32B)</code></span>
                <span>•</span>
                <span>Symbol: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>NVDA</strong></span>
              </p>
            </div>
          </div>

          {/* Mobile Theme Toggle Button */}
          <div className="flex lg:hidden items-center gap-1">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition ${
                isDark
                  ? 'bg-[#1c2030] border-[#2a2e39] text-amber-400 hover:bg-[#252c40]'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} theme`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Real-time Throughput Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto text-xs">
          <div
            className={`border rounded px-2.5 py-1.5 transition-colors ${
              isDark ? 'bg-[#1c2030] border-[#2a2e39]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="text-[9px] text-[#64748b] uppercase tracking-wider block">Ingest Speed</span>
            <span className="text-xs sm:text-sm font-bold font-mono">
              {(ingestTps || 0).toLocaleString()} <span className="text-[9px] text-[#64748b] font-normal">ord/s</span>
            </span>
          </div>

          <div
            className={`border rounded px-2.5 py-1.5 transition-colors ${
              isDark ? 'bg-[#1c2030] border-[#2a2e39]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="text-[9px] text-[#64748b] uppercase tracking-wider block">Match Speed</span>
            <span className={`text-xs sm:text-sm font-bold font-mono ${isDark ? 'text-[#7da98f]' : 'text-emerald-700'}`}>
              {(matchTps || 0).toLocaleString()} <span className="text-[9px] text-[#64748b] font-normal">match/s</span>
            </span>
          </div>

          <div
            className={`border rounded px-2.5 py-1.5 transition-colors ${
              isDark ? 'bg-[#1c2030] border-[#2a2e39]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="text-[9px] text-[#64748b] uppercase tracking-wider block">Total Ingested</span>
            <span className="text-xs sm:text-sm font-bold font-mono">
              {(totalIngested || 0).toLocaleString()}
            </span>
          </div>

          <div
            className={`border rounded px-2.5 py-1.5 transition-colors ${
              isDark ? 'bg-[#1c2030] border-[#2a2e39]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="text-[9px] text-[#64748b] uppercase tracking-wider block">Total Matched</span>
            <span className="text-xs sm:text-sm font-bold font-mono">
              {(totalMatched || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Control Actions */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto justify-end">
          {/* Rate Selector */}
          <div
            className={`flex items-center gap-1 border rounded p-1 text-xs ${
              isDark ? 'bg-[#1c2030] border-[#2a2e39]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="text-[#64748b] px-1 text-[10px] hidden sm:inline">Rate:</span>
            {[5000, 20000, 50000, 100000].map(r => (
              <button
                key={r}
                onClick={() => onSetRate(r)}
                className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono transition-all ${
                  targetRate === r
                    ? isDark
                      ? 'bg-[#2a2e39] text-slate-100 font-bold border border-[#3b4254]'
                      : 'bg-white text-slate-900 font-bold border border-slate-300 shadow-xs'
                    : 'text-[#64748b] hover:text-slate-200 hover:bg-[#232734]'
                }`}
              >
                {r >= 1000 ? `${r / 1000}k` : r}
              </button>
            ))}
          </div>

          {/* Earnings Shockwave Button */}
          <button
            onClick={onToggleBurst}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded text-[11px] sm:text-xs font-semibold tracking-wide border transition-all ${
              burstMode
                ? 'bg-rose-900/60 text-rose-200 border-rose-700 animate-pulse'
                : isDark
                ? 'bg-[#1c2030] text-[#a87474] border-[#3a2828] hover:bg-[#251d1d]'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
            title="Surges market order inflow mimicking an Earnings Announcement volatility burst"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{burstMode ? 'SHOCK ACTIVE' : 'EARNINGS SHOCK'}</span>
            <span className="sm:hidden">SHOCK</span>
          </button>

          {/* Inject Whale Sweep Button */}
          <button
            onClick={onInjectWhale}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded text-[11px] sm:text-xs font-semibold tracking-wide border transition-all shadow-xs ${
              isDark
                ? 'bg-[#2a3444] text-[#a4b8cc] border-[#3d4b60] hover:bg-[#344054] hover:text-slate-100'
                : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
            title="Injects institutional order (15,000 shares) sweeping multiple price levels"
          >
            <Zap className="w-3.5 h-3.5 fill-current text-[#c29850]" />
            <span className="hidden sm:inline">INJECT WHALE</span>
            <span className="sm:hidden">WHALE</span>
          </button>

          {/* Start/Pause Engine */}
          <button
            onClick={onToggleEngine}
            className={`p-2 rounded text-xs font-bold border transition-all ${
              isRunning
                ? isDark
                  ? 'bg-[#1c2030] border-[#2a2e39] text-[#b95353] hover:bg-[#251f22]'
                  : 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                : isDark
                ? 'bg-[#1c2030] border-[#2a2e39] text-[#5b9a78] hover:bg-[#1a2620]'
                : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
            }`}
            title={isRunning ? "Stop Engine" : "Start Engine"}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>

          {/* Institutional Trader Login Button */}
          {onOpenLogin && (
            <button
              onClick={onOpenLogin}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold border transition ${
                user
                  ? isDark
                    ? 'bg-[#1a2820] border-[#3d5e4d] text-[#7da98f]'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : isDark
                  ? 'bg-[#1c2030] border-[#2a2e39] text-slate-200 hover:border-[#4b5563]'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
              title="Manage Institutional Trader account"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#7da98f]" />
              <span className="hidden sm:inline">
                {user ? (user.displayName || 'TRADER').slice(0, 16) : 'TRADER LOGIN'}
              </span>
              <span className="sm:hidden">
                {user ? 'TRADER' : 'LOGIN'}
              </span>
            </button>
          )}

          {/* Replay Dynamic Opening Loading Screen */}
          {onReplaySplash && (
            <button
              onClick={onReplaySplash}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold border transition ${
                isDark
                  ? 'bg-[#1c2030] border-[#2a2e39] text-[#8ca0b4] hover:bg-[#252d42] hover:text-slate-100'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
              }`}
              title="Re-play dynamic boot & telemetry loading animation"
            >
              <Terminal className="w-3.5 h-3.5 text-[#8ca0b4]" />
              <span className="hidden md:inline text-[11px]">BOOT SCREEN</span>
            </button>
          )}

          {/* HFT Soundscape Sonification Toggle */}
          {onToggleAudio && (
            <button
              onClick={onToggleAudio}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold border transition ${
                isDark
                  ? isAudioMuted
                    ? 'bg-[#1c2030] border-[#2a2e39] text-[#64748b] hover:text-slate-200'
                    : 'bg-[#1b2b22] border-[#3e5f4d] text-[#7da98f] hover:bg-[#23382c]'
                  : isAudioMuted
                  ? 'bg-slate-100 border-slate-300 text-slate-400 hover:text-slate-700'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
              }`}
              title={isAudioMuted ? "Unmute HFT Audio Sonification [M]" : "Mute HFT Audio Sonification [M]"}
            >
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#7da98f]" />}
              <span className="hidden xl:inline text-[11px] font-mono">
                {isAudioMuted ? 'AUDIO OFF' : 'AUDIO ON'}
              </span>
            </button>
          )}

          {/* Hotkey HUD Command Center */}
          {onOpenHotkeys && (
            <button
              onClick={onOpenHotkeys}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold border transition ${
                isDark
                  ? 'bg-[#1c2030] border-[#2a2e39] text-[#8ca0b4] hover:bg-[#252d42] hover:text-slate-100'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
              title="Open Pro Trader Keyboard Hotkeys [?]"
            >
              <Keyboard className="w-3.5 h-3.5 text-[#8ca0b4]" />
              <span className="hidden xl:inline text-[11px] font-mono">HOTKEYS [?]</span>
            </button>
          )}

          {/* Desktop Theme Switcher */}
          <button
            onClick={toggleTheme}
            className={`hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border transition ${
              isDark
                ? 'bg-[#1c2030] border-[#2a2e39] text-amber-400 hover:bg-[#252c40]'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} theme`}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-slate-300">LIGHT</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span className="text-[11px] text-slate-700">DARK</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
