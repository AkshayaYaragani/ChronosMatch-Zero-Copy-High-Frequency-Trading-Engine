import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Zap,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Building,
  UserCheck,
  User as UserIcon,
  ArrowRight
} from 'lucide-react';
import { auth, googleProvider, db } from '../firebase';
import { signInWithPopup, signInAnonymously, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface TraderLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
  currentUser?: any;
}

export const TraderLoginModal: React.FC<TraderLoginModalProps> = ({
  isOpen,
  onClose,
  isDark = true,
  currentUser
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInstantTraderLogin = async (deskName: string, role: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Attempt anonymous auth or custom institutional profile
      let uid = 'trader_' + Math.random().toString(36).substring(2, 9);
      try {
        const userCred = await signInAnonymously(auth);
        uid = userCred.user.uid;
        await updateProfile(userCred.user, {
          displayName: deskName
        });
      } catch (authErr) {
        console.warn('Firebase anonymous auth fallback note:', authErr);
      }

      // Sync to Firestore users collection
      try {
        await setDoc(doc(db, 'users', uid), {
          userId: uid,
          displayName: deskName,
          email: `${deskName.toLowerCase().replace(/\s+/g, '.') || 'trader'}@chronosmatch.internal`,
          role,
          firm: 'Citadel Securities / Chronos Institutional',
          whaleThreshold: 5000,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (dbErr) {
        console.warn('Firestore profile sync note:', dbErr);
      }

      setSuccessMsg(`Authenticated as ${deskName}! Main board unlocked.`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login encounter an issue. Main board remains accessible.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      try {
        await setDoc(doc(db, 'users', user.uid), {
          userId: user.uid,
          email: user.email,
          displayName: user.displayName || 'Institutional Trader',
          role: 'trader',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {}

      setSuccessMsg(`Welcome, ${user.displayName || user.email}!`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'auth/popup-blocked') {
        setErrorMsg('Browser popup was blocked. Please use Instant Institutional Trader access below.');
      } else {
        setErrorMsg(err.message || 'Popup closed or blocked. Try Instant Trader Access.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-mono">
      <div
        className={`w-full max-w-md rounded-xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isDark
            ? 'bg-[#181d29] border-[#2e3748] text-slate-100'
            : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b ${
            isDark ? 'border-[#2a3444] bg-[#131722]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-[#7da98f]/20 text-[#7da98f]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-wider uppercase">
                INSTITUTIONAL TRADER AUTHENTICATION
              </h2>
              <p className="text-[10px] text-[#64748b]">
                Zero-latency access to the ChronosMatch main board
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#64748b] hover:text-slate-200 hover:bg-[#252c3c] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-start gap-2 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-[11px]">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Option 1: 1-Click Instant Institutional Trader (Zero Lag, No Popup) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#7da98f] tracking-wider uppercase">
                RECOMMENDED • ZERO-LATENCY 1-CLICK LOGIN
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#5b9a78]/20 text-[#7da98f] font-semibold border border-[#5b9a78]/30">
                NO POPUP
              </span>
            </div>

            <button
              onClick={() => handleInstantTraderLogin('Citadel Quant Desk #429', 'Senior Quant')}
              disabled={loading}
              className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all group ${
                isDark
                  ? 'bg-[#1c2230] border-[#374256] hover:border-[#5b9a78] hover:bg-[#222a3c]'
                  : 'bg-slate-50 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#5b9a78]/15 text-[#5b9a78] group-hover:scale-105 transition">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-100 flex items-center gap-1.5">
                    <span>Institutional Quant Desk #429</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#2a3444] text-[#8ca0b4]">
                      PROP HFT
                    </span>
                  </div>
                  <div className="text-[10px] text-[#64748b]">
                    Instant access • Full Firestore Cloud Vault & Order Book sync
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#7da98f] group-hover:translate-x-1 transition" />
            </button>

            <button
              onClick={() => handleInstantTraderLogin('Jane Street Execution Desk', 'Execution Algo')}
              disabled={loading}
              className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all group ${
                isDark
                  ? 'bg-[#1c2230] border-[#374256] hover:border-[#8ca0b4] hover:bg-[#222a3c]'
                  : 'bg-slate-50 border-slate-300 hover:border-blue-500 hover:bg-blue-50/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-[#8ca0b4]/15 text-[#8ca0b4]">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-200 text-[11px]">
                    Jane Street Execution Desk
                  </div>
                  <div className="text-[10px] text-[#64748b]">
                    Market Maker profile • Sub-50µs audit telemetry
                  </div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#8ca0b4] group-hover:translate-x-1 transition" />
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className={`grow border-t ${isDark ? 'border-[#2a3444]' : 'border-slate-200'}`}></div>
            <span className={`shrink mx-3 text-[10px] uppercase tracking-wider ${isDark ? 'text-[#64748b]' : 'text-slate-400'}`}>
              Or OAuth Providers
            </span>
            <div className={`grow border-t ${isDark ? 'border-[#2a3444]' : 'border-slate-200'}`}></div>
          </div>

          {/* Option 2: Google Sign-In */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full py-2.5 px-3 rounded-lg border flex items-center justify-center gap-2 font-semibold transition ${
              isDark
                ? 'bg-[#1c2030] hover:bg-[#252c40] border-[#374256] text-slate-200'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-xs'
            }`}
          >
            <LogIn className="w-4 h-4 text-[#8ca0b4]" />
            <span>SIGN IN WITH GOOGLE ACCOUNT</span>
          </button>

          {/* Option 3: Continue as Guest to Main Board */}
          <div className="pt-2 border-t border-[#2a3444]/60 flex items-center justify-between">
            <span className="text-[10px] text-[#64748b]">
              Need immediate view?
            </span>
            <button
              onClick={onClose}
              className="text-[11px] text-[#7da98f] hover:underline font-semibold flex items-center gap-1"
            >
              <span>OPEN MAIN BOARD NOW</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
