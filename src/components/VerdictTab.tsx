import React, { useState, useMemo } from 'react';
import {
  MergedDataset,
} from '../types/bhavcopy';
import {
  VERDICT_CONSTANTS,
  DEFAULT_COST_ASSUMPTIONS,
  CostAssumptions,
  HEDGE_SPECS,
} from '../config/contracts';
import {
  evaluateVerdict,
  computeVerdictSeries,
  VerdictPairKey,
} from '../utils/verdictEngine';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Sliders,
  TrendingUp,
  Scale,
  Calendar,
  AlertCircle,
  HelpCircle,
  Flame,
  ArrowRight,
  Layers,
  RotateCcw,
} from 'lucide-react';

interface VerdictTabProps {
  dataset: MergedDataset;
}

export const VerdictTab: React.FC<VerdictTabProps> = ({ dataset }) => {
  // Available Pairs
  const pairOptions: { key: VerdictPairKey; label: string; hedge: string }[] = [
    { key: 'TEN-GUINEA', label: 'GOLDTEN vs GOLDGUINEA', hedge: '4 lots (40g) vs 5 lots (40g)' },
    { key: 'TEN-PETAL', label: 'GOLDTEN vs GOLDPETAL', hedge: '1 lot (10g) vs 10 lots (10g)' },
    { key: 'GUINEA-PETAL', label: 'GOLDGUINEA vs GOLDPETAL', hedge: '1 lot (8g) vs 8 lots (8g)' },
  ];

  const [selectedPair, setSelectedPair] = useState<VerdictPairKey>('TEN-GUINEA');
  const [costAssumptions, setCostAssumptions] = useState<CostAssumptions>(DEFAULT_COST_ASSUMPTIONS);
  const [showCostEditor, setShowCostEditor] = useState<boolean>(false);

  // Determine available expiries for the selected pair where both legs are present
  const spec = HEDGE_SPECS[selectedPair];
  const legASymbol = spec.legA;
  const legBSymbol = spec.legB;

  const expiriesForPair = useMemo(() => {
    const expiriesA = new Set(
      dataset.allGoldRows.filter((r) => r.symbol === legASymbol).map((r) => r.expiry)
    );
    const expiriesB = new Set(
      dataset.allGoldRows.filter((r) => r.symbol === legBSymbol).map((r) => r.expiry)
    );

    // Common expiries
    const common = Array.from(expiriesA).filter((exp) => expiriesB.has(exp));
    // Sort expiries chronologically
    return common.sort((a, b) => {
      const rowA = dataset.allGoldRows.find((r) => r.expiry === a);
      const rowB = dataset.allGoldRows.find((r) => r.expiry === b);
      const isoA = rowA?.expiryIsoDate || a;
      const isoB = rowB?.expiryIsoDate || b;
      return isoA.localeCompare(isoB);
    });
  }, [dataset, legASymbol, legBSymbol]);

  const [selectedExpiry, setSelectedExpiry] = useState<string>('');

  // Keep selectedExpiry synced
  const activeExpiry = useMemo(() => {
    if (expiriesForPair.includes(selectedExpiry)) {
      return selectedExpiry;
    }
    // Default to last expiry (most recent)
    return expiriesForPair.length > 0 ? expiriesForPair[expiriesForPair.length - 1] : '';
  }, [expiriesForPair, selectedExpiry]);

  // Available trading dates for selected pair and expiry (where both legs traded)
  const availableDates = useMemo(() => {
    if (!activeExpiry) return [];
    const datesA = new Set(
      dataset.allGoldRows
        .filter((r) => r.symbol === legASymbol && r.expiry === activeExpiry)
        .map((r) => r.date)
    );
    const rowsB = dataset.allGoldRows.filter(
      (r) => r.symbol === legBSymbol && r.expiry === activeExpiry
    );

    const commonDates = rowsB
      .filter((r) => datesA.has(r.date))
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate))
      .map((r) => r.date);

    return commonDates;
  }, [dataset, legASymbol, legBSymbol, activeExpiry]);

  const [selectedDate, setSelectedDate] = useState<string>('');

  // Keep selectedDate synced
  const activeDate = useMemo(() => {
    if (availableDates.includes(selectedDate)) {
      return selectedDate;
    }
    // Default to last date
    return availableDates.length > 0 ? availableDates[availableDates.length - 1] : '';
  }, [availableDates, selectedDate]);

  // Evaluate Verdict strictly using rows dated <= activeDate
  const verdict = useMemo(() => {
    if (!activeExpiry || !activeDate) return null;
    return evaluateVerdict(
      selectedPair,
      activeExpiry,
      activeDate,
      dataset.allGoldRows,
      dataset.quarantinedRecords,
      costAssumptions
    );
  }, [selectedPair, activeExpiry, activeDate, dataset, costAssumptions]);

  // Compute time series for Live Edge vs Friction chart
  const chartSeries = useMemo(() => {
    if (!activeExpiry || !activeDate) return [];
    return computeVerdictSeries(
      selectedPair,
      activeExpiry,
      activeDate,
      dataset.allGoldRows,
      costAssumptions
    );
  }, [selectedPair, activeExpiry, activeDate, dataset, costAssumptions]);

  const handleResetCosts = () => {
    setCostAssumptions(DEFAULT_COST_ASSUMPTIONS);
  };

  const handleToggleStress = () => {
    setCostAssumptions((prev) => ({
      ...prev,
      isSlippageStressed: !prev.isSlippageStressed,
    }));
  };

  if (expiriesForPair.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-4">
        <AlertCircle className="w-12 h-12 text-[#C98A1B] mx-auto" />
        <h3 className="text-lg font-bold text-[#1F2A44]">
          Insufficient Pair Contracts Loaded
        </h3>
        <p className="text-sm text-slate-600">
          The selected pair ({selectedPair}) requires both {legASymbol} and {legBSymbol} contracts for the same expiry.
          Please select another pair or upload historical files holding these contracts.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          {pairOptions.map((p) => (
            <button
              key={p.key}
              onClick={() => setSelectedPair(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                selectedPair === p.key
                  ? 'bg-[#1F2A44] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & Pre-committed Rules Banner */}
      <div className="bg-[#1F2A44] text-white p-6 rounded-2xl shadow-sm border border-[#2d3b5e]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-5 h-5 text-[#C98A1B]" />
              <h2 className="text-lg font-bold tracking-tight">
                Statistical Arbitrage Verdict Engine
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#2d3b5e] text-amber-300 border border-amber-500/30">
                Pre-committed Rules
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Strict causal decision on date <span className="font-mono text-amber-200 font-semibold">{activeDate || '—'}</span> using only rows dated on or before that date. All gates are evaluated in sequence with zero look-ahead.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 bg-[#253252] rounded-lg border border-[#33446e]">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Lookback</span>
              <span className="font-mono font-bold text-amber-300">{VERDICT_CONSTANTS.LOOKBACK} days</span>
            </div>
            <div className="px-3 py-1.5 bg-[#253252] rounded-lg border border-[#33446e]">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Entry Hurdle</span>
              <span className="font-mono font-bold text-amber-300">|z| &ge; {VERDICT_CONSTANTS.Z_ENTRY.toFixed(1)}</span>
            </div>
            <div className="px-3 py-1.5 bg-[#253252] rounded-lg border border-[#33446e]">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Edge Multiplier</span>
              <span className="font-mono font-bold text-amber-300">&ge; {VERDICT_CONSTANTS.EDGE_COST_MULTIPLE}x Cost</span>
            </div>
            <div className="px-3 py-1.5 bg-[#253252] rounded-lg border border-[#33446e]">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Min Volume</span>
              <span className="font-mono font-bold text-amber-300">&ge; {VERDICT_CONSTANTS.LIQUID_KG} kg / leg</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Selectors Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Pair Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#C98A1B]" />
              Contract Pair
            </label>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {pairOptions.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPair(p.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    selectedPair === p.key
                      ? 'bg-[#1F2A44] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.key}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#C98A1B]" />
              Expiry
            </label>
            <select
              value={activeExpiry}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-[#1F2A44] cursor-pointer"
            >
              {expiriesForPair.map((exp) => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-[#C98A1B]" />
              Evaluation Date (T)
            </label>
            <select
              value={activeDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:border-[#1F2A44] cursor-pointer"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cost Assumptions toggle & Stress test */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleStress}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              costAssumptions.isSlippageStressed
                ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Stress slippage by 4x to test edge durability under extreme execution friction"
          >
            <Flame className={`w-3.5 h-3.5 ${costAssumptions.isSlippageStressed ? 'text-rose-600 fill-rose-600' : 'text-slate-400'}`} />
            <span>Slippage Stress x4</span>
            {costAssumptions.isSlippageStressed && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-200 text-rose-900 rounded">
                ACTIVE
              </span>
            )}
          </button>

          <button
            onClick={() => setShowCostEditor(!showCostEditor)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              showCostEditor
                ? 'bg-[#1F2A44] text-white border-[#1F2A44]'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#C98A1B]" />
            <span>Cost Assumptions</span>
          </button>
        </div>
      </div>

      {/* Editable Cost Assumptions Panel (labeled "assumptions, verify with MCX / broker") */}
      {showCostEditor && (
        <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F2A44]">
                Cost &amp; Friction Model
              </h4>
              <p className="text-xs text-amber-900 italic">
                assumptions, verify with MCX / broker
              </p>
            </div>
            <button
              onClick={handleResetCosts}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-white hover:bg-amber-100 border border-amber-300 text-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              Reset Defaults
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-amber-200">
              <label className="text-slate-500 block mb-1">Exchange Turnover Fee</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.0001"
                  value={costAssumptions.exchangeRatePct}
                  onChange={(e) =>
                    setCostAssumptions({
                      ...costAssumptions,
                      exchangeRatePct: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full font-mono font-bold text-slate-900 border border-slate-200 rounded px-2 py-1"
                />
                <span className="text-slate-400 font-semibold">%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">per leg per side (0.0021%)</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-200">
              <label className="text-slate-500 block mb-1">Stamp Duty (Buy Side)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.0001"
                  value={costAssumptions.stampDutyBuyPct}
                  onChange={(e) =>
                    setCostAssumptions({
                      ...costAssumptions,
                      stampDutyBuyPct: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full font-mono font-bold text-slate-900 border border-slate-200 rounded px-2 py-1"
                />
                <span className="text-slate-400 font-semibold">%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">0.002% on buys only</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-200">
              <label className="text-slate-500 block mb-1">CTT (Commodities Tax)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.001"
                  value={costAssumptions.cttSellPct}
                  onChange={(e) =>
                    setCostAssumptions({
                      ...costAssumptions,
                      cttSellPct: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full font-mono font-bold text-slate-900 border border-slate-200 rounded px-2 py-1"
                />
                <span className="text-slate-400 font-semibold">%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">0.01% on sell sides only</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-200">
              <label className="text-slate-500 block mb-1">SEBI Regulatory Turnover</label>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-semibold">₹</span>
                <input
                  type="number"
                  step="1"
                  value={costAssumptions.sebiFeePerCrore}
                  onChange={(e) =>
                    setCostAssumptions({
                      ...costAssumptions,
                      sebiFeePerCrore: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full font-mono font-bold text-slate-900 border border-slate-200 rounded px-2 py-1"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">₹10 per crore per side</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-200">
              <label className="text-slate-500 block mb-1">Brokerage per Order</label>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-semibold">₹</span>
                <input
                  type="number"
                  step="1"
                  value={costAssumptions.brokeragePerOrder}
                  onChange={(e) =>
                    setCostAssumptions({
                      ...costAssumptions,
                      brokeragePerOrder: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full font-mono font-bold text-slate-900 border border-slate-200 rounded px-2 py-1"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">₹ per order (default ₹0)</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-200">
              <label className="text-slate-500 block mb-1">GST on Fees</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  value={costAssumptions.gstPct}
                  onChange={(e) =>
                    setCostAssumptions({
                      ...costAssumptions,
                      gstPct: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full font-mono font-bold text-slate-900 border border-slate-200 rounded px-2 py-1"
                />
                <span className="text-slate-400 font-semibold">%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">18% on (brokerage+exchange+sebi)</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-200">
              <label className="text-slate-500 block mb-1">Slippage Buffer (₹/g)</label>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-semibold">₹</span>
                <input
                  type="number"
                  step="0.1"
                  value={costAssumptions.slippagePerG}
                  onChange={(e) =>
                    setCostAssumptions({
                      ...costAssumptions,
                      slippagePerG: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full font-mono font-bold text-slate-900 border border-slate-200 rounded px-2 py-1"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">per leg per side (default 0.5)</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-200 flex flex-col justify-between">
              <div>
                <label className="text-slate-500 block mb-1">Effective Slippage</label>
                <span className="text-base font-bold font-mono text-[#1F2A44]">
                  ₹{(costAssumptions.isSlippageStressed ? costAssumptions.slippagePerG * 4 : costAssumptions.slippagePerG).toFixed(2)}/g
                </span>
              </div>
              <span className="text-[10px] text-amber-700 font-medium">
                {costAssumptions.isSlippageStressed ? 'Stressed 4x active' : 'Normal execution'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Primary Verdict Status Badge & Decision Card */}
      {verdict && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Verdict Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
                  Verdict Decision · {activeDate}
                </span>
                <h3 className="text-lg font-bold text-[#1F2A44] flex items-center gap-2">
                  <span>{selectedPair}</span>
                  <span className="text-[#C98A1B] font-mono">{activeExpiry}</span>
                </h3>
              </div>

              {/* Verdict Badge: Green TRADE, Amber NO TRADE, Red DATA INVALID */}
              <div>
                {verdict.status === 'TRADE' && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm tracking-wide shadow-xs">
                    <CheckCircle className="w-5 h-5 text-emerald-100" />
                    <span>TRADE</span>
                  </span>
                )}
                {verdict.status === 'NO TRADE' && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-sm tracking-wide shadow-xs">
                    <AlertCircle className="w-5 h-5 text-amber-100" />
                    <span>NO TRADE</span>
                  </span>
                )}
                {verdict.status === 'DATA INVALID' && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-sm tracking-wide shadow-xs">
                    <ShieldAlert className="w-5 h-5 text-rose-100" />
                    <span>DATA INVALID</span>
                  </span>
                )}
              </div>
            </div>

            {/* Direction details if TRADE */}
            {verdict.status === 'TRADE' && verdict.direction && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <ArrowRight className="w-4 h-4 text-emerald-600" />
                  <span>Directional Execution Plan</span>
                </div>
                <p className="text-xs text-emerald-800 font-mono font-medium">
                  {verdict.direction.description}
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                    {verdict.direction.legABuySell} {verdict.hedgeSpec.lotsA} lots {verdict.direction.legA}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                    {verdict.direction.legBBuySell} {verdict.hedgeSpec.lotsB} lots {verdict.direction.legB}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-200/80 text-emerald-950 font-bold">
                    Hedge: {verdict.hedgeSpec.grams}g each
                  </span>
                </div>
              </div>
            )}

            {/* Reasons / Gates List */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                {verdict.status === 'TRADE' ? 'Passing Gates & Criteria' : 'Evaluated Gates & Failure Reasons'}
              </span>

              {verdict.status === 'DATA INVALID' && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-rose-800">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Quarantine Lookback Invariant Breached</span>
                  </div>
                  <p className="leading-relaxed">
                    A quarantined row ({verdict.quarantinedRecordInLookback?.check}) for{' '}
                    <span className="font-mono font-semibold">{verdict.quarantinedRecordInLookback?.symbol}</span> on date{' '}
                    <span className="font-mono font-semibold">{verdict.quarantinedRecordInLookback?.date}</span> was detected on this date or inside the 20-day lookback window.
                  </p>
                  <p className="text-[11px] text-rose-700 italic">
                    Reason: {verdict.quarantinedRecordInLookback?.detail}
                  </p>
                </div>
              )}

              {verdict.status === 'NO TRADE' && (
                <div className="space-y-1.5">
                  {verdict.failedGates.map((gate, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900"
                    >
                      <XCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span className="font-medium capitalize">{gate}</span>
                    </div>
                  ))}
                </div>
              )}

              {verdict.status === 'TRADE' && (
                <div className="space-y-1.5">
                  {verdict.reasons.map((reason, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-900"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="font-medium">{reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Gap on Day T</span>
                <span className="text-base font-bold font-mono text-[#1F2A44]">
                  {verdict.currentGap > 0 ? `+${verdict.currentGap.toFixed(1)}` : verdict.currentGap.toFixed(1)} ₹/g
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Mean: {verdict.trailingMean.toFixed(1)} ₹/g
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Z-Score (20d)</span>
                <span
                  className={`text-base font-bold font-mono ${
                    Math.abs(verdict.zScore) >= VERDICT_CONSTANTS.Z_ENTRY
                      ? 'text-emerald-700'
                      : 'text-slate-800'
                  }`}
                >
                  {verdict.zScore > 0 ? `+${verdict.zScore.toFixed(2)}` : verdict.zScore.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Entry: &ge; {VERDICT_CONSTANTS.Z_ENTRY.toFixed(1)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Gross Edge</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  ₹{verdict.grossEdgeINR.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  ₹{verdict.grossEdgePerG.toFixed(1)}/g
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Edge / Cost Multiple</span>
                <span
                  className={`text-base font-bold font-mono ${
                    verdict.edgeCostRatio >= VERDICT_CONSTANTS.EDGE_COST_MULTIPLE
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {verdict.edgeCostRatio.toFixed(2)}x
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Target: &ge; {VERDICT_CONSTANTS.EDGE_COST_MULTIPLE}x
                </span>
              </div>
            </div>
          </div>

          {/* Hedge Spec & Position Card */}
          <div className="bg-[#1F2A44] text-white rounded-2xl p-6 shadow-sm border border-[#2d3b5e] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-[#C98A1B]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Hedge Contract Specification
                </h4>
              </div>
              <p className="text-sm font-semibold text-white mb-4">
                {verdict.hedgeSpec.label}
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#253252] border border-[#33446e] flex items-center justify-between">
                  <span className="text-slate-300">Deliverable Grams</span>
                  <span className="font-mono font-bold text-amber-300">
                    {verdict.hedgeSpec.grams} grams
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#253252] border border-[#33446e] flex items-center justify-between">
                  <span className="text-slate-300">Leg A ({verdict.hedgeSpec.legA})</span>
                  <span className="font-mono font-bold text-white">
                    {verdict.hedgeSpec.lotsA} lot{verdict.hedgeSpec.lotsA > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#253252] border border-[#33446e] flex items-center justify-between">
                  <span className="text-slate-300">Leg B ({verdict.hedgeSpec.legB})</span>
                  <span className="font-mono font-bold text-white">
                    {verdict.hedgeSpec.lotsB} lot{verdict.hedgeSpec.lotsB > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#253252] border border-[#33446e] flex items-center justify-between">
                  <span className="text-slate-300">Total Round-Trip Turnover</span>
                  <span className="font-mono font-bold text-white">
                    ₹{verdict.roundTripCosts.totalTurnover.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#253252] border border-[#33446e] flex items-center justify-between">
                  <span className="text-slate-300">Round-Trip Friction</span>
                  <span className="font-mono font-bold text-amber-300">
                    ₹{verdict.roundTripCosts.totalCostINR.toFixed(2)} (₹{verdict.roundTripCosts.costPerGram.toFixed(2)}/g)
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#2a3759] border border-[#384973] text-[11px] text-slate-300 leading-relaxed">
              <span className="text-amber-300 font-semibold block mb-0.5">Execution Rule:</span>
              P&amp;L in ₹ = gap change in ₹/g &times; {verdict.hedgeSpec.grams}g &minus; costs. Both legs must be executed simultaneously in the specified ratio.
            </div>
          </div>
        </div>
      )}

      {/* 4. Live Edge vs Friction Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#1F2A44] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#C98A1B]" />
              <span>Live Edge vs Friction Band</span>
            </h3>
            <p className="text-xs text-slate-500">
              Contract gap trajectory (gold), 20-day trailing mean (navy dashed), and shaded &plusmn; round-trip cost friction band.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-0.5 bg-[#C98A1B] inline-block" />
              Gap (₹/g)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-0.5 bg-[#1F2A44] inline-block" />
              Trailing Mean
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-2 bg-amber-200/50 inline-block border border-amber-300" />
              &plusmn; Round-Trip Cost
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          {chartSeries.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No continuous series available for this pair and expiry.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartSeries} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => `${val.toFixed(0)}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#1F2A44] text-white p-3 rounded-xl shadow-lg text-xs space-y-1 font-mono border border-slate-700">
                          <p className="font-bold text-amber-300 border-b border-slate-700 pb-1">
                            {data.date} {data.isTarget ? '· EVALUATION DAY' : ''}
                          </p>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-300">Gap:</span>
                            <span className="font-bold text-amber-400">₹{data.gap.toFixed(1)}/g</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-300">Trailing Mean (20d):</span>
                            <span>₹{data.trailingMean.toFixed(1)}/g</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-300">Cost Upper Band:</span>
                            <span>₹{data.upperCostBand.toFixed(1)}/g</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-300">Cost Lower Band:</span>
                            <span>₹{data.lowerCostBand.toFixed(1)}/g</span>
                          </div>
                          <div className="flex justify-between gap-4 text-[10px] text-slate-400 pt-1 border-t border-slate-700">
                            <span>Leg Vols:</span>
                            <span>{data.volKgA.toFixed(2)} kg / {data.volKgB.toFixed(2)} kg</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Shaded Area for Friction Band around Trailing Mean */}
                <Area
                  type="monotone"
                  dataKey="upperCostBand"
                  stroke="none"
                  fill="#fef3c7"
                  fillOpacity={0.6}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="lowerCostBand"
                  stroke="none"
                  fill="#ffffff"
                  fillOpacity={1.0}
                  isAnimationActive={false}
                />
                {/* Trailing Mean Line */}
                <Line
                  type="monotone"
                  dataKey="trailingMean"
                  stroke="#1F2A44"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                  name="Trailing Mean"
                />
                {/* Actual Gap Line */}
                <Line
                  type="monotone"
                  dataKey="gap"
                  stroke="#C98A1B"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#C98A1B' }}
                  activeDot={{ r: 5, stroke: '#1F2A44', strokeWidth: 2 }}
                  isAnimationActive={false}
                  name="Contract Gap (₹/g)"
                />
                {activeDate && (
                  <ReferenceLine
                    x={activeDate}
                    stroke="#dc2626"
                    strokeDasharray="3 3"
                    label={{
                      value: 'Day T',
                      fill: '#dc2626',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 5. Cost Waterfall */}
      {verdict && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-[#1F2A44] flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#C98A1B]" />
                <span>Cost Waterfall &amp; Net Executable Edge</span>
              </h3>
              <p className="text-xs text-slate-500">
                Itemized deduction of all exchange, government, regulatory, brokerage, and slippage frictions for {verdict.hedgeSpec.grams}g round-trip.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Net Edge</span>
              <span
                className={`font-mono text-base font-bold ${
                  verdict.netEdgeINR > 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {verdict.netEdgeINR > 0 ? `+₹${verdict.netEdgeINR.toFixed(2)}` : `-₹${Math.abs(verdict.netEdgeINR).toFixed(2)}`}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Friction Component</th>
                  <th className="px-4 py-3 text-right">Amount (₹)</th>
                  <th className="px-4 py-3 text-right">Per Gram (₹/g)</th>
                  <th className="px-4 py-3 text-left">Basis / Formula Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {verdict.costWaterfall.map((item, idx) => {
                  const isPositive = item.type === 'positive';
                  const isTotal = item.type === 'total';
                  return (
                    <tr
                      key={idx}
                      className={
                        isTotal
                          ? 'bg-slate-50 font-bold border-t-2 border-slate-300'
                          : isPositive
                          ? 'bg-emerald-50/30'
                          : 'hover:bg-slate-50/50'
                      }
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {item.name}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono font-semibold tabular-nums ${
                          isPositive
                            ? 'text-emerald-700'
                            : isTotal
                            ? item.amountINR > 0
                              ? 'text-emerald-800 font-bold'
                              : 'text-rose-700 font-bold'
                            : 'text-slate-700'
                        }`}
                      >
                        {item.amountINR > 0 ? `+₹${item.amountINR.toFixed(2)}` : `-₹${Math.abs(item.amountINR).toFixed(2)}`}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono tabular-nums ${
                          isPositive
                            ? 'text-emerald-700'
                            : isTotal
                            ? item.perGramINR > 0
                              ? 'text-emerald-800 font-bold'
                              : 'text-rose-700 font-bold'
                            : 'text-slate-600'
                        }`}
                      >
                        {item.perGramINR > 0 ? `+₹${item.perGramINR.toFixed(2)}` : `-₹${Math.abs(item.perGramINR).toFixed(2)}`}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                        {item.note || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-[#C98A1B] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-900">Edge Multiple Requirement: </strong>
              To prevent trading on noise and adverse execution, the pre-committed engine requires Gross Expected Edge &ge; 3.0&times; Total Round-Trip Cost.
              Currently at <span className="font-mono font-bold text-slate-900">{verdict.edgeCostRatio.toFixed(2)}x</span> (requires &ge; ₹{(verdict.roundTripCosts.totalCostINR * VERDICT_CONSTANTS.EDGE_COST_MULTIPLE).toFixed(2)}).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
