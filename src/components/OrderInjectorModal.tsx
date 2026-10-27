import React, { useState } from 'react';
import { Send, X, Zap, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface OrderInjectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInject: (order: { side: string; order_type: string; price: number; quantity: number; is_whale: boolean }) => void;
  currentMid: number;
}

export const OrderInjectorModal: React.FC<OrderInjectorModalProps> = ({
  isOpen,
  onClose,
  onInject,
  currentMid = 182.50
}) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT');
  const [price, setPrice] = useState<number>(currentMid);
  const [quantity, setQuantity] = useState<number>(1000);
  const [isWhale, setIsWhale] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInject({
      side,
      order_type: orderType,
      price: Number(price),
      quantity: Number(quantity),
      is_whale: isWhale
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 font-mono">
      <div className="bg-[#1c2030] border border-[#2a2e39] rounded-lg p-4 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#2a2e39] mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-[#131722] text-[#8ca0b4] border border-[#2a2e39]">
              <Send className="w-3.5 h-3.5" />
            </span>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              MANUAL ORDER INJECTION
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#64748b] hover:text-slate-200 hover:bg-[#131722]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* Side (Buy / Sell) */}
          <div>
            <label className="text-[#64748b] block mb-1 font-semibold text-[10px] uppercase tracking-wider">ORDER SIDE</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`py-1.5 rounded font-semibold flex items-center justify-center gap-1.5 border transition ${
                  side === 'BUY'
                    ? 'bg-[#1e2a22] text-[#7da98f] border-[#384a3e]'
                    : 'bg-[#151926] text-[#64748b] border-[#242834] hover:bg-[#1a1f2e]'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                BUY (BID)
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`py-1.5 rounded font-semibold flex items-center justify-center gap-1.5 border transition ${
                  side === 'SELL'
                    ? 'bg-[#2a1e1e] text-[#c07070] border-[#4e3434]'
                    : 'bg-[#151926] text-[#64748b] border-[#242834] hover:bg-[#1a1f2e]'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                SELL (ASK)
              </button>
            </div>
          </div>

          {/* Order Type */}
          <div>
            <label className="text-[#64748b] block mb-1 font-semibold text-[10px] uppercase tracking-wider">ORDER TYPE</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderType('LIMIT')}
                className={`py-1.5 rounded font-semibold border transition ${
                  orderType === 'LIMIT'
                    ? 'bg-[#131722] text-slate-100 border-[#3d4b60]'
                    : 'bg-[#151926] text-[#64748b] border-[#242834] hover:bg-[#1a1f2e]'
                }`}
              >
                LIMIT ORDER
              </button>
              <button
                type="button"
                onClick={() => setOrderType('MARKET')}
                className={`py-1.5 rounded font-semibold border transition ${
                  orderType === 'MARKET'
                    ? 'bg-[#131722] text-slate-100 border-[#3d4b60]'
                    : 'bg-[#151926] text-[#64748b] border-[#242834] hover:bg-[#1a1f2e]'
                }`}
              >
                MARKET ORDER (TAKER)
              </button>
            </div>
          </div>

          {/* Limit Price */}
          {orderType === 'LIMIT' && (
            <div>
              <label className="text-[#64748b] block mb-1 font-semibold text-[10px] uppercase tracking-wider">LIMIT PRICE ($)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs outline-none focus:border-[#4d5b70]"
                required
              />
              <span className="text-[10px] text-[#556376] mt-0.5 block">Current Mid: ${currentMid.toFixed(2)}</span>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="text-[#64748b] block mb-1 font-semibold text-[10px] uppercase tracking-wider">QUANTITY (SHARES)</label>
            <input
              type="number"
              step="100"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs outline-none focus:border-[#4d5b70]"
              required
            />
            <div className="flex gap-1.5 mt-1.5">
              {[500, 2000, 5000, 15000, 30000].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuantity(q);
                    if (q >= 5000) setIsWhale(true);
                  }}
                  className="px-2 py-0.5 rounded bg-[#131722] border border-[#2a2e39] text-[10px] text-[#8ca0b4] hover:text-slate-200"
                >
                  +{q >= 1000 ? `${q / 1000}k` : q}
                </button>
              ))}
            </div>
          </div>

          {/* Whale sweep checkbox */}
          <div className="p-2 rounded bg-[#151926] border border-[#2a2e39]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isWhale}
                onChange={(e) => setIsWhale(e.target.checked)}
                className="accent-[#c29850] rounded"
              />
              <span className="text-[#d6b77c] font-semibold text-xs flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-current text-[#c29850]" />
                Institutional Whale Flag
              </span>
            </label>
            <span className="text-[10px] text-[#556376] block mt-0.5">
              Sets binary struct flag byte (0x01) to trigger price-level sweeping radar & terminal banner.
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2 rounded font-semibold text-slate-100 bg-[#2a3444] border border-[#3d4b60] hover:bg-[#344054] transition-all uppercase tracking-wider text-xs"
          >
            INJECT INTO MMAP BUFFER
          </button>
        </form>
      </div>
    </div>
  );
};
