import React from 'react';
import { Upload, RotateCcw, AlertTriangle, ShieldCheck, Database, CheckCircle2, Scale, TrendingUp, Gavel, History, Play, Info } from 'lucide-react';

export type AppTab = 'load-report' | 'data-truth' | 'contract-truth' | 'spread-lifecycle' | 'verdict' | 'backtest-evidence' | 'self-check';

interface HeaderProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  filesLoadedCount: number;
  anomaliesCount: number;
  quarantineCount: number;
  overallBadge?: 'DATA VALID' | 'DATA INVALID';
  onOpenUpload: () => void;
  onClearAll: () => void;
  onToggleAnomalies: () => void;
  onOpenDemo: () => void;
  onOpenAbout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  filesLoadedCount,
  anomaliesCount,
  quarantineCount,
  overallBadge,
  onOpenUpload,
  onClearAll,
  onToggleAnomalies,
  onOpenDemo,
  onOpenAbout,
}) => {
  return (
    <header className="bg-[#1F2A44] text-white border-b border-[#2d3b5e] sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-4">
          {/* Zone 1: Logo (44px tall, transparent, no badge box) followed by text "SpreadTruth" */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="/assets/aistudio/spreadtruth_logo_transparent_ce8a3ac3.png"
              alt="SpreadTruth Logo"
              className="h-[44px] w-auto object-contain bg-transparent"
            />
            <span className="text-xl font-bold tracking-tight text-white block">
              SpreadTruth
            </span>
          </div>

          {/* Zone 2: Navigation Tabs */}
          <nav className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              onClick={() => onSelectTab('load-report')}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'load-report'
                  ? 'bg-[#C98A1B] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-[#2d3b5e]'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Load Report</span>
            </button>

            <button
              onClick={() => onSelectTab('data-truth')}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'data-truth'
                  ? 'bg-[#C98A1B] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-[#2d3b5e]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Data Truth</span>
              {overallBadge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                    overallBadge === 'DATA VALID'
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/50'
                      : 'bg-rose-900/80 text-rose-200 border border-rose-500/60'
                  }`}
                >
                  {overallBadge === 'DATA VALID' ? 'VALID' : 'INVALID'}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('contract-truth')}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'contract-truth'
                  ? 'bg-[#C98A1B] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-[#2d3b5e]'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Contract Truth</span>
            </button>

            <button
              onClick={() => onSelectTab('spread-lifecycle')}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'spread-lifecycle'
                  ? 'bg-[#C98A1B] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-[#2d3b5e]'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Spread &amp; Lifecycle</span>
            </button>

            <button
              onClick={() => onSelectTab('verdict')}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'verdict'
                  ? 'bg-[#C98A1B] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-[#2d3b5e]'
              }`}
            >
              <Gavel className="w-4 h-4" />
              <span>Verdict</span>
            </button>

            <button
              onClick={() => onSelectTab('backtest-evidence')}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'backtest-evidence'
                  ? 'bg-[#C98A1B] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-[#2d3b5e]'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Backtest &amp; Evidence</span>
            </button>

            <button
              onClick={() => onSelectTab('self-check')}
              className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'self-check'
                  ? 'bg-[#C98A1B] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-[#2d3b5e]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Self-Check</span>
            </button>
          </nav>

          {/* Zone 3: Actions, Demo Walkthrough, About, & Indicators */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Demo Walkthrough Button */}
            <button
              onClick={onOpenDemo}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#C98A1B]/20 hover:bg-[#C98A1B]/30 text-amber-300 border border-[#C98A1B]/40 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Launch guided 60-second walkthrough tour"
            >
              <Play className="w-3.5 h-3.5 fill-[#C98A1B] text-[#C98A1B]" />
              <span className="hidden md:inline">Demo (60s)</span>
            </button>

            {/* About & Limits Button */}
            <button
              onClick={onOpenAbout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#253252] hover:bg-[#2d3b5e] text-slate-200 border border-[#33446e] text-xs font-semibold transition-colors cursor-pointer"
              title="View methodology, constitution, and known limitations"
            >
              <Info className="w-3.5 h-3.5 text-[#C98A1B]" />
              <span className="hidden lg:inline">About &amp; Limits</span>
            </button>

            {quarantineCount > 0 && (
              <span className="hidden sm:inline-block px-2 py-1 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold">
                {quarantineCount} Quarantined
              </span>
            )}

            {anomaliesCount > 0 && (
              <button
                onClick={onToggleAnomalies}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition-colors cursor-pointer"
                title={`${anomaliesCount} data issues flagged`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="tabular-nums">{anomaliesCount}</span>
              </button>
            )}

            {filesLoadedCount > 0 ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenUpload}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2d3b5e] hover:bg-[#384973] text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#C98A1B]" />
                  <span className="hidden sm:inline">Add CSVs</span>
                </button>
                <button
                  onClick={onClearAll}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 border border-rose-800 text-xs font-semibold transition-colors cursor-pointer"
                  title="Remove all loaded Bhavcopy data"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenUpload}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#C98A1B] hover:bg-[#e09f2b] text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Bhavcopy</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
