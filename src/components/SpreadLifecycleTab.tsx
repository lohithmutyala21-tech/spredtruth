import React, { useState, useMemo } from 'react';
import { MergedDataset, ContractSummary } from '../types/bhavcopy';
import { SPREAD_CONFIG } from '../config/contracts';
import {
  computeSpreadsDataset,
  computeContractLifecycle,
  ExpirySpreadSummary,
} from '../utils/spreadCalculator';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  Calendar,
  Layers,
  Activity,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface SpreadLifecycleTabProps {
  dataset: MergedDataset;
}

export const SpreadLifecycleTab: React.FC<SpreadLifecycleTabProps> = ({ dataset }) => {
  // Compute Spreads using strictly active, validated rows
  const spreadResult = useMemo(() => {
    return computeSpreadsDataset(dataset.allGoldRows);
  }, [dataset.allGoldRows]);

  const { validSummaries, skippedExpiries, totalExpiriesLoaded, persistentEdgeWarning } = spreadResult;

  // Selected expiry for spread chart
  const [selectedExpiry, setSelectedExpiry] = useState<string>(
    validSummaries.length > 0 ? validSummaries[0].expiry : ''
  );

  // Selected pair for spread chart
  const [selectedPair, setSelectedPair] = useState<'TEN-GUINEA' | 'PETAL-GUINEA' | 'TEN-PETAL'>(
    'TEN-GUINEA'
  );

  // Selected contract for lifecycle panel
  const [selectedLifecycleKey, setSelectedLifecycleKey] = useState<string>(
    dataset.contracts.length > 0 ? dataset.contracts[0].contractKey : ''
  );

  // Find summary for selected expiry
  const currentExpirySummary = useMemo(() => {
    return validSummaries.find((s) => s.expiry === selectedExpiry) || validSummaries[0] || null;
  }, [validSummaries, selectedExpiry]);

  // Find contract for lifecycle panel
  const currentLifecycleContract = useMemo(() => {
    return dataset.contracts.find((c) => c.contractKey === selectedLifecycleKey) || dataset.contracts[0] || null;
  }, [dataset.contracts, selectedLifecycleKey]);

  // Compute detailed lifecycle statistics
  const lifecycleAnalysis = useMemo(() => {
    if (!currentLifecycleContract) return null;
    return computeContractLifecycle(currentLifecycleContract);
  }, [currentLifecycleContract]);

  // Chart data for spread gap by date
  const spreadChartData = useMemo(() => {
    if (!currentExpirySummary) return [];
    return currentExpirySummary.matchedDays.map((d) => {
      let gap = 0;
      if (selectedPair === 'TEN-GUINEA') gap = d.gapTenGuinea;
      else if (selectedPair === 'PETAL-GUINEA') gap = d.gapPetalGuinea;
      else if (selectedPair === 'TEN-PETAL') gap = d.gapTenPetal;

      return {
        date: d.date,
        isoDate: d.isoDate,
        gap: Number(gap.toFixed(1)),
        isLiquid: d.isLiquid,
        isTenderWindow: d.isTenderWindow,
        isLastPreTenderDay: d.isLastPreTenderDay,
      };
    });
  }, [currentExpirySummary, selectedPair]);

  // Lifecycle chart data (volume_kg & oi_kg over contract life)
  const lifecycleChartData = useMemo(() => {
    if (!lifecycleAnalysis) return [];
    return lifecycleAnalysis.history.map((r) => ({
      date: r.date,
      isoDate: r.isoDate,
      volume_kg: Number(r.volume_kg.toFixed(3)),
      oi_kg: Number(r.oi_kg.toFixed(3)),
      volumeLots: r.volumeLots,
      openInterestLots: r.openInterestLots,
      close: r.close,
      isTenderWindow: lifecycleAnalysis.tenderDates.includes(r.date),
      isLastPreTenderDay: r.date === lifecycleAnalysis.lastPreTenderDate,
    }));
  }, [lifecycleAnalysis]);

  return (
    <div className="space-y-8">
      {/* 1. Header Banner & Expiries Loaded Warning */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#C98A1B]" />
              <h2 className="text-xl font-bold text-[#1F2A44]">
                Spreads & Contract Lifecycle Dynamics
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Calculates normalized 999 price per gram differences for month-end contracts and monitors tender-period behavior.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
              {totalExpiriesLoaded} {totalExpiriesLoaded === 1 ? 'Expiry' : 'Expiries'} Loaded
            </span>
          </div>
        </div>

        {/* Persistent Edge Warning when n < 10 */}
        {persistentEdgeWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{totalExpiriesLoaded} expiries loaded:</strong> {persistentEdgeWarning}
            </span>
          </div>
        )}

        {/* Lifecycle Rule Notice */}
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-100">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Lifecycle Tender Rule: Last 3 trading days for expiries &ge; 2026-01-01 (5 days for earlier).{' '}
            <strong className="text-slate-700">({SPREAD_CONFIG.TENDER_WINDOW_RULE_NOTE})</strong>.
          </span>
        </div>
      </div>

      {/* 2. Spreads Summary Table Per Expiry */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#1F2A44]">
              Summary Table per Expiry
            </h3>
            <p className="text-xs text-slate-500">
              Gap = price_999_per_g difference. Liquid day defined as &ge; {SPREAD_CONFIG.LIQUID_KG} kg daily turnover across all 3 legs.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
              <tr>
                <th scope="col" className="px-5 py-3 text-left">Expiry</th>
                <th scope="col" className="px-5 py-3 text-center">Liquid Days</th>
                <th scope="col" className="px-5 py-3 text-right bg-amber-50/40">
                  TEN-GUINEA (Median)
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  TEN-GUINEA (Pre-Tender)
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  TEN-GUINEA (Final)
                </th>
                <th scope="col" className="px-5 py-3 text-right bg-amber-50/40">
                  PETAL-GUINEA (Median)
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  PETAL-GUINEA (Final)
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  TEN-PETAL (Final)
                </th>
                <th scope="col" className="px-5 py-3 text-left">Pre-Tender Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {validSummaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-500 italic">
                    No expiries with all three legs (GOLDTEN, GOLDGUINEA, GOLDPETAL) currently loaded.
                  </td>
                </tr>
              ) : (
                validSummaries.map((s) => (
                  <tr
                    key={s.expiry}
                    onClick={() => setSelectedExpiry(s.expiry)}
                    className={`cursor-pointer transition-colors ${
                      selectedExpiry === s.expiry ? 'bg-[#fef7eb]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-5 py-3 font-mono font-bold text-[#1F2A44] whitespace-nowrap">
                      {s.expiry}
                    </td>
                    <td className="px-5 py-3 text-center font-mono tabular-nums font-semibold text-slate-800">
                      {s.liquidDaysCount}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums font-bold text-[#1F2A44] bg-amber-50/30">
                      {s.tenGuineaMedianLiquid !== null ? `${s.tenGuineaMedianLiquid > 0 ? '+' : ''}${s.tenGuineaMedianLiquid.toFixed(1)}` : '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-700">
                      {s.tenGuineaLastPreTender !== null ? `${s.tenGuineaLastPreTender > 0 ? '+' : ''}${s.tenGuineaLastPreTender.toFixed(1)}` : '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      {s.tenGuineaFinal !== null ? `${s.tenGuineaFinal > 0 ? '+' : ''}${s.tenGuineaFinal.toFixed(1)}` : '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums font-bold text-[#1F2A44] bg-amber-50/30">
                      {s.petalGuineaMedianLiquid !== null ? `${s.petalGuineaMedianLiquid > 0 ? '+' : ''}${s.petalGuineaMedianLiquid.toFixed(1)}` : '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      {s.petalGuineaFinal !== null ? `${s.petalGuineaFinal > 0 ? '+' : ''}${s.petalGuineaFinal.toFixed(1)}` : '-'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-700">
                      {s.tenPetalFinal !== null ? `${s.tenPetalFinal > 0 ? '+' : ''}${s.tenPetalFinal.toFixed(1)}` : '-'}
                    </td>
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                      {s.lastPreTenderDate || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Skipped Expiries Notice */}
        {skippedExpiries.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Skipped Expiries (Incomplete Legs):</span>
            <span className="ml-2">
              {skippedExpiries.map((sk) => `${sk.expiry} (missing: ${sk.missingLegs.join(', ')})`).join('; ')}
            </span>
          </div>
        )}
      </div>

      {/* 3. Interactive Spread Chart (Tender Window Shaded, Last Pre-Tender Day Marked) */}
      {currentExpirySummary && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#1F2A44] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#C98A1B]" />
                <span>
                  {selectedPair} Price Gap per Gram ({currentExpirySummary.expiry})
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Shaded gold region represents the 3-day tender window; vertical red line marks the last pre-tender trading day.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Expiry Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-600">Expiry:</span>
                <select
                  value={selectedExpiry}
                  onChange={(e) => setSelectedExpiry(e.target.value)}
                  className="font-mono text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#C98A1B]"
                >
                  {validSummaries.map((s) => (
                    <option key={s.expiry} value={s.expiry}>
                      {s.expiry} ({s.liquidDaysCount} liquid days)
                    </option>
                  ))}
                </select>
              </div>

              {/* Pair Selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['TEN-GUINEA', 'PETAL-GUINEA', 'TEN-PETAL'] as const).map((pair) => (
                  <button
                    key={pair}
                    onClick={() => setSelectedPair(pair)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      selectedPair === pair
                        ? 'bg-white text-[#1F2A44] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {pair}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spreadChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${v}`}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val || 0).toFixed(1)} / g`, `${selectedPair} Gap`]}
                  labelFormatter={(l) => `Trading Date: ${l}`}
                  contentStyle={{ backgroundColor: '#1F2A44', color: '#fff', borderRadius: '8px', border: 'none' }}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />

                {/* Shaded Tender Window */}
                {currentExpirySummary.firstTenderDate && currentExpirySummary.finalDate && (
                  <ReferenceArea
                    x1={currentExpirySummary.firstTenderDate}
                    x2={currentExpirySummary.finalDate}
                    strokeOpacity={0.2}
                    fill="#C98A1B"
                    fillOpacity={0.18}
                  />
                )}

                {/* Last Pre-Tender Day Marked */}
                {currentExpirySummary.lastPreTenderDate && (
                  <ReferenceLine
                    x={currentExpirySummary.lastPreTenderDate}
                    stroke="#dc2626"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    label={{
                      value: 'Last Pre-Tender',
                      position: 'insideTopLeft',
                      fill: '#dc2626',
                      fontSize: 10,
                      fontWeight: 'bold',
                    }}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="gap"
                  name={`${selectedPair} Gap (₹/g)`}
                  stroke="#1F2A44"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5, stroke: '#C98A1B', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. Lifecycle Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#1F2A44] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#C98A1B]" />
              <span>Contract Lifecycle Panel</span>
            </h3>
            <p className="text-xs text-slate-500">
              Contract lifetime volume, open interest progression, and tender delivery transition.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Select Contract:</span>
            <select
              value={selectedLifecycleKey}
              onChange={(e) => setSelectedLifecycleKey(e.target.value)}
              className="font-mono text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#C98A1B]"
            >
              {dataset.contracts.map((c) => (
                <option key={c.contractKey} value={c.contractKey}>
                  {c.symbol} {c.expiry} ({c.tradingDaysCount} days)
                </option>
              ))}
            </select>
          </div>
        </div>

        {lifecycleAnalysis && (
          <div className="space-y-6">
            {/* Key Lifecycle Stats Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  First Trading Date
                </span>
                <span className="text-base font-bold text-[#1F2A44] mt-0.5 block">
                  {lifecycleAnalysis.firstDate}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Listed {lifecycleAnalysis.tradingDaysCount} trading days
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Peak Open Interest
                </span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block tabular-nums">
                  {lifecycleAnalysis.peakOiLots.toLocaleString()} lots
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Date: {lifecycleAnalysis.peakOiDate} ({lifecycleAnalysis.peakOiKg.toFixed(1)} kg)
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Last Pre-Tender OI
                </span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block tabular-nums">
                  {lifecycleAnalysis.lastPreTenderOiLots !== null
                    ? `${lifecycleAnalysis.lastPreTenderOiLots.toLocaleString()} lots`
                    : 'N/A'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {lifecycleAnalysis.lastPreTenderDate || '-'}
                </span>
              </div>

              <div className="p-4 bg-[#fef7eb] rounded-xl border border-amber-200">
                <span className="text-[11px] font-semibold text-slate-600 uppercase block">
                  Tender Window OI Shift
                </span>
                <span
                  className={`text-base font-bold mt-0.5 block tabular-nums ${
                    lifecycleAnalysis.tenderOiChangePct !== null && lifecycleAnalysis.tenderOiChangePct < 0
                      ? 'text-rose-700'
                      : 'text-slate-900'
                  }`}
                >
                  {lifecycleAnalysis.tenderOiChangePct !== null
                    ? `${lifecycleAnalysis.tenderOiChangePct.toFixed(1)}%`
                    : 'N/A'}
                </span>
                <span className="text-[11px] text-slate-600 mt-1 block">
                  {lifecycleAnalysis.firstTenderOiLots !== null
                    ? `${lifecycleAnalysis.firstTenderOiLots.toLocaleString()} lots on 1st tender day`
                    : '-'}
                </span>
              </div>
            </div>

            {/* Average Daily Volume in kg by Calendar Month */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-[#1F2A44]">
                Average Daily Volume by Calendar Month ({lifecycleAnalysis.symbol} {lifecycleAnalysis.expiry})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-200 text-xs">
                {lifecycleAnalysis.monthlyVolume.map((m) => (
                  <div key={m.monthKey} className="p-3.5 text-center">
                    <span className="font-semibold text-slate-700 block mb-1">
                      {m.monthLabel}
                    </span>
                    <span className="text-sm font-bold font-mono text-[#1F2A44] block">
                      {m.avgDailyVolKg.toFixed(2)} kg
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {m.tradingDays} days · {m.totalVolKg.toFixed(1)} kg total
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart Volume_kg and OI_kg over Contract Life with Tender Window Shaded */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Volume (kg) and Open Interest (kg) Over Contract Life
                </h4>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#1F2A44]" />
                    <span className="text-slate-600">Open Interest (kg)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#C98A1B]" />
                    <span className="text-slate-600">Volume (kg)</span>
                  </span>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lifecycleChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis
                      yAxisId="left"
                      stroke="#1F2A44"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${v} kg`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#C98A1B"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${v} kg`}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [`${Number(val || 0).toFixed(2)} kg`, name]}
                      labelFormatter={(l) => `Date: ${l}`}
                      contentStyle={{ backgroundColor: '#1F2A44', color: '#fff', borderRadius: '8px', border: 'none' }}
                    />

                    {/* Shaded Tender Window */}
                    {lifecycleAnalysis.firstTenderDate && lifecycleAnalysis.lastDate && (
                      <ReferenceArea
                        yAxisId="left"
                        x1={lifecycleAnalysis.firstTenderDate}
                        x2={lifecycleAnalysis.lastDate}
                        strokeOpacity={0.2}
                        fill="#C98A1B"
                        fillOpacity={0.15}
                      />
                    )}

                    {/* Marked Last Pre-Tender Day */}
                    {lifecycleAnalysis.lastPreTenderDate && (
                      <ReferenceLine
                        yAxisId="left"
                        x={lifecycleAnalysis.lastPreTenderDate}
                        stroke="#dc2626"
                        strokeDasharray="3 3"
                        label={{
                          value: 'Last Pre-Tender',
                          position: 'insideTopLeft',
                          fill: '#dc2626',
                          fontSize: 10,
                        }}
                      />
                    )}

                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="oi_kg"
                      name="Open Interest (kg)"
                      stroke="#1F2A44"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="volume_kg"
                      name="Daily Volume (kg)"
                      stroke="#C98A1B"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
