import React, { useState } from 'react';
import { AppTab } from './Header';
import {
  X,
  Play,
  ArrowRight,
  ArrowLeft,
  Calendar,
  ShieldAlert,
  TrendingUp,
  Scale,
  History,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface DemoWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: AppTab) => void;
  onSetRequestedDate?: (date: string) => void;
}

interface WalkthroughStep {
  step: number;
  title: string;
  tabTarget: AppTab;
  tabLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  durationSeconds: number;
  highlightHeading: string;
  description: string;
  actionGuidance: string;
  keyRule: string;
  actionPrompt?: string;
  demoDatePreset?: string;
}

export const DemoWalkthroughModal: React.FC<DemoWalkthroughModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onSetRequestedDate,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  if (!isOpen) return null;

  const steps: WalkthroughStep[] = [
    {
      step: 1,
      title: 'Requested Date Validation & Rejection',
      tabTarget: 'data-truth',
      tabLabel: 'Data Truth Tab',
      icon: Calendar,
      durationSeconds: 12,
      highlightHeading: 'Rule V7: Strict Settlement Date Alignment',
      description:
        'When an auditor or trader requests a target settlement date (e.g., "02/10/2026"), SpreadTruth scans every row in the uploaded Bhavcopy files. If any row contains a divergent trading date (e.g., "01 Oct 2026"), the entire dataset is flagged with a high-visibility red "DATE MISMATCH: file rejected" banner, exposing the exact first offending row.',
      actionGuidance:
        'Navigate to the Data Truth tab, enter "02/10/2026" into the Requested Date input against an 01 Oct 2026 file, and observe the immediate rejection state.',
      keyRule: 'V7: If any row differs from requested date -> DATA INVALID with immediate rejection notice.',
      actionPrompt: 'Set Requested Date to 02/10/2026',
      demoDatePreset: '02/10/2026',
    },
    {
      step: 2,
      title: 'The Quarantine Ledger & Data Sanitization',
      tabTarget: 'data-truth',
      tabLabel: 'Data Truth Tab',
      icon: ShieldAlert,
      durationSeconds: 12,
      highlightHeading: 'Rules V2 & V3: Non-Silent Data Quarantine',
      description:
        'SpreadTruth strictly rejects silent data alterations. Rows with duplicate contract-days (V2) or Close prices outside [Low, High] (V3) are placed in the permanent Quarantine Ledger. Quarantined records are isolated and completely purged from downstream pricing pipelines, while flagged rows (V4, V5, V6) remain visible with annotations. The full ledger is downloadable as a timestamped audit CSV.',
      actionGuidance:
        'Expand the Quarantine Ledger on the Data Truth tab to inspect audit details, check types, source filenames, and reasons.',
      keyRule: 'Quarantined rows are permanently isolated from pricing calculations and exported with audit trails.',
    },
    {
      step: 3,
      title: 'Spread Dynamics & Tender Window Cliff',
      tabTarget: 'spread-lifecycle',
      tabLabel: 'Spread & Lifecycle Tab',
      icon: TrendingUp,
      durationSeconds: 12,
      highlightHeading: 'Normalized 999 Gaps & Physical Tender Cliff',
      description:
        'For matched contract expiries, SpreadTruth computes pure 999-purity normalized price gaps in ₹/g between GOLDTEN, GOLDGUINEA, and GOLDPETAL. The interactive chart highlights the mandatory MCX physical tender window in shaded gold (last 3 trading days for expiries >= 2026; 5 days prior) and marks the last pre-tender day where open interest collapses as traders roll positions.',
      actionGuidance:
        'Select pair TEN-GUINEA and an expiry (e.g., 30SEP2026) to view median liquid gaps, the pre-tender rollover drop, and final settlement convergence.',
      keyRule: 'Spread gap = price_999_per_g(A) - price_999_per_g(B). Liquid day requires >= 5 kg volume on all 3 legs.',
    },
    {
      step: 4,
      title: 'Verdict & Cost Waterfall',
      tabTarget: 'verdict',
      tabLabel: 'Verdict Tab',
      icon: Scale,
      durationSeconds: 12,
      highlightHeading: 'Causal Pre-Committed Gates & Frictional Waterfall',
      description:
        'The decision engine operates on strict causal boundaries (t <= T). It scans 5 deterministic gates: lookback >= 20 days, zero quarantines on date or inside lookback window, liquid volume (>= 5 kg), outside tender window and pre-tender day, |z| >= 2.0, and gross edge >= 3x round-trip cost. The Cost Waterfall details exchange fees, stamp duty, CTT, SEBI, GST, brokerage, and slippage.',
      actionGuidance:
        'Review the high-contrast verdict badge (green TRADE, amber NO TRADE, red DATA INVALID) and test the "Slippage Stress x4" toggle to evaluate edge durability.',
      keyRule: 'Gross expected edge = |gap - trailing mean| * hedge grams. Must exceed 3x round-trip transaction costs.',
    },
    {
      step: 5,
      title: 'Backtest & Evidence with Placebo Range',
      tabTarget: 'backtest-evidence',
      tabLabel: 'Backtest & Evidence Tab',
      icon: History,
      durationSeconds: 12,
      highlightHeading: 'Rule A Next-Day Entry & 5,000-Draw Placebo Test',
      description:
        'Rule A executes at the next day\'s Open upon the first TRADE signal and exits at the last pre-tender Close. In-sample development expiries (Jul, Aug, Sep 2026) are strictly separated from unseen validation expiries. A seeded Monte Carlo Placebo test (seed 42, 5,000 draws) generates the empirical 5th–95th percentile distribution of random entries to confirm statistical edge.',
      actionGuidance:
        'Inspect the Backtest Execution Matrix, review the Placebo percentiles, check the Return on Capital with custom margin, and verify assumptions with the TinyFish Source Verifier.',
      keyRule: 'Development results are in-sample. Unseen expiries validate out-of-sample persistency without re-fitting.',
    },
  ];

  const current = steps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleJumpToTab = () => {
    onNavigateTab(current.tabTarget);
    if (current.demoDatePreset && onSetRequestedDate) {
      onSetRequestedDate(current.demoDatePreset);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1F2A44] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C98A1B] text-slate-950 flex items-center justify-center font-bold">
              <Play className="w-4 h-4 fill-slate-950" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                SpreadTruth Guided Walkthrough
              </h3>
              <p className="text-[11px] text-slate-300">
                60-Second Core Verification Tour · Step {current.step} of 5
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Dots */}
        <div className="px-6 pt-4 pb-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {steps.map((s, idx) => (
              <button
                key={s.step}
                onClick={() => setCurrentStepIndex(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  idx === currentStepIndex
                    ? 'bg-[#1F2A44] text-white shadow-xs'
                    : idx < currentStepIndex
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{s.step}</span>
                <span className="hidden sm:inline text-[10px]">
                  {idx === currentStepIndex ? s.title.split(' ')[0] : ''}
                </span>
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono font-semibold text-slate-500">
            ~{current.durationSeconds}s segment
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 flex-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#C98A1B] border border-amber-200 flex items-center justify-center shrink-0">
              <current.icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#C98A1B]">
                Feature Walkthrough #{current.step}
              </span>
              <h4 className="text-base font-bold text-[#1F2A44]">
                {current.title}
              </h4>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-900 block mb-1">
              {current.highlightHeading}
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              {current.description}
            </p>
          </div>

          <div className="space-y-2">
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Deterministic Rule Enforced:
              </span>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                {current.keyRule}
              </p>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-950 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-blue-900">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                How to Test This in SpreadTruth:
              </span>
              <p className="text-[11px] text-blue-900 leading-relaxed">
                {current.actionGuidance}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleJumpToTab}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-[#1F2A44] border border-slate-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Jump to {current.tabLabel}</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#C98A1B]" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="px-3 py-2 bg-white text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-2 bg-[#1F2A44] hover:bg-[#2d3b5e] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>{currentStepIndex === steps.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C98A1B]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
