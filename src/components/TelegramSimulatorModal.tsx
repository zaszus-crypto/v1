import React from 'react';
import { X, Send, CheckCircle2, ShieldAlert } from 'lucide-react';

interface TelegramSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramSimulatorModal: React.FC<TelegramSimulatorModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-bold text-white">Telegram Dispatch Simulator (v32.0 Format)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono bg-slate-950/70 text-slate-200 leading-relaxed">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 shadow-inner">
            <div className="text-emerald-400 font-bold text-sm">
              🟢 XAUUSD BUY EXECUTION ALERT
            </div>
            <div className="text-slate-600">━━━━━━━━━━━━━━━━━━━━━</div>
            <div className="text-purple-300 font-bold">
              🚀 GRADE A SUPER+ (PRIME INSTITUTIONAL CONFLUENCE)
              <br />
              💰 Recommended Risk: 3.0% (3.0x Lot Sizing)
            </div>
            <div className="text-slate-600">━━━━━━━━━━━━━━━━━━━━━</div>
            <div>
              📊 <span className="text-slate-400">Confluence:</span> [████████░░] 88.5% (Score: 92.4/100)
              <br />
              🌊 <span className="text-slate-400">Market Regime:</span> TRENDING_UP (Conf 0.94)
              <br />
              🎯 <span className="text-slate-400">Precision Quality:</span> 91.5/100 (A Super)
              <br />
              📡 <span className="text-slate-400">Feed Source:</span> Deriv WebSocket
            </div>
            <div className="text-slate-600">━━━━━━━━━━━━━━━━━━━━━</div>
            <div>
              <span className="text-amber-300 font-semibold">Entry Type:</span> FVG_FILL & OB_RETEST
              <br />
              <span className="text-slate-400">Entry Limit Zone:</span> <span className="text-cyan-300">2643.80 - 2646.60</span>
              <br />
              <span className="text-slate-400">Ideal Limit Price:</span> <span className="text-cyan-300 font-bold">2645.20</span>
              <br />
              <span className="text-slate-400">Stop Loss:</span> <span className="text-rose-400 font-bold">2639.40</span> (Below Swing Low - 0.30 ATR)
              <br />
              <span className="text-slate-400">Risk:</span> <span className="text-rose-300">5.80 pts</span>
            </div>
            <div className="text-slate-600">━━━━━━━━━━━━━━━━━━━━━</div>
            <div>
              🎯 <span className="text-slate-400">TP1:</span> <span className="text-emerald-400">2654.00</span> (1.52 R) <i>Liquidity Pool</i>
              <br />
              🎯 <span className="text-slate-400">TP2:</span> <span className="text-emerald-400">2661.50</span> (2.81 R) <i>Imbalance Void</i>
              <br />
              🎯 <span className="text-slate-400">TP3:</span> <span className="text-emerald-400">2672.00</span> (4.62 R) <i>Institutional Level</i>
            </div>
            <div className="text-slate-600">━━━━━━━━━━━━━━━━━━━━━</div>
            <div>
              🧠 <span className="text-slate-400">Episodic Memory:</span> 18 cases | 72% WR | +1.45R avg
              <br />
              ⚡ <span className="text-slate-400">Anomaly Index:</span> 0.22 (Normal flow)
              <br />
              🏛️ <span className="text-slate-400">AI Council Verdict:</span> ✅ AGREE (1.15x)
              <br />
              <span className="text-slate-500 italic">"Strong multi-timeframe displacement retesting fresh demand OB with clean sweep."</span>
            </div>
            <div className="text-slate-600">━━━━━━━━━━━━━━━━━━━━━</div>
            <div className="text-slate-500 text-[10px]">
              ⏰ 30 Sep 2026 | 10:45 WIB
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950">
          <span className="text-[11px] text-slate-400">
            Sanitized HTML entity parsing (No 400 Bad Request error)
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
