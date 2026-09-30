import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  Download,
  FileCode,
  ShieldCheck,
  FileArchive,
  Github,
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PATCHED_PYTHON_FILES, PythonFileMeta, RAW_FILES_MAP } from '../data/pythonFiles';

export const CodeInspector: React.FC = () => {
  const [selectedFilename, setSelectedFilename] = useState<string>('main.py');
  const [copied, setCopied] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const currentFile =
    PATCHED_PYTHON_FILES.find((f) => f.filename === selectedFilename) ||
    PATCHED_PYTHON_FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (file: PythonFileMeta) => {
    const blob = new Blob([file.code], { type: 'text/plain;charset=utf-8' });
    const cleanName = file.filename.includes('/') ? file.filename.split('/').pop()! : file.filename;
    saveAs(blob, cleanName);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add each file to the zip with folder preservation
      Object.entries(RAW_FILES_MAP).forEach(([path, content]) => {
        zip.file(path, content);
      });

      // Add informative README in zip
      const readmeContent = `# XAUUSD AGI Quant Engine v32.0 (Grade A Super +)

## Quick Start on GitHub
1. Upload all files to your GitHub repository (preserving \`.github/workflows/xauusd_quant_engine.yml\`).
2. Go to Repository **Settings** -> **Secrets and variables** -> **Actions**.
3. Add the following Repository Secrets:
   - \`TELEGRAM_BOT_TOKEN\`: Your Telegram Bot API token from @BotFather
   - \`TELEGRAM_CHAT_ID\`: Your personal or channel Telegram Chat ID
   - \`GEMINI_API_KEY\`: Google Gemini API key for AI Institutional Council debate
   - \`HEALTHCHECK_URL\` (Optional): Ping monitoring service like Healthchecks.io or BetterStack

## Automated Cron Execution
The included GitHub Actions workflow (\`.github/workflows/xauusd_quant_engine.yml\`) automatically runs:
- Schedule: Every 15 minutes during Forex market hours (\`*/15 * * * 1-5\`)
- Preserves SQLite episodic memory and engine tracker calibration state across runs via GitHub Actions Cache.
- Real-time limit orders with 4-Tier Dynamic Lot Sizing sent to Telegram!

## Local Run
\`\`\`bash
pip install -r requirements.txt
python main.py
\`\`\`
`;
      zip.file('README.md', readmeContent);

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'xauusd_quant_engine_v32_github_ready.zip');
    } catch (err) {
      console.error('Failed to generate zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Code2 className="w-3.5 h-3.5" />
            Production Code Hub · Grade A Super +
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Kode Sumber Python & GitHub Workflow (.yml) Siap Pakai
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Lengkap dengan file konfigurasi GitHub Actions Cron 15-menit, penanganan konkurensi SQLite WAL,
            eliminasi lookahead bias, kalibrasi numerik stabil, dan sistem lot 4-tier.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 whitespace-nowrap active:scale-95 disabled:opacity-50"
          >
            <FileArchive className="w-4 h-4" />
            {isZipping ? 'Mengompres ZIP...' : 'Unduh ZIP (Semua File + GitHub YML)'}
          </button>
        </div>
      </div>

      {/* GitHub Workflow Banner Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <Github className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>GitHub Actions Automation (.github/workflows/xauusd_quant_engine.yml)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Ready to Deploy
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Workflow otomatis menjalankan scanning sinyal setiap 15 menit (\`*/15 * * * 1-5\`) tanpa server VPS,
              dengan cache memori SQLite dan integrasi secret Telegram + Gemini.
            </p>
          </div>
        </div>

        <button
          onClick={() => setSelectedFilename('.github/workflows/xauusd_quant_engine.yml')}
          className="px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-950/60 border border-indigo-800 rounded-lg hover:bg-indigo-900/60 transition-colors whitespace-nowrap shrink-0"
        >
          Lihat File .yml
        </button>
      </div>

      {/* Main File Browser View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar: File List (4 Cols) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1 pb-1 flex items-center justify-between">
            <span>Daftar File ({PATCHED_PYTHON_FILES.length} File)</span>
            <span className="text-[10px] text-amber-400 font-mono">v32.0 Patched</span>
          </div>
          <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
            {PATCHED_PYTHON_FILES.map((f) => {
              const isSelected = f.filename === selectedFilename;
              const isWorkflow = f.filename.endsWith('.yml');
              return (
                <div
                  key={f.filename}
                  onClick={() => setSelectedFilename(f.filename)}
                  className={`p-3 rounded-xl border cursor-pointer transition-colors space-y-1 ${
                    isSelected
                      ? 'bg-slate-900 border-amber-500/50 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white flex items-center gap-2 truncate">
                      {isWorkflow ? (
                        <Github className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      ) : (
                        <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                      )}
                      <span className="truncate">{f.filename}</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                      {f.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content: Code Viewer & Improvements (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Key Improvements for Selected File */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Fitur & Spesifikasi: <span className="font-mono text-white">{currentFile.filename}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Tersalin!' : 'Copy Code'}
                </button>
                <button
                  onClick={() => handleDownload(currentFile)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh File Ini
                </button>
              </div>
            </div>

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
              {currentFile.keyFixes.map((fix, idx) => (
                <li key={idx} className="flex items-start gap-1.5 bg-slate-950/40 p-2 rounded border border-slate-800/60">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>{fix}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Code Viewer */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400">
              <span className="font-mono text-amber-300 font-bold">{currentFile.filename}</span>
              <span>{currentFile.filename.endsWith('.yml') ? 'YAML Workflow' : 'Python 3.11+'} · Production Ready</span>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed selection:bg-amber-500/20">
              {currentFile.code}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
