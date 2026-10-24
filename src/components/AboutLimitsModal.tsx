import React from 'react';
import { X, ShieldAlert, CheckCircle2, Scale, Info, Database } from 'lucide-react';

interface AboutLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutLimitsModal: React.FC<AboutLimitsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#1F2A44] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#253252] border border-[#33446e] flex items-center justify-center text-[#C98A1B]">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                About SpreadTruth &amp; Methodological Limits
              </h3>
              <p className="text-xs text-slate-300">
                Team Quiet Edge · Hack in Hills &apos;26
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-5 text-xs text-slate-600">
          {/* Core Constitution */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F2A44] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Core Architecture &amp; Deterministic Principles
            </h4>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 leading-relaxed">
              <p>
                <strong>SpreadTruth</strong> is a browser-only quantitative verification and spread analysis engine for MCX precious metals futures (GOLDTEN, GOLDGUINEA, GOLDPETAL, and GOLDM).
              </p>
              <p>
                <strong>Zero AI Hallucination: </strong>Every single figure, spread, cost deduction, and verdict is computed strictly by deterministic TypeScript algorithms running entirely client-side. No artificial intelligence or language model ever produces or estimates financial numbers.
              </p>
              <p>
                <strong>Strict Causal Boundary ($t \le T$): </strong>Decisions evaluated on day $T$ never utilize data from day $T+1$ or later.
              </p>
            </div>
          </div>

          {/* Explicit Limitations List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F2A44] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#C98A1B]" />
              Known Limitations &amp; Real-World Execution Caveats
            </h4>
            <ul className="space-y-2">
              <li className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <strong className="text-slate-900 block mb-0.5">1. Settlement is not an executable price:</strong>
                Contracts exit at the last pre-tender day Close, which may represent an exchange-mandated settlement reference rather than executable limit-order liquidity on low-volume trading days.
              </li>
              <li className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <strong className="text-slate-900 block mb-0.5">2. Costs are assumptions:</strong>
                Exchange fees (0.0021%), stamp duties (0.002%), CTT (0.01%), SEBI fees (₹10/crore), and slippage buffers (₹0.50/g) are modeled based on standard regulatory and broker schedules. Verify with your clearing broker.
              </li>
              <li className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <strong className="text-slate-900 block mb-0.5">3. GOLDTEN history is short:</strong>
                MCX introduced GOLDTEN more recently than traditional contracts; statistical persistency across macroeconomic cycles requires ongoing observation across at least 10 expiries.
              </li>
              <li className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <strong className="text-slate-900 block mb-0.5">4. Tender rule applied by effective date:</strong>
                The 3-day tender period (effective from 2026-01-01; 5 days prior) is derived programmatically from chronological contract series rather than exchange circular publish dates.
              </li>
              <li className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <strong className="text-slate-900 block mb-0.5">5. GOLDM carry not modelled:</strong>
                GOLDM pairs have divergent monthly expiry dates (05th of month vs month-end) and purity standards (995 vs 999). A full multi-month carry financing model is reserved for future work.
              </li>
            </ul>
          </div>

          {/* Privacy & Security */}
          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-blue-950 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-blue-900">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              Local-First Data Privacy
            </span>
            <p className="text-[11px] leading-relaxed text-blue-900/80">
              All Bhavcopy files stay inside your local browser tab memory. No user files or trade data are ever transmitted to any backend server.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-400 font-mono text-[11px]">
            SpreadTruth · Production v2.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1F2A44] hover:bg-[#2d3b5e] text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
