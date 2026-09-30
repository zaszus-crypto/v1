import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Crosshair,
  Sliders,
  Play,
  RotateCcw,
  Zap,
  Info,
} from 'lucide-react';

interface EngineItem {
  id: string;
  name: string;
  category: string;
  signal: -1 | 0 | 1;
  weight: number;
  description: string;
}

export const LiveEngineTerminal: React.FC<{ onOpenTelegramPreview: () => void }> = ({ onOpenTelegramPreview }) => {
  const [selectedDirection, setSelectedDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [marketRegime, setMarketRegime] = useState<string>('TRENDING_UP');
  const [timeframe, setTimeframe] = useState<'M15' | 'H1' | 'H4'>('M15');

  // Interactive toggle overlays
  const [showFVG, setShowFVG] = useState(true);
  const [showOB, setShowOB] = useState(true);
  const [showSweeps, setShowSweeps] = useState(true);
  const [showTargets, setShowTargets] = useState(true);

  // 10 Institutional Engine States
  const [engines, setEngines] = useState<EngineItem[]>([
    { id: '1', name: 'TREND_STACK', category: 'Trend Ribbon', signal: 1, weight: 2.2, description: 'EMA 9/21/50/200 stacked alignment' },
    { id: '2', name: 'MARKET_STRUCTURE', category: 'Structure', signal: 1, weight: 2.0, description: 'Fractal BOS (Break of Structure)' },
    { id: '3', name: 'LIQUIDITY_SWEEP', category: 'Order Flow', signal: 1, weight: 1.9, description: 'Stop hunt Asian/London low sweep' },
    { id: '4', name: 'FVG_DETECT', category: 'Imbalance', signal: 1, weight: 1.6, description: 'Unmitigated Bullish FVG @ 2642.50' },
    { id: '5', name: 'ORDER_BLOCK', category: 'Footprint', signal: 1, weight: 1.8, description: 'Institutional Demand Block 50% retest' },
    { id: '6', name: 'RSI_DIVERGENCE', category: 'Momentum', signal: 1, weight: 1.7, description: 'Regular Bullish Divergence on M15' },
    { id: '7', name: 'VOLUME_CLIMAX', category: 'Volume', signal: 1, weight: 1.5, description: 'Exhaustion wick rejection with 2.2x vol' },
    { id: '8', name: 'VOLATILITY_REGIME', category: 'Volatility', signal: 1, weight: 1.4, description: 'ATR expansion from low squeeze' },
    { id: '9', name: 'SESSION_MOMENTUM', category: 'Time & Price', signal: 1, weight: 1.5, description: 'London-to-NY overlap continuation drive' },
    { id: '10', name: 'MOMENTUM_ROC', category: 'Acceleration', signal: 1, weight: 1.3, description: 'Positive Rate-of-Change acceleration' },
  ]);

  // Pricing calculations
  const basePrice = selectedDirection === 'BUY' ? 2648.50 : 2654.20;
  const entryIdeal = selectedDirection === 'BUY' ? 2645.20 : 2656.80;
  const entryLow = selectedDirection === 'BUY' ? 2643.80 : 2655.40;
  const entryHigh = selectedDirection === 'BUY' ? 2646.60 : 2658.20;
  const stopLoss = selectedDirection === 'BUY' ? 2639.40 : 2662.60;
  const tp1 = selectedDirection === 'BUY' ? 2654.00 : 2647.50;
  const tp2 = selectedDirection === 'BUY' ? 2661.50 : 2640.00;
  const tp3 = selectedDirection === 'BUY' ? 2672.00 : 2630.00;

  const riskPoints = Math.abs(entryIdeal - stopLoss);
  const rrTp1 = (Math.abs(tp1 - entryIdeal) / riskPoints).toFixed(2);
  const rrTp2 = (Math.abs(tp2 - entryIdeal) / riskPoints).toFixed(2);
  const rrTp3 = (Math.abs(tp3 - entryIdeal) / riskPoints).toFixed(2);

  // Compute Confluence
  let buyWeight = 0;
  let sellWeight = 0;
  engines.forEach((e) => {
    if (e.signal > 0) buyWeight += e.weight;
    else if (e.signal < 0) sellWeight += e.weight;
  });
  const totalWeight = buyWeight + sellWeight || 1;
  const rawConfluence = selectedDirection === 'BUY'
    ? (buyWeight / totalWeight) * 100
    : (sellWeight / totalWeight) * 100;

  // Grade calculation
  let grade = 'Grade A';
  let lotTier = '0.5x (Probing)';
  let equityRisk = '0.5%';
  let gradeBadgeColor = 'text-emerald-400 bg-emerald-950/60 border-emerald-800';

  if (rawConfluence >= 90) {
    grade = 'Grade A Super +';
    lotTier = '3.0x (Maximum Size)';
    equityRisk = '3.0%';
    gradeBadgeColor = 'text-purple-300 bg-purple-950/80 border-purple-700 shadow-sm';
  } else if (rawConfluence >= 80) {
    grade = 'Grade A+++';
    lotTier = '2.0x (High Conviction)';
    equityRisk = '2.0%';
    gradeBadgeColor = 'text-rose-400 bg-rose-950/60 border-rose-800';
  } else if (rawConfluence >= 70) {
    grade = 'Grade A++';
    lotTier = '1.0x (Standard Base)';
    equityRisk = '1.0%';
    gradeBadgeColor = 'text-amber-400 bg-amber-950/60 border-amber-800';
  }

  // Quick Preset Handlers
  const handlePresetSuper = () => {
    setSelectedDirection('BUY');
    setMarketRegime('TRENDING_UP');
    setEngines(engines.map((e) => ({ ...e, signal: 1 })));
  };

  const handlePresetSell = () => {
    setSelectedDirection('SELL');
    setMarketRegime('TRENDING_DOWN');
    setEngines(engines.map((e) => ({ ...e, signal: -1 })));
  };

  const handlePresetMixed = () => {
    setEngines(
      engines.map((e, idx) => ({
        ...e,
        signal: idx % 3 === 0 ? -1 : idx % 2 === 0 ? 0 : 1,
      }))
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Top Controller Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setSelectedDirection('BUY')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                selectedDirection === 'BUY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              BUY SETUP
            </button>
            <button
              onClick={() => setSelectedDirection('SELL')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                selectedDirection === 'SELL'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              SELL SETUP
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            {(['M15', 'H1', 'H4'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded font-mono font-medium transition-colors ${
                  timeframe === tf ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <select
            value={marketRegime}
            onChange={(e) => setMarketRegime(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
          >
            <option value="TRENDING_UP">📈 Regime: TRENDING UP</option>
            <option value="TRENDING_DOWN">📉 Regime: TRENDING DOWN</option>
            <option value="RANGING">↔️ Regime: RANGING</option>
            <option value="VOLATILE">⚡ Regime: VOLATILE</option>
            <option value="QUIET">😴 Regime: QUIET</option>
          </select>
        </div>

        {/* Quick Simulation Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Preset:</span>
          <button
            onClick={handlePresetSuper}
            className="px-2.5 py-1 text-xs rounded bg-purple-950/60 text-purple-300 border border-purple-800 hover:bg-purple-900/60 transition-colors"
          >
            A Super+ Buy
          </button>
          <button
            onClick={handlePresetSell}
            className="px-2.5 py-1 text-xs rounded bg-rose-950/60 text-rose-300 border border-rose-800 hover:bg-rose-900/60 transition-colors"
          >
            A+++ Sell
          </button>
          <button
            onClick={handlePresetMixed}
            className="px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive SMC Chart Viewport (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-xl">
            {/* Chart Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/40">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-amber-300 text-sm">XAUUSD Spot</span>
                <span className="font-mono text-sm text-white tabular-nums">${basePrice.toFixed(2)}</span>
                <span className="text-xs font-mono text-emerald-400">+1.24% (+32.4 pts)</span>
              </div>

              {/* SMC Overlay Toggles */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setShowFVG(!showFVG)}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    showFVG ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700' : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  FVG
                </button>
                <button
                  onClick={() => setShowOB(!showOB)}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    showOB ? 'bg-amber-950/80 text-amber-300 border-amber-700' : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  OB
                </button>
                <button
                  onClick={() => setShowSweeps(!showSweeps)}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    showSweeps ? 'bg-purple-950/80 text-purple-300 border-purple-700' : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  Sweeps
                </button>
                <button
                  onClick={() => setShowTargets(!showTargets)}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    showTargets ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700' : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  SL/TP
                </button>
              </div>
            </div>

            {/* Interactive SVG Chart Canvas */}
            <div className="relative w-full h-[400px] p-4 select-none bg-slate-950">
              <svg className="w-full h-full" viewBox="0 0 700 360" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                <line x1="0" y1="60" x2="700" y2="60" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="700" y2="120" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="180" x2="700" y2="180" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="240" x2="700" y2="240" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="300" x2="700" y2="300" stroke="#1e293b" strokeDasharray="3 3" />

                {/* SMC Layer: Fair Value Gap (FVG Zone) */}
                {showFVG && (
                  <g>
                    <rect x="220" y="160" width="380" height="42" fill="#06b6d4" fillOpacity="0.15" stroke="#0891b2" strokeWidth="1" strokeDasharray="4 2" />
                    <text x="230" y="185" fill="#22d3ee" fontSize="10" fontFamily="monospace">
                      Bullish FVG (Imbalance Zone 2643 - 2646)
                    </text>
                  </g>
                )}

                {/* SMC Layer: Order Block (OB Zone) */}
                {showOB && (
                  <g>
                    <rect x="120" y="210" width="220" height="55" fill="#f59e0b" fillOpacity="0.12" stroke="#d97706" strokeWidth="1" />
                    <text x="130" y="240" fill="#fbbf24" fontSize="10" fontFamily="monospace">
                      Institutional Demand OB (50% Eq: 2645.20)
                    </text>
                  </g>
                )}

                {/* SMC Layer: Liquidity Sweep Line */}
                {showSweeps && (
                  <g>
                    <line x1="60" y1="275" x2="280" y2="275" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="2 2" />
                    <circle cx="210" cy="275" r="4" fill="#c084fc" />
                    <text x="70" y="295" fill="#c084fc" fontSize="10" fontFamily="monospace">
                      ⚡ Asian Low Liquidity Sweep Cleaned
                    </text>
                  </g>
                )}

                {/* Structural BOS line */}
                <line x1="380" y1="110" x2="680" y2="110" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x="400" y="105" fill="#34d399" fontSize="10" fontFamily="monospace">
                  BOS (Break of Structure 2658.00)
                </text>

                {/* Simulated Candlesticks (Sequence of 20 realistic bars) */}
                {[
                  { x: 30, o: 190, c: 175, h: 165, l: 200, bull: true },
                  { x: 55, o: 175, c: 185, h: 170, l: 195, bull: false },
                  { x: 80, o: 185, c: 215, h: 180, l: 220, bull: false },
                  { x: 105, o: 215, c: 240, h: 210, l: 250, bull: false },
                  { x: 130, o: 240, c: 265, h: 235, l: 275, bull: false },
                  { x: 155, o: 265, c: 255, h: 250, l: 280, bull: true },
                  { x: 180, o: 255, c: 270, h: 250, l: 282, bull: false },
                  { x: 205, o: 270, c: 260, h: 255, l: 290, bull: true }, // The sweep wick!
                  { x: 230, o: 260, c: 220, h: 215, l: 265, bull: true }, // Impulse up
                  { x: 255, o: 220, c: 180, h: 175, l: 225, bull: true }, // Gap creator
                  { x: 280, o: 180, c: 140, h: 135, l: 185, bull: true }, // Break of structure
                  { x: 305, o: 140, c: 155, h: 130, l: 160, bull: false },
                  { x: 330, o: 155, c: 145, h: 138, l: 160, bull: true },
                  { x: 355, o: 145, c: 160, h: 142, l: 168, bull: false },
                  { x: 380, o: 160, c: 175, h: 155, l: 180, bull: false }, // Retest down into FVG
                  { x: 405, o: 175, c: 180, h: 170, l: 182, bull: false }, // Touch entry_ideal!
                  { x: 430, o: 180, c: 165, h: 160, l: 185, bull: true }, // Rejection
                  { x: 455, o: 165, c: 140, h: 135, l: 170, bull: true },
                  { x: 480, o: 140, c: 110, h: 105, l: 145, bull: true },
                  { x: 505, o: 110, c: 90, h: 85, l: 115, bull: true },
                ].map((cd, i) => (
                  <g key={i}>
                    <line x1={cd.x} y1={cd.h} x2={cd.x} y2={cd.l} stroke={cd.bull ? '#10b981' : '#f43f5e'} strokeWidth="1.5" />
                    <rect
                      x={cd.x - 7}
                      y={Math.min(cd.o, cd.c)}
                      width="14"
                      height={Math.max(4, Math.abs(cd.o - cd.c))}
                      fill={cd.bull ? '#10b981' : '#f43f5e'}
                      rx="1"
                    />
                  </g>
                ))}

                {/* Target Executions: SL / Entry / TP1 / TP2 / TP3 */}
                {showTargets && (
                  <g>
                    {/* TP3 line */}
                    <line x1="380" y1="40" x2="700" y2="40" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                    <text x="590" y="35" fill="#34d399" fontSize="10" fontFamily="monospace">
                      TP3: ${tp3.toFixed(2)} ({rrTp3}R)
                    </text>

                    {/* TP2 line */}
                    <line x1="380" y1="75" x2="700" y2="75" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                    <text x="590" y="70" fill="#34d399" fontSize="10" fontFamily="monospace">
                      TP2: ${tp2.toFixed(2)} ({rrTp2}R)
                    </text>

                    {/* TP1 line */}
                    <line x1="380" y1="120" x2="700" y2="120" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                    <text x="590" y="115" fill="#34d399" fontSize="10" fontFamily="monospace">
                      TP1: ${tp1.toFixed(2)} ({rrTp1}R)
                    </text>

                    {/* Entry Ideal line */}
                    <line x1="380" y1="180" x2="700" y2="180" stroke="#38bdf8" strokeWidth="2" />
                    <text x="580" y="175" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                      ENTRY LIMIT: ${entryIdeal.toFixed(2)}
                    </text>

                    {/* Stop Loss line */}
                    <line x1="380" y1="260" x2="700" y2="260" stroke="#f43f5e" strokeWidth="2" strokeDasharray="5 3" />
                    <text x="590" y="255" fill="#fb7185" fontSize="10" fontFamily="monospace" fontWeight="bold">
                      STRUCTURAL SL: ${stopLoss.toFixed(2)}
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Bottom Status ticker */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-t border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Feed: Deriv WebSocket / Yahoo GC=F Dynamic Basis Engine</span>
              </div>
              <div className="font-mono text-slate-300">
                Risk Buffer: 0.30 x ATR (14) · Zero Lookahead Validated
              </div>
            </div>
          </div>

          {/* Sizing & Execution Decision Card */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Alokasi Lot Sizing Institusional (Kelly Scaling)
                </div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Klasifikasi:</span>
                  <span className={`px-2.5 py-0.5 rounded font-extrabold text-xs border ${gradeBadgeColor}`}>
                    {grade}
                  </span>
                </div>
              </div>

              <button
                onClick={onOpenTelegramPreview}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
              >
                Preview Telegram Alert
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400">Lot Multiplier</div>
                <div className="text-base font-mono font-bold text-white">{lotTier}</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400">Equity Risk</div>
                <div className="text-base font-mono font-bold text-amber-300">{equityRisk} of Balance</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400">Risk Points</div>
                <div className="text-base font-mono font-bold text-rose-300">{riskPoints.toFixed(2)} pts</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-slate-400">Expected RR (TP2)</div>
                <div className="text-base font-mono font-bold text-emerald-300">1 : {rrTp2}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 10 Institutional Engines Matrix (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  10-Engine Confluence Matrix
                </h3>
                <p className="text-[11px] text-slate-400">
                  Ubah sinyal per-engine secara interaktif untuk menguji kalkulasi grade.
                </p>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400">Score Confluence</div>
                <div className="text-lg font-mono font-bold text-amber-300">{rawConfluence.toFixed(1)}%</div>
              </div>
            </div>

            {/* List of 10 Engines */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {engines.map((eng) => {
                return (
                  <div
                    key={eng.id}
                    className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 max-w-[200px]">
                      <div className="font-semibold text-white truncate">{eng.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{eng.description}</div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-slate-500">W:{eng.weight}</span>
                      <button
                        onClick={() => {
                          const nextSig = eng.signal === 1 ? 0 : eng.signal === 0 ? -1 : 1;
                          setEngines(engines.map((item) => (item.id === eng.id ? { ...item, signal: nextSig as -1 | 0 | 1 } : item)));
                        }}
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] transition-colors ${
                          eng.signal === 1
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : eng.signal === -1
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {eng.signal === 1 ? '+BULL' : eng.signal === -1 ? '-BEAR' : 'NEUTRAL'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
