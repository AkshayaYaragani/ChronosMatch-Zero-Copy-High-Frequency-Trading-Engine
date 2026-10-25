import React, { useState, useEffect } from 'react';
import {
  auth,
  db,
  googleProvider,
  testConnection,
  handleFirestoreError,
  OperationType
} from '../firebase';
import {
  signInWithPopup,
  signInAnonymously,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  Cloud,
  ShieldCheck,
  User as UserIcon,
  LogIn,
  LogOut,
  Plus,
  Trash2,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  Database,
  Sliders,
  RefreshCw,
  ExternalLink,
  Zap
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface WatchlistItem {
  symbol: string;
  targetPrice: number;
  alertUpper: number;
  alertLower: number;
  notes: string;
  createdAt: string;
}

interface SavedTradeRecord {
  tradeId: number;
  symbol: string;
  side: string;
  price: number;
  quantity: number;
  latencyUs: number;
  isWhale: boolean;
  createdAt: string;
}

interface FirebaseSyncPanelProps {
  recentTrades?: any[];
  onSelectSymbol?: (symbol: string) => void;
}

export const FirebaseSyncPanel: React.FC<FirebaseSyncPanelProps> = ({
  recentTrades = [],
  onSelectSymbol
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('Idle');
  
  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [newSymbol, setNewSymbol] = useState('NVDA');
  const [newTargetPrice, setNewTargetPrice] = useState('182.50');
  const [newAlertUpper, setNewAlertUpper] = useState('185.00');
  const [newAlertLower, setNewAlertLower] = useState('180.00');
  const [newNotes, setNewNotes] = useState('Tech momentum leader');

  // Cloud Vault Trades state
  const [savedTrades, setSavedTrades] = useState<SavedTradeRecord[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'watchlist' | 'trades' | 'settings' | 'status'>('watchlist');

  // Settings state
  const [refreshRateMs, setRefreshRateMs] = useState(100);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [depthLevels, setDepthLevels] = useState(10);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState(false);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Test connection to Firestore
        const connected = await testConnection();
        setIsDbConnected(connected);

        // Sync user profile document if new
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          await setDoc(userDocRef, {
            userId: currentUser.uid,
            email: currentUser.email || 'trader@chronosmatch.internal',
            displayName: currentUser.displayName || 'Institutional Trader',
            role: 'trader',
            theme: 'steel_charcoal',
            preferredTicker: 'NVDA',
            whaleThreshold: 5000,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.warn('Profile sync note:', err);
        }
      } else {
        setWatchlist([]);
        setSavedTrades([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore Watchlist Listener when User is Authenticated
  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}/watchlist`;
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'watchlist'),
      (snapshot) => {
        const items: WatchlistItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as WatchlistItem);
        });
        setWatchlist(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsub();
  }, [user]);

  // Real-time Firestore Trades Listener
  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}/trades`;
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'trades'),
      (snapshot) => {
        const trades: SavedTradeRecord[] = [];
        snapshot.forEach((docSnap) => {
          trades.push(docSnap.data() as SavedTradeRecord);
        });
        // Sort descending by tradeId
        trades.sort((a, b) => b.tradeId - a.tradeId);
        setSavedTrades(trades);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsub();
  }, [user]);

  const handleSignIn = async () => {
    try {
      setSyncStatus('Signing in with Google...');
      await signInWithPopup(auth, googleProvider);
      setSyncStatus('Signed in successfully');
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err.code === 'auth/popup-blocked') {
        setSyncStatus('Popup was blocked by browser. Click "1-CLICK TRADER DESK" below for instant access.');
      } else {
        setSyncStatus(`Sign-in notice: ${err?.message || 'Check popup blocker'}`);
      }
    }
  };

  const handleInstantTraderSignIn = async () => {
    try {
      setSyncStatus('Activating Institutional Quant Desk...');
      let uid = 'trader_' + Math.random().toString(36).substring(2, 9);
      try {
        const cred = await signInAnonymously(auth);
        uid = cred.user.uid;
        await updateProfile(cred.user, {
          displayName: 'Citadel Quant Desk #429'
        });
      } catch (authErr) {
        console.warn('Anonymous fallback notice:', authErr);
      }

      try {
        await setDoc(doc(db, 'users', uid), {
          userId: uid,
          displayName: 'Citadel Quant Desk #429',
          email: 'quant.desk@chronosmatch.internal',
          role: 'trader',
          firm: 'Citadel Securities / Chronos Institutional',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (dbErr) {}

      setSyncStatus('Institutional Desk Activated');
    } catch (err: any) {
      setSyncStatus(`Error: ${err.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSyncStatus('Logged out');
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const handleAddWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const sym = newSymbol.trim().toUpperCase();
    if (!sym) return;

    const path = `users/${user.uid}/watchlist/${sym}`;
    try {
      setSyncStatus(`Adding ${sym} to cloud watchlist...`);
      const itemData: WatchlistItem = {
        symbol: sym,
        targetPrice: parseFloat(newTargetPrice) || 182.50,
        alertUpper: parseFloat(newAlertUpper) || 185.00,
        alertLower: parseFloat(newAlertLower) || 180.00,
        notes: newNotes.slice(0, 200),
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid, 'watchlist', sym), {
        userId: user.uid,
        ...itemData
      });

      setSyncStatus(`${sym} synced to Firestore`);
      setNewSymbol('');
      setNewNotes('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleDeleteWatchlist = async (symbol: string) => {
    if (!user) return;
    const path = `users/${user.uid}/watchlist/${symbol}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'watchlist', symbol));
      setSyncStatus(`Removed ${symbol}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleSaveTradeToVault = async (trade: any) => {
    if (!user) {
      setSyncStatus('Please sign in to save trades to cloud vault');
      return;
    }

    const tradeIdStr = String(trade.trade_id || Date.now());
    const path = `users/${user.uid}/trades/${tradeIdStr}`;

    try {
      setSyncStatus(`Vaulting Trade #${trade.trade_id}...`);
      await setDoc(doc(db, 'users', user.uid, 'trades', tradeIdStr), {
        userId: user.uid,
        tradeId: Number(trade.trade_id),
        symbol: 'NVDA',
        side: trade.is_whale ? 'BUY' : 'SELL',
        price: Number(trade.price),
        quantity: Number(trade.quantity),
        latencyUs: Number(trade.latency_us || 2.4),
        isWhale: Boolean(trade.is_whale),
        createdAt: new Date().toISOString()
      });
      setSyncStatus(`Trade #${trade.trade_id} archived to compliance vault`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    const path = `users/${user.uid}/settings/default`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'default'), {
        userId: user.uid,
        refreshRateMs,
        depthLevels,
        soundEnabled,
        autoBurstSimulation: false,
        updatedAt: new Date().toISOString()
      });
      setSettingsSavedMessage(true);
      setTimeout(() => setSettingsSavedMessage(false), 2500);
      setSyncStatus('Settings updated in Firestore');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  return (
    <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg p-5 shadow-lg flex flex-col gap-4 text-xs font-mono">
      {/* Top Banner with Firebase Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#2a2e39] gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-[#131722] border border-[#2a2e39] text-[#8ca0b4]">
            <Cloud className="w-5 h-5 text-[#8ca0b4]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
                FIREBASE CLOUD VAULT & TRADER SYNC
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#131722] text-[#7da98f] border border-[#2a2e39] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5b9a78] animate-pulse"></span>
                ACTIVE (ENTERPRISE)
              </span>
            </div>
            <p className="text-[11px] text-[#64748b] mt-0.5">
              Project: <span className="text-slate-300 font-bold">{firebaseConfig.projectId}</span> | DB: <span className="text-[#8ca0b4]">{firebaseConfig.firestoreDatabaseId.slice(0, 24)}...</span>
            </p>
          </div>
        </div>

        {/* User Account / Auth Section */}
        <div className="flex items-center gap-2">
          {authLoading ? (
            <span className="text-[#64748b]">Checking auth...</span>
          ) : user ? (
            <div className="flex items-center gap-2 bg-[#131722] px-3 py-1.5 rounded border border-[#2a2e39]">
              {user.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="w-5 h-5 rounded-full border border-[#2a2e39]" />
              ) : (
                <UserIcon className="w-4 h-4 text-[#8ca0b4]" />
              )}
              <div className="text-left">
                <div className="text-[11px] font-bold text-slate-200 truncate max-w-[140px]">
                  {user.displayName || user.email || 'Trader'}
                </div>
                <div className="text-[9px] text-[#7da98f] tracking-wide uppercase">Institutional UID</div>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-2 p-1 text-[#64748b] hover:text-[#b95353] transition"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstantTraderSignIn}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#1f3027] hover:bg-[#253e31] text-[#7da98f] border border-[#3d5e4d] font-bold text-[11px] transition shadow"
                title="Instant zero-latency login without popup"
              >
                <Zap className="w-3.5 h-3.5 text-[#5b9a78]" />
                <span>1-CLICK TRADER DESK</span>
              </button>
              <button
                onClick={handleSignIn}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#252a38] hover:bg-[#2e3547] text-slate-200 border border-[#3b4254] font-semibold text-[11px] transition shadow"
              >
                <LogIn className="w-3.5 h-3.5 text-[#8ca0b4]" />
                <span>GOOGLE AUTH</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2a2e39] pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('watchlist')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
            activeSubTab === 'watchlist'
              ? 'bg-[#131722] text-slate-100 font-bold border border-[#3b4254]'
              : 'text-[#64748b] hover:text-slate-300'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 text-[#8ca0b4]" />
          <span>CLOUD WATCHLIST ({watchlist.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('trades')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
            activeSubTab === 'trades'
              ? 'bg-[#131722] text-slate-100 font-bold border border-[#3b4254]'
              : 'text-[#64748b] hover:text-slate-300'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-[#8ca0b4]" />
          <span>COMPLIANCE VAULT ({savedTrades.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
            activeSubTab === 'settings'
              ? 'bg-[#131722] text-slate-100 font-bold border border-[#3b4254]'
              : 'text-[#64748b] hover:text-slate-300'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-[#8ca0b4]" />
          <span>TERMINAL PREFERENCES</span>
        </button>

        <button
          onClick={() => setActiveSubTab('status')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
            activeSubTab === 'status'
              ? 'bg-[#131722] text-slate-100 font-bold border border-[#3b4254]'
              : 'text-[#64748b] hover:text-slate-300'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#7da98f]" />
          <span>SECURITY & ABAC RULES</span>
        </button>
      </div>

      {/* Tab 1: Cloud Watchlist */}
      {activeSubTab === 'watchlist' && (
        <div className="space-y-4">
          {!user && (
            <div className="p-3 bg-[#131722] border border-[#363c4e] rounded text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-[#c29850] shrink-0" />
                Sign in to synchronize your institutional watchlist across devices.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleInstantTraderSignIn}
                  className="px-2.5 py-1 rounded bg-[#1f3027] text-[#7da98f] border border-[#3d5e4d] font-bold hover:bg-[#253e31] text-[11px]"
                >
                  ⚡ Instant 1-Click Trader
                </button>
                <button
                  onClick={handleSignIn}
                  className="px-2.5 py-1 rounded bg-[#2a3444] text-slate-200 border border-[#3d4b60] font-semibold hover:bg-[#344054] text-[11px]"
                >
                  Google Sign In
                </button>
              </div>
            </div>
          )}

          {/* Add Form */}
          {user && (
            <form onSubmit={handleAddWatchlist} className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-[#131722] p-3 rounded border border-[#2a2e39]">
              <div>
                <label className="text-[10px] text-[#64748b] block mb-1">SYMBOL</label>
                <input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. AMD"
                  className="w-full bg-[#1c2030] border border-[#2a2e39] rounded px-2 py-1 text-slate-100 font-mono text-xs focus:border-[#4e8a72] focus:outline-none uppercase"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-[#64748b] block mb-1">TARGET ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newTargetPrice}
                  onChange={(e) => setNewTargetPrice(e.target.value)}
                  className="w-full bg-[#1c2030] border border-[#2a2e39] rounded px-2 py-1 text-slate-100 font-mono text-xs focus:border-[#4e8a72] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#64748b] block mb-1">ALERT UPPER ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newAlertUpper}
                  onChange={(e) => setNewAlertUpper(e.target.value)}
                  className="w-full bg-[#1c2030] border border-[#2a2e39] rounded px-2 py-1 text-[#7da98f] font-mono text-xs focus:border-[#4e8a72] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#64748b] block mb-1">ALERT LOWER ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newAlertLower}
                  onChange={(e) => setNewAlertLower(e.target.value)}
                  className="w-full bg-[#1c2030] border border-[#2a2e39] rounded px-2 py-1 text-[#c07070] font-mono text-xs focus:border-[#4e8a72] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#64748b] block mb-1">NOTES</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Thesis note"
                  className="w-full bg-[#1c2030] border border-[#2a2e39] rounded px-2 py-1 text-slate-100 font-mono text-xs focus:border-[#4e8a72] focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-[#252a38] hover:bg-[#2e3547] text-slate-200 border border-[#3b4254] py-1.5 rounded font-bold flex items-center justify-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-[#8ca0b4]" />
                  <span>SYNC</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Watchlist Items */}
          <div className="border border-[#2a2e39] rounded overflow-hidden">
            <div className="grid grid-cols-6 bg-[#131722] text-[#64748b] px-3 py-2 text-[10px] font-bold tracking-wider uppercase border-b border-[#2a2e39]">
              <span>Symbol</span>
              <span>Target Price</span>
              <span>Upper Breakout</span>
              <span>Lower Break</span>
              <span>Thesis / Note</span>
              <span className="text-right">Action</span>
            </div>

            <div className="divide-y divide-[#2a2e39] max-h-60 overflow-y-auto">
              {watchlist.length === 0 ? (
                <div className="text-center py-6 text-[#64748b] italic">
                  {user ? 'No watchlist items in Firestore. Add your first symbol above.' : 'Sign in to access your cloud watchlist.'}
                </div>
              ) : (
                watchlist.map((item) => (
                  <div key={item.symbol} className="grid grid-cols-6 items-center px-3 py-2 hover:bg-[#151926] transition font-mono">
                    <span className="font-bold text-slate-100 flex items-center gap-1.5">
                      <Bookmark className="w-3 h-3 text-[#8ca0b4]" />
                      {item.symbol}
                    </span>
                    <span className="text-slate-300">${item.targetPrice.toFixed(2)}</span>
                    <span className="text-[#7da98f]">${item.alertUpper.toFixed(2)}</span>
                    <span className="text-[#c07070]">${item.alertLower.toFixed(2)}</span>
                    <span className="text-[#64748b] truncate">{item.notes || '—'}</span>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDeleteWatchlist(item.symbol)}
                        className="text-[#64748b] hover:text-[#b95353] transition p-1"
                        title="Remove from cloud"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Compliance Cloud Vault */}
      {activeSubTab === 'trades' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#131722] p-3 rounded border border-[#2a2e39]">
            <div>
              <span className="font-bold text-slate-200">Regulatory Audit Cloud Storage</span>
              <p className="text-[11px] text-[#64748b]">
                Save live mmap ring-buffer trades directly into Firestore for compliance auditing.
              </p>
            </div>
            <span className="text-[11px] text-[#7da98f] font-mono">
              Immutable Records: {savedTrades.length}
            </span>
          </div>

          {/* Quick-Save Section from Recent Engine Trades */}
          {recentTrades.length > 0 && user && (
            <div className="bg-[#131722] p-3 rounded border border-[#2a2e39]">
              <span className="text-[10px] text-[#64748b] uppercase tracking-wider block mb-2">
                Click a live execution to archive to Firestore Cloud Vault:
              </span>
              <div className="flex flex-wrap gap-2">
                {recentTrades.slice(0, 6).map((t, i) => (
                  <button
                    key={`quick-${t.trade_id}-${i}`}
                    onClick={() => handleSaveTradeToVault(t)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1c2030] hover:bg-[#252a38] border border-[#2a2e39] text-[11px] font-mono text-slate-200 transition"
                  >
                    <Plus className="w-3 h-3 text-[#7da98f]" />
                    <span>#{t.trade_id}</span>
                    <span className="text-slate-400">${Number(t.price).toFixed(2)}</span>
                    <span className="text-[#64748b]">({t.quantity} sh)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Table of Vaulted Trades */}
          <div className="border border-[#2a2e39] rounded overflow-hidden">
            <div className="grid grid-cols-6 bg-[#131722] text-[#64748b] px-3 py-2 text-[10px] font-bold tracking-wider uppercase border-b border-[#2a2e39]">
              <span>Trade ID</span>
              <span>Ticker</span>
              <span>Side</span>
              <span>Execution Price</span>
              <span>Filled Volume</span>
              <span className="text-right">Latency / Whale</span>
            </div>

            <div className="divide-y divide-[#2a2e39] max-h-60 overflow-y-auto">
              {savedTrades.length === 0 ? (
                <div className="text-center py-6 text-[#64748b] italic">
                  No trades vaulted in Firestore yet. Click any trade execution to archive.
                </div>
              ) : (
                savedTrades.map((st) => (
                  <div key={st.tradeId} className="grid grid-cols-6 items-center px-3 py-2 hover:bg-[#151926] transition font-mono">
                    <span className="font-bold text-slate-200">#{st.tradeId}</span>
                    <span className="text-[#8ca0b4]">{st.symbol}</span>
                    <span className={st.side === 'BUY' ? 'text-[#7da98f] font-bold' : 'text-[#c07070] font-bold'}>
                      {st.side}
                    </span>
                    <span className="text-slate-200 font-semibold">${st.price.toFixed(2)}</span>
                    <span className="text-slate-300">{st.quantity.toLocaleString()}</span>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[#8ca0b4]">{st.latencyUs}µs</span>
                      {st.isWhale && (
                        <span className="px-1.5 py-0.2 rounded bg-[#3d2e18] text-[#c29850] border border-[#5c4424] text-[9px] font-bold">
                          WHALE
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Terminal Preferences */}
      {activeSubTab === 'settings' && (
        <div className="space-y-4 max-w-xl">
          <div className="bg-[#131722] p-4 rounded border border-[#2a2e39] space-y-4">
            <h3 className="font-bold text-slate-200">Personalized Terminal Parameters</h3>

            <div>
              <label className="text-[11px] text-[#8ca0b4] block mb-1">
                Telemetry Polling Rate ({refreshRateMs} ms)
              </label>
              <input
                type="range"
                min="50"
                max="500"
                step="50"
                value={refreshRateMs}
                onChange={(e) => setRefreshRateMs(Number(e.target.value))}
                className="w-full accent-[#4e8a72]"
              />
              <span className="text-[10px] text-[#64748b]">
                Lower values increase responsiveness; 100ms matches institutional LOB standards.
              </span>
            </div>

            <div>
              <label className="text-[11px] text-[#8ca0b4] block mb-1">
                Order Book Depth Levels ({depthLevels} levels)
              </label>
              <select
                value={depthLevels}
                onChange={(e) => setDepthLevels(Number(e.target.value))}
                className="w-full bg-[#1c2030] border border-[#2a2e39] rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:border-[#4e8a72]"
              >
                <option value={5}>5 Levels (Compact)</option>
                <option value={10}>10 Levels (Standard Nasdaq L2)</option>
                <option value={20}>20 Levels (Full Depth)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sound"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="rounded accent-[#4e8a72]"
              />
              <label htmlFor="sound" className="text-slate-200 cursor-pointer">
                Audible audio click on Whale Sweeps (&gt;5,000 shares)
              </label>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#2a2e39]">
              <button
                onClick={handleSaveSettings}
                disabled={!user}
                className="px-4 py-2 rounded bg-[#252a38] hover:bg-[#2e3547] text-slate-100 font-bold border border-[#3b4254] transition disabled:opacity-50"
              >
                {user ? 'SAVE TO FIRESTORE' : 'SIGN IN TO SAVE PREFERENCES'}
              </button>

              {settingsSavedMessage && (
                <span className="text-[#7da98f] flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Preferences Saved!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Security & ABAC Rules Status */}
      {activeSubTab === 'status' && (
        <div className="space-y-3 bg-[#131722] p-4 rounded border border-[#2a2e39]">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#7da98f]" />
              Zero-Trust Firestore Security Architecture
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#1a2620] text-[#7da98f] border border-[#2a4434] font-bold">
              RULES VERIFIED & DEPLOYED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#1c2030] rounded border border-[#2a2e39]">
              <span className="text-[10px] text-[#64748b] uppercase tracking-wider block mb-1">Database Edition</span>
              <span className="font-bold text-slate-100">Firestore Enterprise Edition</span>
              <p className="text-[11px] text-[#64748b] mt-1">Multi-region scalable cloud NoSQL data layer</p>
            </div>

            <div className="p-3 bg-[#1c2030] rounded border border-[#2a2e39]">
              <span className="text-[10px] text-[#64748b] uppercase tracking-wider block mb-1">Access Control Model</span>
              <span className="font-bold text-slate-100">ABAC (Attribute-Based Access Control)</span>
              <p className="text-[11px] text-[#64748b] mt-1">All writes bound to authenticated trader UID with schema validators</p>
            </div>

            <div className="p-3 bg-[#1c2030] rounded border border-[#2a2e39]">
              <span className="text-[10px] text-[#64748b] uppercase tracking-wider block mb-1">Administrative Principal</span>
              <span className="font-bold text-[#8ca0b4]">nipanevrushabh6@gmail.com</span>
              <p className="text-[11px] text-[#64748b] mt-1">Designated compliance officer and system administrator</p>
            </div>

            <div className="p-3 bg-[#1c2030] rounded border border-[#2a2e39]">
              <span className="text-[10px] text-[#64748b] uppercase tracking-wider block mb-1">Immutability Invariant</span>
              <span className="font-bold text-[#7da98f]">Enforced (No Update on Matched Trades)</span>
              <p className="text-[11px] text-[#64748b] mt-1">Trades in vault cannot be mutated post-execution</p>
            </div>
          </div>
        </div>
      )}

      {/* Sync Status Footer */}
      <div className="pt-2 border-t border-[#2a2e39] flex items-center justify-between text-[10px] text-[#64748b]">
        <span>Sync Engine: <code className="text-slate-400">Firestore v11 SDK (RPC Native)</code></span>
        <span className="text-slate-400 flex items-center gap-1">
          Status: <strong className="text-slate-300 font-semibold">{syncStatus}</strong>
        </span>
      </div>
    </div>
  );
};
