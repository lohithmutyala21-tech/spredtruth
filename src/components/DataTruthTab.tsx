import React, { useState } from 'react';
import { MergedDataset } from '../types/bhavcopy';
import { DATA_TRUTH_THRESHOLDS } from '../config/contracts';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Download,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
  X,
  Layers,
} from 'lucide-react';

interface DataTruthTabProps {
  dataset: MergedDataset;
  requestedDate: string;
  onRequestedDateChange: (date: string) => void;
}

export const DataTruthTab: React.FC<DataTruthTabProps> = ({
  dataset,
  requestedDate,
  onRequestedDateChange,
}) => {
  const [isQuarantineLedgerOpen, setIsQuarantineLedgerOpen] = useState(true);
  const [isFlaggedLedgerOpen, setIsFlaggedLedgerOpen] = useState(false);
  const [contractFilter, setContractFilter] = useState('ALL');

  const {
    overallBadge,
    quarantinedRecords,
    flaggedRecords,
    truthSummariesByContract,
    duplicateContractWarnings,
    legsPerExpiry,
    dateMismatchReport,
  } = dataset;

  // Filter contract summaries
  const filteredSummaries = truthSummariesByContract.filter((c) => {
    if (contractFilter === 'ALL') return true;
    return c.symbol === contractFilter;
  });

  // Export Quarantine Ledger as CSV
  const handleExportQuarantineCSV = () => {
    if (quarantinedRecords.length === 0) return;

    const headers = ['Check', 'Check Label', 'File', 'Row Number', 'Date', 'Symbol', 'Expiry', 'Close (INR)', 'Detail', 'Action'];
    const rows = quarantinedRecords.map((q) => [
      `"${q.check}"`,
      `"${q.checkLabel}"`,
      `"${q.file}"`,
      `"${q.rowNumber || ''}"`,
      `"${q.date}"`,
      `"${q.symbol}"`,
      `"${q.expiry}"`,
      `"${q.closePrice || ''}"`,
      `"${q.detail.replace(/"/g, '""')}"`,
      `"${q.action}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SpreadTruth_Quarantine_Ledger_${Date.now()}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* 1. Master Truth Header & Badge */}
      <div
        className={`p-6 rounded-2xl border shadow-sm transition-all ${
          overallBadge === 'DATA VALID'
            ? 'bg-emerald-50/80 border-emerald-300'
            : 'bg-rose-50/90 border-rose-300'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                overallBadge === 'DATA VALID'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}
            >
              {overallBadge === 'DATA VALID' ? (
                <ShieldCheck className="w-8 h-8" />
              ) : (
                <ShieldAlert className="w-8 h-8" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-500">
                  Data Truth Protocol
                </span>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-bold tracking-wider uppercase ${
                    overallBadge === 'DATA VALID'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white shadow-sm'
                  }`}
                >
                  {overallBadge}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#1F2A44] mt-0.5">
                {overallBadge === 'DATA VALID'
                  ? 'Zero Quarantine Invariants Violated — All Active Rows Validated'
                  : 'Data Integrity Alert: Quarantined Rows or Date Mismatch Detected'}
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                Quarantined rows are permanently excised from subsequent pricing and spread analysis.
                Flagged rows (settlement-only, previous close diffs, thin jumps) remain in the dataset with active audit markings.
              </p>
            </div>
          </div>

          {/* Requested Date Input */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs min-w-[280px]">
            <label className="text-xs font-bold text-[#1F2A44] flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-4 h-4 text-[#C98A1B]" />
              <span>Requested Date (Optional):</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. 02/10/2026 or 01 Oct 2026"
                value={requestedDate}
                onChange={(e) => onRequestedDateChange(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C98A1B]"
              />
              {requestedDate && (
                <button
                  type="button"
                  onClick={() => onRequestedDateChange('')}
                  className="text-xs text-slate-400 hover:text-slate-700 px-1.5 py-1"
                  title="Clear requested date"
                >
                  &times;
                </button>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Enforces single-date match across all parsed files.
            </div>
          </div>
        </div>
      </div>

      {/* 2. V7 DATE MISMATCH BANNER (Required when date mismatch occurs) */}
      {dateMismatchReport.hasMismatch && dateMismatchReport.firstOffendingRow && (
        <div className="p-5 rounded-xl bg-rose-600 text-white shadow-md border border-rose-700 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-white shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm bg-white/20 px-2 py-0.5 rounded">
                  V7 CHECK TRIGGERED
                </span>
                <h3 className="text-base font-bold tracking-tight">
                  DATE MISMATCH: file rejected
                </h3>
              </div>
              <p className="text-xs text-rose-100 mt-1">
                Requested Date: <strong className="text-white font-mono">{dateMismatchReport.requestedDate}</strong>{' '}
                (normalized: <strong className="text-white font-mono">{dateMismatchReport.normalizedRequestedDate}</strong>) does not match rows in uploaded files.
              </p>

              <div className="mt-3 bg-black/20 p-3 rounded-lg text-xs font-mono text-rose-50 border border-white/10 space-y-1">
                <div className="font-bold text-white uppercase text-[11px] tracking-wider mb-1">
                  First Offending Row:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>File: <span className="text-white font-semibold">{dateMismatchReport.firstOffendingRow.fileName}</span></div>
                  <div>Row #: <span className="text-white font-semibold">{dateMismatchReport.firstOffendingRow.rowNumber || 'N/A'}</span></div>
                  <div>Row Date: <span className="text-amber-300 font-bold">{dateMismatchReport.firstOffendingRow.rowDate}</span></div>
                  <div>Symbol: <span className="text-white font-semibold">{dateMismatchReport.firstOffendingRow.symbol}</span></div>
                  <div>Expiry: <span className="text-white font-semibold">{dateMismatchReport.firstOffendingRow.expiry}</span></div>
                  <div>Close: <span className="text-white font-semibold">₹{dateMismatchReport.firstOffendingRow.close}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Duplicate Contracts Warning (Requirement 4) */}
      {duplicateContractWarnings.length > 0 && (
        <div className="p-5 rounded-xl bg-amber-50 border border-amber-300 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Warning: Same Symbol + Expiry Present in Multiple Files
              </h3>
              <p className="text-xs text-amber-800 mt-0.5 mb-2">
                The following contracts appear in more than one uploaded file. Conflicting or duplicate rows are quarantined, keeping the first occurrence.
              </p>
              <div className="space-y-1.5">
                {duplicateContractWarnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="text-xs bg-white p-2 rounded-lg border border-amber-200 text-slate-800 flex items-center justify-between"
                  >
                    <span className="font-mono font-bold text-[#1F2A44]">
                      {w.symbol} {w.expiry}
                    </span>
                    <span className="text-slate-600">
                      Found in: <strong className="text-amber-900">{w.fileNames.join(', ')}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Legs per Expiry Table & Active Thresholds Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Legs Per Expiry Table (Requirement 4) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#C98A1B]" />
              <h3 className="text-sm font-bold text-[#1F2A44]">Legs per Expiry</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Tracking GOLDTEN, GOLDGUINEA, GOLDPETAL
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3 text-left">Expiry</th>
                  <th className="px-5 py-3 text-center">GOLDTEN</th>
                  <th className="px-5 py-3 text-center">GOLDGUINEA</th>
                  <th className="px-5 py-3 text-center">GOLDPETAL</th>
                  <th className="px-5 py-3 text-left">Status / Missing Legs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {legsPerExpiry.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-slate-500 italic">
                      No expiries loaded.
                    </td>
                  </tr>
                ) : (
                  legsPerExpiry.map((item) => {
                    const isComplete = item.missingLegs.length === 0;
                    return (
                      <tr key={item.expiry} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-mono font-bold text-[#1F2A44]">
                          {item.expiry}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {item.legs.GOLDTEN ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Loaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <X className="w-3.5 h-3.5 text-slate-400" /> Missing
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {item.legs.GOLDGUINEA ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Loaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <X className="w-3.5 h-3.5 text-slate-400" /> Missing
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {item.legs.GOLDPETAL ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Loaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <X className="w-3.5 h-3.5 text-slate-400" /> Missing
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {isComplete ? (
                            <span className="text-emerald-700 font-semibold">
                              All 3 legs active
                            </span>
                          ) : (
                            <span className="text-amber-700">
                              Missing: <strong className="font-mono">{item.missingLegs.join(', ')}</strong>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Validation Invariants Reference Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1F2A44]">Validation Invariants</h3>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Config Active
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="font-mono font-bold text-slate-800">V1 Symbol Trim</span>: Trailing spaces trimmed & counted (Info only).
            </div>
            <div className="p-2 bg-rose-50/70 rounded border border-rose-200">
              <span className="font-mono font-bold text-rose-800">V2 Duplicate Day</span>: Quarantine duplicates; keep first.
            </div>
            <div className="p-2 bg-rose-50/70 rounded border border-rose-200">
              <span className="font-mono font-bold text-rose-800">V3 Close [L, H]</span>: Quarantine if Close &lt; Low or Close &gt; High.
            </div>
            <div className="p-2 bg-amber-50/70 rounded border border-amber-200">
              <span className="font-mono font-bold text-amber-800">V4 Prev Close</span>: Flag if PrevClose &ne; prior day Close.
            </div>
            <div className="p-2 bg-amber-50/70 rounded border border-amber-200">
              <span className="font-mono font-bold text-amber-800">V5 Zero Volume</span>: Flag settlement-only execution.
            </div>
            <div className="p-2 bg-amber-50/70 rounded border border-amber-200">
              <span className="font-mono font-bold text-amber-800">V6 Thin-Day Jump</span>: Flag if |&Delta;Close| &gt;{' '}
              <strong className="font-mono">{DATA_TRUTH_THRESHOLDS.JUMP_PCT}%</strong> AND Vol &lt;{' '}
              <strong className="font-mono">{DATA_TRUTH_THRESHOLDS.THIN_LOTS}</strong> lots.
            </div>
          </div>
        </div>
      </div>

      {/* 5. Check Counts Per Contract (Symbol + Expiry) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#1F2A44]">
              Data Truth Check Counts per Contract
            </h3>
            <p className="text-xs text-slate-500">
              Contract breakdown for V1 through V6. Quarantines excise rows; flags preserve rows for audit.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {['ALL', 'GOLDM', 'GOLDTEN', 'GOLDGUINEA', 'GOLDPETAL'].map((sym) => (
              <button
                key={sym}
                onClick={() => setContractFilter(sym)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  contractFilter === sym
                    ? 'bg-white text-[#1F2A44] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3 text-left">Symbol</th>
                <th className="px-5 py-3 text-left">Expiry</th>
                <th className="px-5 py-3 text-right">Rows</th>
                <th className="px-5 py-3 text-right">V1 (Trim)</th>
                <th className="px-5 py-3 text-right text-rose-700 font-bold bg-rose-50/40">
                  V2 (Dup)
                </th>
                <th className="px-5 py-3 text-right text-rose-700 font-bold bg-rose-50/40">
                  V3 (L/H)
                </th>
                <th className="px-5 py-3 text-right text-amber-700 font-bold bg-amber-50/40">
                  V4 (PrevClose)
                </th>
                <th className="px-5 py-3 text-right text-amber-700 font-bold bg-amber-50/40">
                  V5 (ZeroVol)
                </th>
                <th className="px-5 py-3 text-right text-amber-700 font-bold bg-amber-50/40">
                  V6 (ThinJump)
                </th>
                <th className="px-5 py-3 text-right font-bold text-rose-800 bg-rose-100/50">
                  Total Quarantined
                </th>
                <th className="px-5 py-3 text-right font-bold text-amber-800 bg-amber-100/50">
                  Total Flagged
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-8 text-center text-slate-500 italic">
                    No contract records available for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((c) => (
                  <tr key={c.contractKey} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-[#1F2A44]">
                      {c.symbol}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-800">
                      {c.expiry}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-900 font-semibold">
                      {c.totalRows}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-600">
                      {c.v1Count}
                    </td>
                    <td className={`px-5 py-3 text-right font-mono tabular-nums font-bold ${c.v2Count > 0 ? 'text-rose-700 bg-rose-50/70' : 'text-slate-400'}`}>
                      {c.v2Count}
                    </td>
                    <td className={`px-5 py-3 text-right font-mono tabular-nums font-bold ${c.v3Count > 0 ? 'text-rose-700 bg-rose-50/70' : 'text-slate-400'}`}>
                      {c.v3Count}
                    </td>
                    <td className={`px-5 py-3 text-right font-mono tabular-nums font-semibold ${c.v4Count > 0 ? 'text-amber-800 bg-amber-50/70' : 'text-slate-400'}`}>
                      {c.v4Count}
                    </td>
                    <td className={`px-5 py-3 text-right font-mono tabular-nums font-semibold ${c.v5Count > 0 ? 'text-amber-800 bg-amber-50/70' : 'text-slate-400'}`}>
                      {c.v5Count}
                    </td>
                    <td className={`px-5 py-3 text-right font-mono tabular-nums font-semibold ${c.v6Count > 0 ? 'text-amber-800 bg-amber-50/70' : 'text-slate-400'}`}>
                      {c.v6Count}
                    </td>
                    <td className={`px-5 py-3 text-right font-mono tabular-nums font-bold ${c.totalQuarantined > 0 ? 'text-rose-700 bg-rose-100/60' : 'text-slate-400'}`}>
                      {c.totalQuarantined}
                    </td>
                    <td className={`px-5 py-3 text-right font-mono tabular-nums font-bold ${c.totalFlagged > 0 ? 'text-amber-800 bg-amber-100/60' : 'text-slate-400'}`}>
                      {c.totalFlagged}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Expandable Quarantine Ledger (CSV Download) */}
      <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-rose-50/50 border-b border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsQuarantineLedgerOpen(!isQuarantineLedgerOpen)}
              className="flex items-center gap-2 text-left cursor-pointer"
            >
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <div>
                <h3 className="text-base font-bold text-[#1F2A44] flex items-center gap-2">
                  <span>Quarantine Ledger</span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    {quarantinedRecords.length} record{quarantinedRecords.length === 1 ? '' : 's'}
                  </span>
                </h3>
                <span className="text-xs text-slate-500">
                  Strictly excised from subsequent calculations (V2 duplicate or V3 out of bounds).
                </span>
              </div>
              {isQuarantineLedgerOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportQuarantineCSV}
              disabled={quarantinedRecords.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Quarantine Ledger (CSV)</span>
            </button>
          </div>
        </div>

        {isQuarantineLedgerOpen && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3 text-left">Check</th>
                  <th className="px-5 py-3 text-left">File Name</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Symbol</th>
                  <th className="px-5 py-3 text-left">Expiry</th>
                  <th className="px-5 py-3 text-left">Detail</th>
                  <th className="px-5 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {quarantinedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-500 italic">
                      Zero quarantined records. All rows satisfied range and uniqueness invariants.
                    </td>
                  </tr>
                ) : (
                  quarantinedRecords.map((q) => (
                    <tr key={q.id} className="hover:bg-rose-50/40 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-rose-700">
                        {q.check}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-xs">{q.file}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-700">{q.date}</td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-900">{q.symbol}</td>
                      <td className="px-5 py-3 font-mono text-slate-700">{q.expiry}</td>
                      <td className="px-5 py-3 text-slate-700">{q.detail}</td>
                      <td className="px-5 py-3 font-semibold text-rose-700 whitespace-nowrap">
                        {q.action}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Expandable Flagged Ledger (V4, V5, V6) */}
      <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-amber-50/40 border-b border-amber-200 flex items-center justify-between">
          <button
            onClick={() => setIsFlaggedLedgerOpen(!isFlaggedLedgerOpen)}
            className="flex items-center gap-2 text-left cursor-pointer"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-base font-bold text-[#1F2A44] flex items-center gap-2">
                <span>Flagged Rows Ledger (Kept for Analysis)</span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  {flaggedRecords.length} flag{flaggedRecords.length === 1 ? '' : 's'}
                </span>
              </h3>
              <span className="text-xs text-slate-500">
                Audited anomalies retained in calculations: V4 previous close discrepancy, V5 zero-volume settlement, V6 thin-day jump.
              </span>
            </div>
            {isFlaggedLedgerOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>

        {isFlaggedLedgerOpen && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3 text-left">Check</th>
                  <th className="px-5 py-3 text-left">File Name</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Symbol</th>
                  <th className="px-5 py-3 text-left">Expiry</th>
                  <th className="px-5 py-3 text-left">Detail</th>
                  <th className="px-5 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {flaggedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-500 italic">
                      Zero flagged records in active contract rows.
                    </td>
                  </tr>
                ) : (
                  flaggedRecords.map((f) => (
                    <tr key={f.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-amber-800">
                        {f.check}
                      </td>
                      <td className="px-5 py-3 text-slate-700 font-medium">
                        {f.file}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-700">{f.date}</td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-900">{f.symbol}</td>
                      <td className="px-5 py-3 font-mono text-slate-700">{f.expiry}</td>
                      <td className="px-5 py-3 text-slate-800">{f.detail}</td>
                      <td className="px-5 py-3 text-amber-800 font-semibold whitespace-nowrap">
                        {f.action}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
