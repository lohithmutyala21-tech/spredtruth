import React, { useState } from 'react';
import { MergedDataset, ContractSummary } from '../types/bhavcopy';
import { PAIR_COMPARISON_SPECS, GOLD_CONTRACT_SPECS } from '../config/contracts';
import { Check, AlertTriangle, Scale, MapPin, Calendar, ShieldCheck, Filter } from 'lucide-react';

interface ContractTruthTabProps {
  dataset: MergedDataset;
  onOpenContractDetail?: (contract: ContractSummary) => void;
}

export const ContractTruthTab: React.FC<ContractTruthTabProps> = ({
  dataset,
  onOpenContractDetail,
}) => {
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');

  // Filter contracts
  const filteredContracts = dataset.contracts.filter((c) => {
    if (symbolFilter === 'ALL') return true;
    return c.symbol === symbolFilter;
  });

  const getQualityBadge = (quality: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (quality) {
      case 'HIGH':
        return (
          <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs uppercase tracking-wider">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs uppercase tracking-wider">
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs uppercase tracking-wider">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-5 h-5 text-[#C98A1B]" />
              <h2 className="text-xl font-bold text-[#1F2A44]">Contract Truth & Comparison Matrix</h2>
            </div>
            <p className="text-xs text-slate-600 max-w-3xl">
              Verified contract specifications, physical delivery centers, and basis evaluation for gold futures pairs. All numbers are computed strictly from validated, non-quarantined rows.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              {dataset.contracts.length} Contract-Expiries Loaded
            </span>
          </div>
        </div>
      </div>

      {/* 1. Comparison Quality Cards for Each Pair */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#1F2A44]">
              Pair Comparison-Quality Cards
            </h3>
            <p className="text-xs text-slate-500">
              Purity matching, expiry scheduling, and delivery location basis audit.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PAIR_COMPARISON_SPECS.map((pair) => (
            <div
              key={pair.pairKey}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:border-[#C98A1B]/40 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h4 className="font-bold text-sm text-[#1F2A44] font-mono">
                      {pair.name}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Key: {pair.pairKey}
                    </span>
                  </div>
                  <div>{getQualityBadge(pair.overallQuality)}</div>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* Purity Match */}
                  <div className="flex items-start gap-2 text-slate-700">
                    {pair.purityMatch ? (
                      <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                    ) : (
                      <span className="text-amber-600 font-bold mt-0.5">⚠</span>
                    )}
                    <div>
                      <span className="font-semibold text-slate-900">Purity: </span>
                      <span className="text-slate-600">{pair.purityDetail}</span>
                    </div>
                  </div>

                  {/* Expiry Match */}
                  <div className="flex items-start gap-2 text-slate-700">
                    {pair.expiryMatch ? (
                      <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                    ) : (
                      <span className="text-amber-600 font-bold mt-0.5">⚠</span>
                    )}
                    <div>
                      <span className="font-semibold text-slate-900">Expiry: </span>
                      <span className="text-slate-600">{pair.expiryDetail}</span>
                    </div>
                  </div>

                  {/* Delivery Location Match */}
                  <div className="flex items-start gap-2 text-slate-700">
                    {pair.locationMatch ? (
                      <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                    ) : (
                      <span className="text-amber-600 font-bold mt-0.5">⚠</span>
                    )}
                    <div>
                      <span className="font-semibold text-slate-900">Delivery Center: </span>
                      <span className="text-slate-600">{pair.locationDetail}</span>
                    </div>
                  </div>
                </div>
              </div>

              {pair.note && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 italic">
                  Note: {pair.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Table of Every Contract-Expiry Loaded */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#1F2A44]">
              Table of Every Contract-Expiry Loaded
            </h3>
            <p className="text-xs text-slate-500">
              Validated trading figures: Close, normalized Price 999/g, Volume (kg), and Open Interest (kg).
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {['ALL', 'GOLDM', 'GOLDTEN', 'GOLDGUINEA', 'GOLDPETAL'].map((sym) => (
              <button
                key={sym}
                onClick={() => setSymbolFilter(sym)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  symbolFilter === sym
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
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">Symbol</th>
                <th scope="col" className="px-6 py-3 text-left">Expiry</th>
                <th scope="col" className="px-6 py-3 text-left">Delivery Location</th>
                <th scope="col" className="px-6 py-3 text-right">Latest Close (₹)</th>
                <th scope="col" className="px-6 py-3 text-right font-bold text-[#1F2A44] bg-[#fef7eb]/60">
                  Price 999 / g (₹)
                </th>
                <th scope="col" className="px-6 py-3 text-right">Total Volume (kg)</th>
                <th scope="col" className="px-6 py-3 text-right">Latest OI (kg)</th>
                <th scope="col" className="px-6 py-3 text-right">Trading Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500 italic">
                    No contract expiries match the selected filter.
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
                      <td className="px-6 py-3.5 font-bold font-mono text-[#1F2A44] whitespace-nowrap">
                        {c.symbol}
                      </td>
                      <td className="px-6 py-3.5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {c.expiry}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{spec.deliveryLocation}</span>
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums text-slate-900 font-medium">
                        ₹{c.latestClose.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums font-bold text-[#1F2A44] bg-[#fef7eb]/30">
                        ₹{c.latestPrice999PerG.toFixed(1)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums text-slate-700">
                        {c.totalVolumeKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums text-slate-700">
                        {c.latestOiKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums font-semibold text-slate-800">
                        {c.tradingDaysCount}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
