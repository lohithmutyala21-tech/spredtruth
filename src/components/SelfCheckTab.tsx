import React from 'react';
import { AcceptanceCheckResult, CheckStatus } from '../utils/selfCheck';
import { CheckCircle2, XCircle, HelpCircle, Shield, ArrowRight, Upload } from 'lucide-react';

interface SelfCheckTabProps {
  checks: AcceptanceCheckResult[];
  onOpenUpload: () => void;
}

export const SelfCheckTab: React.FC<SelfCheckTabProps> = ({
  checks,
  onOpenUpload,
}) => {
  const allPassed = checks.length > 0 && checks.every((c) => c.overallStatus === 'PASS');
  const hasFailures = checks.some((c) => c.overallStatus === 'FAIL');
  const hasUnloaded = checks.some((c) => c.overallStatus === 'FILES_NOT_LOADED');

  const getStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            PASS
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-300 text-xs font-bold uppercase tracking-wider">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            FAIL
          </span>
        );
      case 'FILES_NOT_LOADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            FILES NOT LOADED
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div
        className={`p-6 rounded-2xl border shadow-sm transition-all ${
          allPassed
            ? 'bg-emerald-50/70 border-emerald-200'
            : hasFailures
            ? 'bg-rose-50/70 border-rose-200'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                allPassed
                  ? 'bg-emerald-600 text-white'
                  : hasFailures
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#1F2A44] text-white'
              }`}
            >
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-[#1F2A44]">
                  Acceptance Verification Suite
                </h2>
                {allPassed && getStatusBadge('PASS')}
                {hasFailures && getStatusBadge('FAIL')}
                {!allPassed && !hasFailures && getStatusBadge('FILES_NOT_LOADED')}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Deterministic validation against official acceptance criteria. Every value is computed strictly from uploaded Bhavcopy files.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasUnloaded && (
              <button
                onClick={onOpenUpload}
                className="px-4 py-2 bg-[#1F2A44] hover:bg-[#2d3b5e] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer inline-flex items-center gap-2 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-[#C98A1B]" />
                <span>Upload Bhavcopy CSVs</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Acceptance Checks Cards */}
      <div className="space-y-6">
        {checks.map((check, index) => (
          <div
            key={check.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
          >
            {/* Check Header */}
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-slate-500 uppercase">
                    Check #{index + 1}
                  </span>
                  <h3 className="text-base font-bold text-[#1F2A44]">{check.title}</h3>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                  {check.description}
                </p>
              </div>

              <div className="shrink-0">{getStatusBadge(check.overallStatus)}</div>
            </div>

            {/* Sub-check Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50/60 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left">Evaluation Target</th>
                    <th scope="col" className="px-6 py-3 text-right">Expected Value</th>
                    <th scope="col" className="px-6 py-3 text-right">Computed Value</th>
                    <th scope="col" className="px-6 py-3 text-center">Status</th>
                    <th scope="col" className="px-6 py-3 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {check.items.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3 font-semibold text-slate-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums text-slate-700">
                        {item.expected}
                      </td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        {item.computed}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-500">
                        {item.note || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card Footer Explanation */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-[#C98A1B]" />
                <span>{check.explanation}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
