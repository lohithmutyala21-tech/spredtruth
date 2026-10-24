import React, { useState, useMemo } from 'react';
import { MergedDataset } from '../types/bhavcopy';
import {
  DEFAULT_COST_ASSUMPTIONS,
  CostAssumptions,
  SPREAD_CONFIG,
} from '../config/contracts';
import { VerdictPairKey } from '../utils/verdictEngine';
import {
  runFullBacktest,
  FullBacktestResult,
  BacktestTrade,
} from '../utils/backtestEngine';
import { SourceVerifierPanel } from './SourceVerifierPanel';
import {
  History,
  Download,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Scale,
  Shield,
  Layers,
  Percent,
  Dice5,
  Sliders,
  Flame,
  RotateCcw,
} from 'lucide-react';

interface BacktestEvidenceTabProps {
  dataset: MergedDataset;
}

export const BacktestEvidenceTab: React.FC<BacktestEvidenceTabProps> = ({ dataset }) => {
  const pairOptions: { key: VerdictPairKey; label: string }[] = [
    { key: 'TEN-GUINEA', label: 'GOLDTEN vs GOLDGUINEA (40g hedge)' },
    { key: 'TEN-PETAL', label: 'GOLDTEN vs GOLDPETAL (10g hedge)' },
    { key: 'GUINEA-PETAL', label: 'GOLDGUINEA vs GOLDPETAL (8g hedge)' },
  ];

  const [selectedPair, setSelectedPair] = useState<VerdictPairKey>('TEN-GUINEA');
  const [costAssumptions, setCostAssumptions] = useState<CostAssumptions>(DEFAULT_COST_ASSUMPTIONS);
  const [showCostEditor, setShowCostEditor] = useState<boolean>(false);

  // Return on Capital: "editable 'margin per leg, % of contract value' input, empty by default. Never assume a margin value."
  const [marginInput, setMarginInput] = useState<string>('');

  const parsedMarginPct = useMemo(() => {
    if (marginInput.trim() === '') return undefined;
    const val = parseFloat(marginInput);
    return isNaN(val) || val <= 0 ? undefined : val;
  }, [marginInput]);

  // Run full backtest on all active non-quarantined rows
  const backtestResult: FullBacktestResult = useMemo(() => {
    return runFullBacktest(
      selectedPair,
      dataset.allGoldRows,
      dataset.quarantinedRecords,
      costAssumptions,
      parsedMarginPct
    );
  }, [selectedPair, dataset, costAssumptions, parsedMarginPct]);

  const totalExpiriesCount = backtestResult.trades.length;
  const unseenExpiriesCount = backtestResult.unseenTrades.length;
  const hasNoUnseenExpiries = unseenExpiriesCount === 0;
  const hasTooFewExpiries = totalExpiriesCount < SPREAD_CONFIG.MIN_PERSISTENT_EDGE_EXPIRIES; // n < 10

  const handleToggleStress = () => {
    setCostAssumptions((prev) => ({
      ...prev,
      isSlippageStressed: !prev.isSlippageStressed,
    }));
  };

  const handleResetCosts = () => {
    setCostAssumptions(DEFAULT_COST_ASSUMPTIONS);
  };

  // Download Backtest Table as CSV
  const handleDownloadCSV = () => {
    const headers = [
      'Expiry',
      'Classification',
      'Status',
      'Signal Date (T)',
      'Entry Date (T+1)',
      'Exit Date (Pre-tender Close)',
      'Direction',
      'Hedge Grams',
      'Entry Leg A (INR/g)',
      'Entry Leg B (INR/g)',
      'Exit Leg A (INR/g)',
      'Exit Leg B (INR/g)',
      'Gross PnL (INR)',
      'Net Gold Exposure (g)',
      'Gold-Move Component (INR)',
      'Spread Component (INR)',
      'Friction Costs (INR)',
      'Net PnL (INR)',
      'Total Margin (INR)',
      'Return on Capital (%)',
      'No Trade Reason',
    ];

    const rows = backtestResult.trades.map((t) => [
      `"${t.expiry}"`,
      `"${t.classification}"`,
      `"${t.hasTrade ? 'TRADED' : 'NO TRADE'}"`,
      `"${t.signalDate || ''}"`,
      `"${t.entryDate || ''}"`,
      `"${t.exitDate || ''}"`,
      `"${t.directionLabel || ''}"`,
      t.hedgeGrams,
      t.entryPriceA ? t.entryPriceA.toFixed(2) : '',
      t.entryPriceB ? t.entryPriceB.toFixed(2) : '',
      t.exitPriceA ? t.exitPriceA.toFixed(2) : '',
      t.exitPriceB ? t.exitPriceB.toFixed(2) : '',
      t.hasTrade ? t.grossPnl.toFixed(2) : '0.00',
      t.netGoldExposureGrams.toFixed(1),
      t.hasTrade ? t.goldMovePnl.toFixed(2) : '0.00',
      t.hasTrade ? t.spreadPnl.toFixed(2) : '0.00',
      t.hasTrade ? t.costs.toFixed(2) : '0.00',
      t.hasTrade ? t.netPnl.toFixed(2) : '0.00',
      t.totalMargin ? t.totalMargin.toFixed(2) : '',
      t.returnOnCapital !== undefined ? `${t.returnOnCapital.toFixed(2)}%` : '',
      `"${t.noTradeReason || ''}"`,
    ]);

    // Subtotal rows
    rows.push([
      '"DEVELOPMENT TOTALS"',
      '"development"',
      `"${backtestResult.devSummary.tradedExpiriesCount}/${backtestResult.devSummary.expiriesCount} traded"`,
      '""',
      '""',
      '""',
      '""',
      backtestResult.hedgeSpec.grams,
      '""',
      '""',
      '""',
      '""',
      backtestResult.devSummary.grossPnl.toFixed(2),
      '0.0',
      backtestResult.devSummary.goldMovePnl.toFixed(2),
      backtestResult.devSummary.spreadPnl.toFixed(2),
      backtestResult.devSummary.costs.toFixed(2),
      backtestResult.devSummary.netPnl.toFixed(2),
      backtestResult.devSummary.totalMargin ? backtestResult.devSummary.totalMargin.toFixed(2) : '',
      backtestResult.devSummary.returnOnCapital !== undefined ? `${backtestResult.devSummary.returnOnCapital.toFixed(2)}%` : '',
      '""',
    ]);

    rows.push([
      '"UNSEEN TOTALS"',
      '"unseen"',
      `"${backtestResult.unseenSummary.tradedExpiriesCount}/${backtestResult.unseenSummary.expiriesCount} traded"`,
      '""',
      '""',
      '""',
      '""',
      backtestResult.hedgeSpec.grams,
      '""',
      '""',
      '""',
      '""',
      backtestResult.unseenSummary.grossPnl.toFixed(2),
      '0.0',
      backtestResult.unseenSummary.goldMovePnl.toFixed(2),
      backtestResult.unseenSummary.spreadPnl.toFixed(2),
      backtestResult.unseenSummary.costs.toFixed(2),
      backtestResult.unseenSummary.netPnl.toFixed(2),
      backtestResult.unseenSummary.totalMargin ? backtestResult.unseenSummary.totalMargin.toFixed(2) : '',
      backtestResult.unseenSummary.returnOnCapital !== undefined ? `${backtestResult.unseenSummary.returnOnCapital.toFixed(2)}%` : '',
      '""',
    ]);

    rows.push([
      '"COMBINED TOTALS"',
      '"all"',
      `"${backtestResult.totalSummary.tradedExpiriesCount}/${backtestResult.totalSummary.expiriesCount} traded"`,
      '""',
      '""',
      '""',
      '""',
      backtestResult.hedgeSpec.grams,
      '""',
      '""',
      '""',
      '""',
      backtestResult.totalSummary.grossPnl.toFixed(2),
      '0.0',
      backtestResult.totalSummary.goldMovePnl.toFixed(2),
      backtestResult.totalSummary.spreadPnl.toFixed(2),
      backtestResult.totalSummary.costs.toFixed(2),
      backtestResult.totalSummary.netPnl.toFixed(2),
      backtestResult.totalSummary.totalMargin ? backtestResult.totalSummary.totalMargin.toFixed(2) : '',
      backtestResult.totalSummary.returnOnCapital !== undefined ? `${backtestResult.totalSummary.returnOnCapital.toFixed(2)}%` : '',
      '""',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `spreadtruth_backtest_${selectedPair}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderTradeRow = (t: BacktestTrade) => {
    return (
      <tr key={t.expiry} className="hover:bg-slate-50/70 transition-colors">
        {/* Expiry & Label */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-900">{t.expiry}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                t.isDev
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-purple-100 text-purple-800 border border-purple-200'
              }`}
            >
              {t.classification}
            </span>
          </div>
        </td>

        {/* Execution Status / Direction */}
        <td className="px-4 py-3">
          {t.hasTrade ? (
            <div>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                TRADED
              </span>
              <p className="text-[11px] font-mono text-slate-600 mt-0.5">{t.directionLabel}</p>
            </div>
          ) : (
            <div>
              <span className="text-slate-400 font-semibold text-xs italic">
                no trade this expiry
              </span>
              {t.noTradeReason && (
                <p className="text-[10px] text-slate-400 mt-0.5">{t.noTradeReason}</p>
              )}
            </div>
          )}
        </td>

        {/* Entry Date */}
        <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
          {t.hasTrade ? t.entryDate : '—'}
        </td>

        {/* Exit Date */}
        <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
          {t.hasTrade ? t.exitDate : '—'}
        </td>

        {/* Gross PnL */}
        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
          {t.hasTrade ? (
            <span className={t.grossPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
              {t.grossPnl >= 0 ? `+₹${t.grossPnl.toFixed(2)}` : `-₹${Math.abs(t.grossPnl).toFixed(2)}`}
            </span>
          ) : (
            '—'
          )}
        </td>

        {/* Gold-Move Component */}
        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
          {t.hasTrade ? (
            <div>
              <span>₹{t.goldMovePnl.toFixed(2)}</span>
              <span className="block text-[9px] text-slate-400 font-sans">
                {t.netGoldExposureGrams.toFixed(1)}g net
              </span>
            </div>
          ) : (
            '—'
          )}
        </td>

        {/* Spread Component */}
        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
          {t.hasTrade ? (
            <span className={t.spreadPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
              {t.spreadPnl >= 0 ? `+₹${t.spreadPnl.toFixed(2)}` : `-₹${Math.abs(t.spreadPnl).toFixed(2)}`}
            </span>
          ) : (
            '—'
          )}
        </td>

        {/* Costs */}
        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
          {t.hasTrade ? `-₹${t.costs.toFixed(2)}` : '—'}
        </td>

        {/* Net P&L in ₹ */}
        <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-sm">
          {t.hasTrade ? (
            <span className={t.netPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
              {t.netPnl >= 0 ? `+₹${t.netPnl.toFixed(2)}` : `-₹${Math.abs(t.netPnl).toFixed(2)}`}
            </span>
          ) : (
            '—'
          )}
        </td>

        {/* Return on Capital */}
        <td className="px-4 py-3 text-right font-mono tabular-nums">
          {parsedMarginPct === undefined ? (
            <span className="text-[11px] text-slate-400 italic">enter margin</span>
          ) : t.hasTrade && t.returnOnCapital !== undefined ? (
            <span
              className={`font-bold ${
                t.returnOnCapital >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {t.returnOnCapital >= 0
                ? `+${t.returnOnCapital.toFixed(2)}%`
                : `${t.returnOnCapital.toFixed(2)}%`}
            </span>
          ) : (
            '—'
          )}
        </td>
      </tr>
    );
  };

  const renderTotalRow = (
    label: string,
    badgeLabel: string,
    badgeClass: string,
    summary: typeof backtestResult.devSummary
  ) => {
    return (
      <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-900 font-bold">{label}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
              {badgeLabel}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-slate-600">
          {summary.tradedExpiriesCount} of {summary.expiriesCount} traded
        </td>
        <td className="px-4 py-3 font-mono text-slate-400">—</td>
        <td className="px-4 py-3 font-mono text-slate-400">—</td>
        <td className="px-4 py-3 text-right font-mono tabular-nums">
          <span className={summary.grossPnl >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
            {summary.grossPnl >= 0 ? `+₹${summary.grossPnl.toFixed(2)}` : `-₹${Math.abs(summary.grossPnl).toFixed(2)}`}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
          ₹{summary.goldMovePnl.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-right font-mono tabular-nums">
          <span className={summary.spreadPnl >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
            {summary.spreadPnl >= 0 ? `+₹${summary.spreadPnl.toFixed(2)}` : `-₹${Math.abs(summary.spreadPnl).toFixed(2)}`}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
          -₹{summary.costs.toFixed(2)}
        </td>
        <td className="px-4 py-3 text-right font-mono tabular-nums text-base font-bold">
          <span className={summary.netPnl >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
            {summary.netPnl >= 0 ? `+₹${summary.netPnl.toFixed(2)}` : `-₹${Math.abs(summary.netPnl).toFixed(2)}`}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-mono tabular-nums">
          {parsedMarginPct === undefined ? (
            <span className="text-[11px] text-slate-400 font-normal italic">
              enter margin
            </span>
          ) : summary.returnOnCapital !== undefined ? (
            <span
              className={`font-bold text-sm ${
                summary.returnOnCapital >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              {summary.returnOnCapital >= 0
                ? `+${summary.returnOnCapital.toFixed(2)}%`
                : `${summary.returnOnCapital.toFixed(2)}%`}
            </span>
          ) : (
            '—'
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Evidence Banner */}
      <div className="bg-[#1F2A44] text-white p-6 rounded-2xl shadow-sm border border-[#2d3b5e]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <History className="w-5 h-5 text-[#C98A1B]" />
              <h2 className="text-lg font-bold tracking-tight">
                Backtest &amp; Empirical Evidence
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#2d3b5e] text-amber-300 border border-amber-500/30">
                Rule A Execution
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Execution simulation entering at next trading day&apos;s Open (normalized ₹/g) upon first TRADE signal, exiting at last pre-tender Close. Strict separation of development (in-sample) and unseen (validation) expiries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              className="px-3.5 py-2 bg-[#C98A1B] hover:bg-[#e09f2b] text-slate-950 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-950" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {/* Evidence Status Callouts */}
        <div className="mt-4 pt-4 border-t border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#253252] border border-[#33446e] flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#C98A1B] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">In-Sample vs Validation Boundary:</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Results on development expiries are in-sample. Only unseen expiries count as validation.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#253252] border border-[#33446e] flex items-start gap-2.5">
            {hasNoUnseenExpiries ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-semibold text-white block">Validation Status:</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {hasNoUnseenExpiries
                  ? 'No unseen expiries loaded yet: validation pending.'
                  : `${unseenExpiriesCount} unseen expiry/expiries loaded for empirical out-of-sample validation.`}
              </p>
            </div>
          </div>
        </div>

        {/* Persistency Warning when n < 10 */}
        {hasTooFewExpiries && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Too few expiries to claim a persistent edge.</strong> ({totalExpiriesCount} expiries loaded; statistical persistency requires &ge; 10 expiries).
            </span>
          </div>
        )}
      </div>

      {/* 2. Pair Selector & Margin Input Bar */}
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

          {/* Return on Capital Margin Input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-[#C98A1B]" />
              Margin per leg (% of contract value)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="100"
                  placeholder="e.g. 10"
                  value={marginInput}
                  onChange={(e) => setMarginInput(e.target.value)}
                  className="w-36 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:outline-hidden focus:border-[#1F2A44]"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
              </div>
              {marginInput && (
                <button
                  onClick={() => setMarginInput('')}
                  className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cost Assumptions Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleStress}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              costAssumptions.isSlippageStressed
                ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${costAssumptions.isSlippageStressed ? 'text-rose-600 fill-rose-600' : 'text-slate-400'}`} />
            <span>Slippage Stress x4</span>
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
            <span>Friction Assumptions</span>
          </button>
        </div>
      </div>

      {/* Editable Cost Assumptions Panel */}
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
              <label className="text-slate-500 block mb-1">Exchange Fee</label>
              <span className="font-mono font-bold text-slate-900">{costAssumptions.exchangeRatePct}%</span>
              <span className="text-[10px] text-slate-400 block mt-1">per leg per side</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-200">
              <label className="text-slate-500 block mb-1">Stamp Duty</label>
              <span className="font-mono font-bold text-slate-900">{costAssumptions.stampDutyBuyPct}%</span>
              <span className="text-[10px] text-slate-400 block mt-1">buy sides only</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-200">
              <label className="text-slate-500 block mb-1">CTT</label>
              <span className="font-mono font-bold text-slate-900">{costAssumptions.cttSellPct}%</span>
              <span className="text-[10px] text-slate-400 block mt-1">sell sides only</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-200">
              <label className="text-slate-500 block mb-1">Effective Slippage</label>
              <span className="font-mono font-bold text-slate-900">
                ₹{(costAssumptions.isSlippageStressed ? costAssumptions.slippagePerG * 4 : costAssumptions.slippagePerG).toFixed(2)}/g
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                {costAssumptions.isSlippageStressed ? 'Stressed 4x' : 'Base buffer'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Rule A Backtest Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#1F2A44]">
                Rule A Execution Matrix ({selectedPair})
              </h3>
              <span className="text-xs font-mono font-semibold text-[#C98A1B]">
                {backtestResult.hedgeSpec.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Exit at Close of the last pre-tender day (<span className="italic text-slate-600">caveat: settlement Close may not be executable</span>).
            </p>
          </div>

          <div className="text-xs text-slate-500">
            {parsedMarginPct === undefined ? (
              <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                enter margin to compute return on capital
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold">
                Margin model: {parsedMarginPct}% per leg
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50/60 text-slate-700 font-semibold uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Expiry</th>
                <th className="px-4 py-3 text-left">Execution &amp; Direction</th>
                <th className="px-4 py-3 text-left">Entry Date</th>
                <th className="px-4 py-3 text-left">Exit Date</th>
                <th className="px-4 py-3 text-right">Gross P&amp;L</th>
                <th className="px-4 py-3 text-right">Gold-Move</th>
                <th className="px-4 py-3 text-right">Spread P&amp;L</th>
                <th className="px-4 py-3 text-right">Costs</th>
                <th className="px-4 py-3 text-right">Net P&amp;L</th>
                <th className="px-4 py-3 text-right">Return on Capital</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {/* Development Expiries */}
              {backtestResult.devTrades.length > 0 && (
                <>
                  <tr className="bg-blue-50/40">
                    <td colSpan={10} className="px-4 py-1.5 text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                      Development Expiries (In-Sample Exploration)
                    </td>
                  </tr>
                  {backtestResult.devTrades.map(renderTradeRow)}
                  {renderTotalRow(
                    'DEVELOPMENT SUB-TOTAL',
                    'In-Sample',
                    'bg-blue-100 text-blue-800 border border-blue-200',
                    backtestResult.devSummary
                  )}
                </>
              )}

              {/* Unseen Expiries */}
              {backtestResult.unseenTrades.length > 0 ? (
                <>
                  <tr className="bg-purple-50/40">
                    <td colSpan={10} className="px-4 py-1.5 text-[11px] font-bold text-purple-900 uppercase tracking-wider">
                      Unseen Expiries (Out-of-Sample Validation)
                    </td>
                  </tr>
                  {backtestResult.unseenTrades.map(renderTradeRow)}
                  {renderTotalRow(
                    'UNSEEN SUB-TOTAL',
                    'Validation',
                    'bg-purple-100 text-purple-800 border border-purple-200',
                    backtestResult.unseenSummary
                  )}
                </>
              ) : (
                <tr className="bg-slate-50/30">
                  <td colSpan={10} className="px-4 py-4 text-center text-xs text-slate-500 italic">
                    No unseen expiries loaded yet: validation pending.
                  </td>
                </tr>
              )}

              {/* Grand Total */}
              {renderTotalRow(
                'ALL EXPIRIES TOTAL',
                `${totalExpiriesCount} Expiries`,
                'bg-slate-200 text-slate-800 border border-slate-300',
                backtestResult.totalSummary
              )}
            </tbody>
          </table>
        </div>

        {/* If no trades occurred */}
        {backtestResult.totalSummary.tradedExpiriesCount === 0 && (
          <div className="p-4 bg-amber-50 border-t border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>No trades occurred under Rule A.</strong> Either no day met the pre-committed verdict gates (|z| &ge; 2.0, gross edge &ge; 3x cost, liquid legs, outside tender window), or candidate entry days had blank Open quotes.
            </span>
          </div>
        )}
      </div>

      {/* 4. Placebo Monte Carlo Distribution Card */}
      {backtestResult.placebo && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Dice5 className="w-5 h-5 text-[#C98A1B]" />
                <h3 className="text-base font-bold text-[#1F2A44]">
                  Deterministic Placebo Test (Seed 42 · 5,000 Draws)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Random entry drawn from days passing all operational gates except the z-score hurdle, simulating identical entry, exit, and costs.
              </p>
            </div>

            <div>
              {backtestResult.placebo.relationship === 'ABOVE_P95' && (
                <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold uppercase tracking-wider">
                  Edge Confirmed (&gt; 95th Percentile)
                </span>
              )}
              {backtestResult.placebo.relationship === 'INSIDE_RANGE' && (
                <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-wider">
                  Inside 5th–95th Range
                </span>
              )}
              {backtestResult.placebo.relationship === 'BELOW_P5' && (
                <span className="px-3 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold uppercase tracking-wider">
                  Below 5th Percentile
                </span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold text-slate-900 leading-relaxed">
              {backtestResult.placebo.verdictStatement}
            </p>
          </div>

          {/* Numerical Distribution Benchmarks */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">5th Percentile</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                ₹{backtestResult.placebo.p5.toFixed(1)}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Placebo Median</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                ₹{backtestResult.placebo.median.toFixed(1)}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Placebo Mean</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                ₹{backtestResult.placebo.mean.toFixed(1)}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">95th Percentile</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                ₹{backtestResult.placebo.p95.toFixed(1)}
              </span>
            </div>

            <div className="p-3 bg-[#1F2A44] text-white rounded-xl border border-[#2d3b5e]">
              <span className="text-amber-300 block text-[10px] uppercase font-semibold">Actual Strategy Net P&amp;L</span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                ₹{backtestResult.placebo.actualNetPnl.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Attribution Matrix: Beta & R² Against GOLDGUINEA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#C98A1B]" />
              <h3 className="text-base font-bold text-[#1F2A44]">
                Market Direction Attribution &amp; Beta Isolation
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Net gold exposure in grams and OLS regression of daily contract gap changes (&Delta; ₹/g) against daily changes in the GOLDGUINEA reference price (&Delta; ₹/g).
            </p>
          </div>

          <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-300">
            Hedge Net Gold Exposure: 0.0g (100% Directionally Insulated)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50/60 text-slate-700 font-semibold uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Expiry</th>
                <th className="px-4 py-3 text-left">Classification</th>
                <th className="px-4 py-3 text-right">Net Gold Exposure</th>
                <th className="px-4 py-3 text-right">Daily Observations (n)</th>
                <th className="px-4 py-3 text-right">Beta to Gold (&beta;)</th>
                <th className="px-4 py-3 text-right">R-Squared (R&sup2;)</th>
                <th className="px-4 py-3 text-left">Attribution Conclusion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {backtestResult.attributions.map((attr) => {
                const isOrthogonal = Math.abs(attr.beta) < 0.1 && attr.r2 < 0.05;
                return (
                  <tr key={attr.expiry} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                      {attr.expiry}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          attr.isDev
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}
                      >
                        {attr.classification}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-700">
                      {attr.netGoldExposureGrams.toFixed(1)}g
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                      {attr.n} days
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                      {attr.beta >= 0 ? `+${attr.beta.toFixed(3)}` : attr.beta.toFixed(3)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-700">
                      {(attr.r2 * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 text-[11px]">
                      {isOrthogonal ? (
                        <span className="text-emerald-700 font-medium">
                          Pure relative-value: spread moves are uncorrelated with directional gold
                        </span>
                      ) : (
                        <span>
                          Residual sensitivity to underlying gold price moves
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Source Verifier powered by TinyFish */}
      <SourceVerifierPanel />

      {/* 7. Honest Limitations List */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#C98A1B]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F2A44]">
            Methodological Limitations &amp; Real-World Execution Caveats
          </h4>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-600">
          <li className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C98A1B] shrink-0 mt-1.5" />
            <span>
              <strong className="text-slate-900">settlement is not an executable price: </strong>
              Contracts exit at the last pre-tender day Close, which may reflect MCX settlement price rather than executable market quotes on low-turnover trading days.
            </span>
          </li>
          <li className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C98A1B] shrink-0 mt-1.5" />
            <span>
              <strong className="text-slate-900">costs are assumptions: </strong>
              Exchange fees, stamp duties, regulatory levies, GST, and slippage buffers are modeled based on standard broker/exchange schedules; actual rates must be verified with broker.
            </span>
          </li>
          <li className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C98A1B] shrink-0 mt-1.5" />
            <span>
              <strong className="text-slate-900">GOLDTEN history is short: </strong>
              Historical data for GOLDTEN is limited compared to traditional MCX gold contracts; edge stability across multiple market cycles remains subject to ongoing verification.
            </span>
          </li>
          <li className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C98A1B] shrink-0 mt-1.5" />
            <span>
              <strong className="text-slate-900">tender rule applied by effective date: </strong>
              Tender periods (last 3 trading days for 2026 onwards; 5 days prior) are derived programmatically from recorded trading series rather than MCX circular announcements.
            </span>
          </li>
          <li className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200 md:col-span-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C98A1B] shrink-0 mt-1.5" />
            <span>
              <strong className="text-slate-900">GOLDM carry not modelled: </strong>
              GOLDM pairs have differing expiry schedules (05th of month vs month-end) and purity specifications (995 vs 999); carry financing and calendar basis costs are not incorporated.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
