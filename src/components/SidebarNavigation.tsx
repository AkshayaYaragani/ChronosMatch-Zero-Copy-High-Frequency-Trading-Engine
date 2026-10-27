import React from 'react';
import {
  Layers,
  Flame,
  Cpu,
  Globe,
  RotateCcw,
  Box,
  MessageSquare,
  Activity,
  Database,
  Cloud,
  ChevronLeft,
  ChevronRight,
  Send,
  Keyboard,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  Radio,
  Brain
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type NavTabId =
  | 'trading'
  | 'orderflow'
  | 'algo'
  | 'sor'
  | 'timemachine'
  | 'rag'
  | '3d'
  | 'chat'
  | 'benchmark'
  | 'ledger'
  | 'firebase';

interface NavItem {
  id: NavTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  hotkey: string;
  badge?: string;
  category: 'EXECUTION' | 'SIMULATION' | 'INFRASTRUCTURE';
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  // Category 1: Execution & Order Flow
  {
    id: 'trading',
    label: 'Trading Floor & LOB',
    shortLabel: 'LOB Floor',
    icon: Layers,
    hotkey: '1',
    badge: 'LIVE L2',
    category: 'EXECUTION',
    color: 'text-blue-400'
  },
  {
    id: 'orderflow',
    label: 'DOM Footprint & Heatmap',
    shortLabel: 'Footprint',
    icon: Flame,
    hotkey: '2',
    badge: 'ICEBERGS',
    category: 'EXECUTION',
    color: 'text-orange-400'
  },
  {
    id: 'algo',
    label: 'Quant Algo Lab',
    shortLabel: 'Algo Lab',
    icon: Cpu,
    hotkey: '3',
    badge: 'TWAP/VWAP',
    category: 'EXECUTION',
    color: 'text-emerald-400'
  },
  {
    id: 'sor',
    label: 'Smart Router (SOR)',
    shortLabel: 'Smart Router',
    icon: Globe,
    hotkey: '4',
    badge: 'NBBO 4X',
    category: 'EXECUTION',
    color: 'text-cyan-400'
  },

  // Category 2: Simulation & Spatial
  {
    id: 'timemachine',
    label: 'Market Time Machine',
    shortLabel: 'Time Machine',
    icon: RotateCcw,
    hotkey: '5',
    badge: 'CRASH REPLAY',
    category: 'SIMULATION',
    color: 'text-indigo-400'
  },
  {
    id: '3d',
    label: '3D Spatial Engine',
    shortLabel: '3D Engine',
    icon: Box,
    hotkey: '6',
    badge: 'THREE.JS',
    category: 'SIMULATION',
    color: 'text-teal-400'
  },
  {
    id: 'chat',
    label: 'Quant AI Copilot',
    shortLabel: 'Quant AI',
    icon: MessageSquare,
    hotkey: 'AI',
    badge: 'SEARCH',
    category: 'SIMULATION',
    color: 'text-violet-400'
  },
  {
    id: 'rag',
    label: 'Quant RAG Studio',
    shortLabel: 'RAG Studio',
    icon: Brain,
    hotkey: 'R',
    badge: 'SEMANTIC',
    category: 'SIMULATION',
    color: 'text-violet-400'
  },

  // Category 3: System Infrastructure
  {
    id: 'benchmark',
    label: 'Zero-Copy Benchmark',
    shortLabel: 'Benchmark',
    icon: Activity,
    hotkey: 'IPC',
    badge: '<50µs',
    category: 'INFRASTRUCTURE',
    color: 'text-amber-400'
  },
  {
    id: 'ledger',
    label: 'Audit Ledger (WAL)',
    shortLabel: 'WAL Ledger',
    icon: Database,
    hotkey: 'WAL',
    badge: 'SHA-256',
    category: 'INFRASTRUCTURE',
    color: 'text-sky-400'
  },
  {
    id: 'firebase',
    label: 'Firebase Cloud Vault',
    shortLabel: 'Cloud Vault',
    icon: Cloud,
    hotkey: 'SYNC',
    badge: 'AUTH',
    category: 'INFRASTRUCTURE',
    color: 'text-emerald-400'
  }
];

interface SidebarNavigationProps {
  activeTab: NavTabId;
  onSelectTab: (id: NavTabId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenInjector: () => void;
  onOpenHotkeys: () => void;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  tps?: number;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenInjector,
  onOpenHotkeys,
  isAudioMuted,
  onToggleAudio,
  tps = 24800
}) => {
  const { isDark } = useTheme();

  // Categories list
  const categories: ('EXECUTION' | 'SIMULATION' | 'INFRASTRUCTURE')[] = [
    'EXECUTION',
    'SIMULATION',
    'INFRASTRUCTURE'
  ];

  const categoryTitles = {
    EXECUTION: 'ORDER FLOW & EXECUTION',
    SIMULATION: 'QUANT LAB & SPATIAL',
    INFRASTRUCTURE: 'ENGINE & CLOUD VAULT'
  };

  const sidebarContent = (
    <div className="flex flex-col h-full select-none font-mono text-xs">
      {/* Top Header of Sidebar */}
      <div
        className={`p-3 border-b flex items-center justify-between ${
          isDark ? 'border-[#242b3a] bg-[#10141f]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-[#1c2436] border border-[#2e3b52] text-[#8ca0b4] shrink-0">
            <Radio className="w-4 h-4 text-[#7da98f] animate-pulse" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <span className="font-bold text-xs tracking-wider uppercase text-slate-100 block truncate">
                NAVIGATION DESK
              </span>
              <span className="text-[10px] text-[#64748b] block truncate">
                {tps.toLocaleString()} TPS MATCHING
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded text-[#64748b] hover:text-slate-100 hover:bg-[#1a2130] transition shrink-0"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded text-[#64748b] hover:text-slate-100 hover:bg-[#1a2130] transition shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Navigation Segment Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 no-scrollbar">
        {categories.map((cat) => {
          const items = NAV_ITEMS.filter((i) => i.category === cat);
          return (
            <div key={cat} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2 pt-1 pb-1 text-[9px] font-bold text-[#64748b] tracking-wider uppercase">
                  {categoryTitles[cat]}
                </div>
              )}

              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    title={isCollapsed ? `${item.label} [${item.hotkey}]` : undefined}
                    className={`w-full flex items-center justify-between rounded-lg transition-all duration-150 group ${
                      isCollapsed ? 'p-2.5 justify-center' : 'px-2.5 py-2'
                    } ${
                      isActive
                        ? isDark
                          ? 'bg-[#1b2537] border border-[#485b7e] text-slate-100 shadow-md font-bold'
                          : 'bg-white border border-slate-300 text-slate-900 shadow-sm font-bold'
                        : isDark
                        ? 'text-[#8ca0b4] hover:bg-[#161c28] hover:text-slate-200 border border-transparent'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className={`p-1.5 rounded-md transition-colors shrink-0 ${
                          isActive
                            ? 'bg-[#25334c] text-[#7da98f]'
                            : 'bg-[#131722]/60 text-[#64748b] group-hover:text-slate-200'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? item.color : ''}`} />
                      </div>

                      {!isCollapsed && (
                        <div className="text-left truncate">
                          <span className="block text-xs truncate leading-snug">
                            {item.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {item.badge && (
                          <span
                            className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              isActive
                                ? 'bg-[#293854] text-slate-200 border border-[#3f5379]'
                                : 'bg-[#131722] text-[#64748b]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        <kbd className="text-[9px] px-1 py-0.2 rounded bg-[#131722] text-[#64748b] border border-[#252c3c] font-mono">
                          {item.hotkey}
                        </kbd>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom Sidebar Action Dock */}
      <div
        className={`p-2.5 border-t space-y-1.5 ${
          isDark ? 'border-[#242b3a] bg-[#10141f]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        {/* Custom Order Injector Trigger */}
        <button
          onClick={onOpenInjector}
          title={isCollapsed ? 'Custom Order Injector' : undefined}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border font-bold transition shadow-xs ${
            isCollapsed ? 'px-2' : 'px-3'
          } ${
            isDark
              ? 'bg-[#182030] hover:bg-[#202c44] border-[#384868] text-slate-100'
              : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
          }`}
        >
          <Send className="w-3.5 h-3.5 text-[#7da98f] shrink-0" />
          {!isCollapsed && <span className="text-[11px] truncate uppercase tracking-wider">ORDER INJECTOR</span>}
        </button>

        {/* Hotkey and Audio Dual Buttons */}
        <div className={`grid gap-1.5 ${isCollapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <button
            onClick={onOpenHotkeys}
            title="Hotkey HUD Cheat Sheet [?]"
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded border text-[11px] font-semibold transition ${
              isDark
                ? 'bg-[#131722] hover:bg-[#1c2436] border-[#252c3c] text-[#8ca0b4]'
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 text-[#8ca0b4] shrink-0" />
            {!isCollapsed && <span>HOTKEYS</span>}
          </button>

          <button
            onClick={onToggleAudio}
            title={isAudioMuted ? 'Unmute HFT Audio [M]' : 'Mute HFT Audio [M]'}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded border text-[11px] font-semibold transition ${
              isDark
                ? isAudioMuted
                  ? 'bg-[#131722] border-[#252c3c] text-[#64748b]'
                  : 'bg-[#1a2b22] border-[#395644] text-[#7da98f]'
                : isAudioMuted
                ? 'bg-slate-100 border-slate-300 text-slate-400'
                : 'bg-emerald-50 border-emerald-300 text-emerald-700'
            }`}
          >
            {isAudioMuted ? (
              <VolumeX className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#7da98f] shrink-0" />
            )}
            {!isCollapsed && <span>{isAudioMuted ? 'MUTED' : 'AUDIO'}</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (Expandable / Collapsible) */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r transition-all duration-200 z-20 ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${
          isDark
            ? 'bg-[#121622] border-[#242b3a] text-slate-200'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Panel */}
          <div
            className={`relative w-72 max-w-[85vw] h-full shadow-2xl z-10 border-r ${
              isDark
                ? 'bg-[#121622] border-[#242b3a] text-slate-200'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
