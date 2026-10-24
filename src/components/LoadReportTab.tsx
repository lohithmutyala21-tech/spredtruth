import React, { useState } from 'react';
import { MergedDataset, ContractSummary } from '../types/bhavcopy';
import { GOLD_CONTRACT_SPECS } from '../config/contracts';
import { FileText, Database, Filter, Scissors, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface LoadReportTabProps {
  dataset: MergedDataset;
  onOpenContractDetail?: (contract: ContractSummary) => void;
}

export const LoadReportTab: React.FC<LoadReportTabProps> = ({ dataset, onOpenContractDetail }) => {
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);

  const filteredContracts = dataset.contracts.filter((c) => {
    if (symbolFilter !== 'ALL' && c.symbol !== symbolFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.symbol.toLowerCase().includes(q) ||
        c.expiry.toLowerCase().includes(q) ||
        c.firstDate.toLowerCase().includes(q) ||
        c.lastDate.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* 1. Executive Summary Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase">Files Loaded</span>
            <FileText className="w-4 h-4 text-[#1F2A44]" />
          </div>
          <div className="text-2xl font-bold text-[#1F2A44] tabular-nums">
            {dataset.totalFiles}
          </div>
          <div className="text-xs text-slate-500 mt-1">Multi-file merge active</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase">Total Rows Parsed</span>
            <Database className="w-4 h-4 text-[#1F2A44]" />
          </div>
          <div className="text-2xl font-bold text-[#1F2A44] tabular-nums">
            {dataset.totalRows.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">Raw Bhavcopy lines</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase">Rows Trimmed</span>
            <Scissors className="w-4 h-4 text-[#C98A1B]" />
          </div>
          <div className="text-2xl font-bold text-[#C98A1B] tabular-nums">
            {dataset.totalRowsTrimmed.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">Padded symbol spaces trimmed</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase">Rows Ignored</span>
            <Filter className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-600 tabular-nums">
            {dataset.totalRowsIgnored.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">Non-gold / non-FUTCOM</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#C98A1B]/30 bg-gradient-to-br from-white to-[#fef7eb] shadow-sm">
          <div className="flex items-center justify-between text-[#C98A1B] mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase">Gold Rows Kept</span>
            <CheckCircle className="w-4 h-4 text-[#C98A1B]" />
          </div>
          <div className="text-2xl font-bold text-[#1F2A44] tabular-nums">
            {dataset.totalGoldRows.toLocaleString()}
          </div>
          <div className="text-xs text-slate-600 mt-1">Unique contract-days: {dataset.contractDaysMap.size}</div>
        </div>
      </div>

      {/* 2. Loaded Files Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#1F2A44]">Loaded Files Audit</h3>
            <p className="text-xs text-slate-500">
              Dates are detected strictly from file contents; file names are never used as data.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
            {dataset.files.length} file{dataset.files.length > 1 ? 's' : ''} in memory
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">File Name</th>
                <th scope="col" className="px-6 py-3 text-left">Detected Trading Date(s)</th>
                <th scope="col" className="px-6 py-3 text-right">Total Rows</th>
                <th scope="col" className="px-6 py-3 text-right">Rows Trimmed</th>
                <th scope="col" className="px-6 py-3 text-right">Gold Rows Kept</th>
                <th scope="col" className="px-6 py-3 text-right">Rows Ignored</th>
                <th scope="col" className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {dataset.files.map((f) => (
                <React.Fragment key={f.id}>
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate max-w-xs">{f.fileName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {f.detectedDates.length === 0 ? (
                        <span className="text-slate-400 italic">None detected</span>
                      ) : f.detectedDates.length <= 2 ? (
                        <span className="font-semibold text-slate-800">
                          {f.detectedDates.join(', ')}
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-800">
                          {f.detectedDates[0]} ... {f.detectedDates[f.detectedDates.length - 1]} ({f.detectedDates.length} days)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono tabular-nums text-slate-900 font-medium">
                      {f.totalRows.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono tabular-nums text-[#C98A1B] font-semibold">
                      {f.rowsTrimmed.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono tabular-nums text-emerald-700 font-bold">
                      {f.goldRowsKept.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono tabular-nums text-slate-500">
                      {f.ignoredRows.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <button
                        onClick={() => setExpandedFileId(expandedFileId === f.id ? null : f.id)}
                        className="text-xs text-slate-600 hover:text-[#1F2A44] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Details</span>
                        {expandedFileId === f.id ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedFileId === f.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="text-xs space-y-2">
                          <div className="font-bold text-[#1F2A44]">Contracts Breakdown in {f.fileName}:</div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {Object.entries(f.symbolExpiryCounts)
                              .filter(([k]) => k.startsWith('GOLD'))
                              .map(([symExp, count]) => (
                                <div key={symExp} className="bg-white p-2 rounded border border-slate-200">
                                  <span className="font-mono font-semibold text-slate-800">{symExp}</span>
                                  <span className="block text-slate-500 tabular-nums">{count} row{count > 1 ? 's' : ''}</span>
                                </div>
                              ))}
                          </div>
                          {f.anomalies.length > 0 && (
                            <div className="mt-2 text-rose-700">
                              <span className="font-bold">Anomalies ({f.anomalies.length}):</span>
                              <ul className="list-disc pl-5 mt-1 space-y-1">
                                {f.anomalies.slice(0, 5).map((a, i) => (
                                  <li key={i}>{a.message}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Table of Contracts Found */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[#1F2A44]">Table of Gold Contracts Found</h3>
            <p className="text-xs text-slate-500">
              Aggregated across all uploaded Bhavcopies. Key: (Date, Symbol, Expiry).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter segmented buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {['ALL', 'GOLDM', 'GOLDTEN', 'GOLDGUINEA', 'GOLDPETAL'].map((sym) => (
                <button
                  key={sym}
                  onClick={() => setSymbolFilter(sym)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    symbolFilter === sym
                      ? 'bg-white text-[#1F2A44] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search expiry or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C98A1B]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">Symbol</th>
                <th scope="col" className="px-6 py-3 text-left">Expiry</th>
                <th scope="col" className="px-6 py-3 text-right">Trading Days</th>
                <th scope="col" className="px-6 py-3 text-left">Date Range</th>
                <th scope="col" className="px-6 py-3 text-right">Latest Close (₹)</th>
                <th scope="col" className="px-6 py-3 text-right bg-[#fef7eb]/60 text-[#C98A1B]">
                  Price 999 / g (₹)
                </th>
                <th scope="col" className="px-6 py-3 text-right">Total Vol (kg)</th>
                <th scope="col" className="px-6 py-3 text-right">Latest OI (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 italic">
                    No contracts matched the selected filters.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c) => {
                  const spec = GOLD_CONTRACT_SPECS[c.symbol];
                  return (
                    <tr
                      key={c.contractKey}
                      onClick={() => onOpenContractDetail && onOpenContractDetail(c)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-3.5 font-bold text-[#1F2A44] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{c.symbol}</span>
                          <span className="text-[11px] text-slate-500 font-normal">
                            ({spec.lotGrams}g, {spec.purity})
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {c.expiry}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {c.tradingDaysCount}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                        {c.firstDate === c.lastDate ? (
                          <span>{c.lastDate}</span>
                        ) : (
                          <span>
                            {c.firstDate} &rarr; {c.lastDate}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums text-slate-900 font-medium">
                        ₹{c.latestClose.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums font-bold text-[#1F2A44] bg-[#fef7eb]/40">
                        ₹{c.latestPrice999PerG.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums text-slate-700">
                        {c.totalVolumeKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums text-slate-700">
                        {c.latestOiKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Contract Configuration Table (Audit Trail) */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h4 className="text-sm font-bold text-[#1F2A44] mb-1">Contract Specifications Reference (Code-Configured)</h4>
        <p className="text-xs text-slate-500 mb-4">
          Strict mathematical parameters applied to Bhavcopy quotes: <code className="font-mono text-[#C98A1B]">price_999_per_g = Close / quoteBaseGrams &times; 999 / purity</code>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(GOLD_CONTRACT_SPECS).map((spec) => (
            <div key={spec.symbol} className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between font-mono font-bold text-[#1F2A44] text-sm mb-1">
                <span>{spec.symbol}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-[#C98A1B] border border-amber-200 font-sans">
                  {spec.purity} Purity
                </span>
              </div>
              <div className="text-xs text-slate-500 mb-3">{spec.name}</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Lot Size:</span>
                  <span className="font-mono font-semibold text-slate-900">{spec.lotGrams} grams</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Quote Base:</span>
                  <span className="font-mono font-semibold text-slate-900">{spec.quoteBaseGrams} grams</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Purity Multiplier:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {(999 / spec.purity).toFixed(6)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
