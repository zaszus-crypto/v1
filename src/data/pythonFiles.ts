import rawMap from './rawFilesMap.json';

export interface PythonFileMeta {
  filename: string;
  category: 'core' | 'engines' | 'execution' | 'backtest' | 'network' | 'workflow';
  description: string;
  keyFixes: string[];
  code: string;
}

const fileDetails: Record<string, { category: PythonFileMeta['category']; description: string; keyFixes: string[] }> = {
  'main.py': {
    category: 'execution',
    description: 'Main production runtime orchestrator with 4-Tier Lot Sizing, dynamic basis tracking, and Telegram dispatch.',
    keyFixes: [
      'Implementasi 4-Tier Lot Sizing (A Super 3.0x, A+++ 2.0x, A++ 1.0x, A 0.5x)',
      'Dynamic basis tracking Comex-to-Spot menggantikan hardcode -35.00',
      'SQLite WAL mode & retry connection timeout 15 detik',
      'Validasi entitas HTML Telegram untuk mencegah 400 Bad Request',
    ],
  },
  'agi_core.py': {
    category: 'core',
    description: 'AGI core cognitive system: Wilder RMA ADX, numerically stable Platt scaling, and vectorized episodic memory.',
    keyFixes: [
      'Wilder RMA exponential smoothing menghilangkan phase-lag ADX',
      'Overflow clipping z in [-30, 30] pada Platt Scaling logistic function',
      'Gradient clipping step dampening pada Newton-Raphson fit',
      'Vectorized BLAS dot product matrix similarity query (<1ms latensi)',
      'SQLite WAL mode dengan synchronous=NORMAL',
    ],
  },
  'engines.py': {
    category: 'engines',
    description: '10 Institutional Quantitative Engines with unmitigated FVG and pin-bar Order Block detection.',
    keyFixes: [
      'Pemisahan slice candle historis pada pendeteksian swing untuk mencegah kontaminasi liquidity sweep',
      'Algoritma Unmitigated FVG (memeriksa candle selanjutnya agar tidak mengambil gap yang sudah terisi)',
      'Validasi impulsif body order block (>1.6x average body)',
      'UTC timezone alignment pada London & New York session momentum',
    ],
  },
  'precision_entry.py': {
    category: 'execution',
    description: 'Structural order flow zone execution, multi-tier TP, and dynamic lot sizing allocation.',
    keyFixes: [
      'Perhitungan batas zona limit FVG & OB equilibrium 50%',
      'Buffer volatilitas 0.30 * ATR di balik Fractal Swing untuk stop loss aman',
      'Penetapan 4-Tier Lot: A Super (3.0x), A+++ (2.0x), A++ (1.0x), A (0.5x)',
      'Validasi matematis Risk-to-Reward minimum (TP1 >= 1.5R, TP2 >= 2.5R, TP3 >= 4.0R)',
    ],
  },
  'backtest.py': {
    category: 'backtest',
    description: 'Realistic institutional backtest simulator without lookahead bias or free-fill illusions.',
    keyFixes: [
      'Realistic Limit Fill: Harga harus menyentuh entry_ideal di bar selanjutnya sebelum aktif',
      'Zero Lookahead: Timeframe H1 & H4 dipotong strictly strictly-prior (< current_bar_time)',
      'Perhitungan Sharpe, Sortino, Calmar, dan Expectancy berbobot lot sizing dinamis',
      'Pengelompokan analitik per market regime dan execution grade',
    ],
  },
  'auto_tuner.py': {
    category: 'backtest',
    description: 'Walk-Forward genetic/grid parameter optimizer with overfitting penalty.',
    keyFixes: [
      'Pembagian 70% In-Sample (Train) dan 30% Out-of-Sample (Validation)',
      'Fitness function yang menghukum over-optimasi dan memberi bobot pada stabilitas OOS',
      'Proteksi pembagian dengan nol pada kombinasi parameter tanpa trade',
    ],
  },
  'engine_tracker.py': {
    category: 'engines',
    description: 'Thread-safe per-regime engine accuracy tracker with automatic quarantine.',
    keyFixes: [
      'Thread-safe re-entrant lock (RLock)',
      'Auto-quarantine engine dengan akurasi <38% pada regime tertentu',
      'Multiplier bobot mulus [0.3x sampai 1.6x] berdasarkan sliding window accuracy',
    ],
  },
  'telegram_utils.py': {
    category: 'network',
    description: 'Resilient Telegram dispatcher with rate-limit backoff and HTML entity safety.',
    keyFixes: [
      'Exponential backoff saat menerima HTTP 429 (Too Many Requests)',
      'Sanitasi entity HTML mencegah pesan gagal terkirim (400 Bad Request)',
      'Support multi-chat ID & broadcast list',
    ],
  },
  'agi_gemini.py': {
    category: 'core',
    description: 'AI Institutional Trading Council: Multi-persona debate (Bull, Bear, Risk Officer).',
    keyFixes: [
      'Regime & trend context injection into LLM prompt',
      'Structured response parser for VERDICT and CONFIDENCE_MULT',
      'Post-trade psychological reflection loop every 10 trades',
    ],
  },
  'requirements.txt': {
    category: 'workflow',
    description: 'Verified production Python dependencies with exact compatibility versions.',
    keyFixes: [
      'Pin verified versions for pandas, numpy, websocket-client, yfinance, requests',
    ],
  },
  '.github/workflows/xauusd_quant_engine.yml': {
    category: 'workflow',
    description: 'GitHub Actions automated workflow cron running every 15 minutes with state cache persistence.',
    keyFixes: [
      'Automated cron execution: */15 * * * 1-5 (market hours Monday-Friday)',
      'State Cache persistence for episodic memory and calibration SQLite DB',
      'Environment secrets wiring for Telegram bot and Gemini API',
      'Manual workflow_dispatch support with force_run toggle',
    ],
  },
};

export const RAW_FILES_MAP: Record<string, string> = rawMap;

export const PATCHED_PYTHON_FILES: PythonFileMeta[] = Object.keys(RAW_FILES_MAP).map((filename) => {
  const meta = fileDetails[filename] || {
    category: 'core' as const,
    description: `File: ${filename}`,
    keyFixes: ['Clean production-ready code'],
  };
  return {
    filename,
    category: meta.category,
    description: meta.description,
    keyFixes: meta.keyFixes,
    code: RAW_FILES_MAP[filename],
  };
});
