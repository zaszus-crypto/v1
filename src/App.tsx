import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { AuditReportView } from './components/AuditReportView';
import { LiveEngineTerminal } from './components/LiveEngineTerminal';
import { BacktestLab } from './components/BacktestLab';
import { CodeInspector } from './components/CodeInspector';
import { TelegramSimulatorModal } from './components/TelegramSimulatorModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'audit' | 'simulator' | 'backtest' | 'code'>('audit');
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/20 selection:text-amber-200">
      {/* Institutional Top Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenTelegramPreview={() => setIsTelegramModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'audit' && (
          <AuditReportView onNavigateToSimulator={() => setActiveTab('simulator')} />
        )}
        {activeTab === 'simulator' && (
          <LiveEngineTerminal onOpenTelegramPreview={() => setIsTelegramModalOpen(true)} />
        )}
        {activeTab === 'backtest' && <BacktestLab />}
        {activeTab === 'code' && <CodeInspector />}
      </main>

      {/* Telegram Message Preview Modal */}
      <TelegramSimulatorModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />

      {/* Footer following Anti-Slop Guidelines (Quiet copyright & actionable links) */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">XAUUSD AGI Quant Engine Studio</span>
            <span>·</span>
            <span>Enterprise Grade A Super +</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setActiveTab('audit')}
              className="hover:text-amber-300 transition-colors"
            >
              Audit Report
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className="hover:text-amber-300 transition-colors"
            >
              Terminal
            </button>
            <button
              onClick={() => setActiveTab('backtest')}
              className="hover:text-amber-300 transition-colors"
            >
              Backtest Lab
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className="hover:text-amber-300 transition-colors"
            >
              Python Code
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
