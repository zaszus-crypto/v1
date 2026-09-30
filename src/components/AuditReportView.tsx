import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Database,
  ArrowRight,
  Filter,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AUDIT_SUMMARY, VULNERABILITY_LIST, GRADE_CRITERIA_MATRIX, VulnerabilityItem } from '../data/auditData';

export const AuditReportView: React.FC<{ onNavigateToSimulator: () => void }> = ({ onNavigateToSimulator }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string>(VULNERABILITY_LIST[0].id);

  const filteredVulnerabilities = VULNERABILITY_LIST.filter((item) => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
    if (selectedSeverity !== 'ALL' && item.severity !== selectedSeverity) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
      {/* Hero Executive Summary */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <Zap className="w-3.5 h-3.5" />
              Comprehensive Technical & Mathematical Audit
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Analisa Kesalahan, Kelemahan & Rekayasa Ulang Menuju Grade A Super +
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Pemeriksaan menyeluruh pada sistem trading kuantitatif XAUUSD AGI. Kami telah mengidentifikasi 18 kelemahan matematis,
              kebocoran lookahead bias, dan risiko konkurensi SQLite, kemudian merekonstruksinya menjadi sistem berkinerja tinggi institusional.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToSimulator}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm"
            >
              Uji Coba Live Terminal
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Status Kode Awal</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-lg font-bold text-rose-400">Grade B- (Raw)</div>
            <div className="text-xs text-slate-500">6 Bug Kritis & 7 Flaw Arsitektur</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Target Selesai</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-lg font-bold text-purple-300">Grade A Super +</div>
            <div className="text-xs text-slate-500">Institutional Hedge-Fund Ready</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Sistem Lot Sizing</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-emerald-300">4-Tier Dynamic (0.5x - 3.0x)</div>
            <div className="text-xs text-slate-500">Kelly Sizing & Equity Protection</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Stabilitas Concurrency</span>
              <Database className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-lg font-bold text-cyan-300">WAL Mode + 15s Timeout</div>
            <div className="text-xs text-slate-500">Bebas Database Locking Crash</div>
          </div>
        </div>
      </section>

      {/* 4-Tier Target Grade System */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Arsitektur Target: Grade A, Grade A+++, dan Grade A Super +
            </h2>
            <p className="text-xs text-slate-400">
              Klasifikasi sinyal institusional berbasis Confluence, Validasi Struktur, dan Alokasi Lot Sizing Dinamis.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {GRADE_CRITERIA_MATRIX.map((item) => (
            <div
              key={item.grade}
              className={`p-5 rounded-xl border bg-slate-900/40 flex flex-col justify-between space-y-4 ${item.statusColor}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold tracking-tight">{item.grade}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/40 border border-current">
                    Score {item.scoreRange}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-300">{item.subtitle}</div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Lot Multiplier:</span>
                  <span className="font-mono font-bold text-white">{item.lotMultiplier}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Risk per Trade:</span>
                  <span className="font-mono font-bold text-white">{item.equityRisk} equity</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Kriteria Eksekusi:</div>
                <ul className="text-xs space-y-1 text-slate-300">
                  {item.criteria.map((c, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400/80 shrink-0">·</span>
                      <span className="leading-tight">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vulnerabilities & Patches List */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Audit Mendalam: 18 Temuan Kelemahan & Perbaikan Kode
            </h2>
            <p className="text-xs text-slate-400">
              Analisa baris-demi-baris kode asli beserta solusi perbaikan Grade A Super +.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="Critical Math & Quant">Critical Math & Quant</option>
              <option value="Execution & Lookahead Bias">Execution & Lookahead Bias</option>
              <option value="Concurrency & Reliability">Concurrency & Reliability</option>
              <option value="Security & Feed Data">Security & Feed Data</option>
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Severity</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredVulnerabilities.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/60 transition-colors overflow-hidden"
              >
                {/* Header row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? '' : item.id)}
                  className="p-4 cursor-pointer flex items-center justify-between gap-4 select-none"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        item.severity === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : item.severity === 'HIGH'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.id}
                    </span>

                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-white">{item.title}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{item.category}</span>
                        <span>·</span>
                        <span className="text-amber-400 font-medium">{item.gradeTierRequired}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      {isExpanded ? 'Tutup Rincian' : 'Lihat Perbaikan'}
                    </span>
                    <span className="text-slate-500 font-mono text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-800/60 space-y-4 bg-slate-950/40">
                    <div className="pt-3 space-y-2">
                      <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Dampak Negatif Kode Asli:
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-lg">
                        {item.impact}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Original Code */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                          <span className="text-rose-300">❌ Kode Asli (Kelemahan & Bug):</span>
                        </div>
                        <pre className="p-3 rounded-lg bg-black/60 border border-rose-900/30 font-mono text-[11px] text-rose-200 overflow-x-auto leading-relaxed">
                          {item.originalCodeSnippet}
                        </pre>
                      </div>

                      {/* Patched Code */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-emerald-400 flex items-center justify-between">
                          <span className="text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Kode Perbaikan Grade A Super +:
                          </span>
                        </div>
                        <pre className="p-3 rounded-lg bg-black/60 border border-emerald-900/30 font-mono text-[11px] text-emerald-200 overflow-x-auto leading-relaxed">
                          {item.patchedCodeSnippet}
                        </pre>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
                      <div className="font-semibold text-amber-300">💡 Penjelasan Teknis & Solusi:</div>
                      <p className="leading-relaxed">{item.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Institutional Takeaways */}
      <section className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Rangkuman Peningkatan Kinerja & Efisiensi v32.0
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
          {AUDIT_SUMMARY.keyImprovements.map((imp, idx) => (
            <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                ✓
              </span>
              <span>{imp}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
