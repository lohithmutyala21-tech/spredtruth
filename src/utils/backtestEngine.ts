/**
 * Backtest & Evidence Engine for SpreadTruth
 * Implements Rule A, Deterministic Placebo (seeded PRNG, seed 42),
 * Attribution (Net gold exposure, Beta, R²), and Return on Capital.
 */

import {
  ParsedGoldContractRow,
  QuarantineRecord,
} from '../types/bhavcopy';
import {
  VERDICT_CONSTANTS,
  DEV_EXPIRIES,
  isDevExpiry,
  HEDGE_SPECS,
  GOLD_CONTRACT_SPECS,
  CostAssumptions,
  DEFAULT_COST_ASSUMPTIONS,
  HedgeSpec,
} from '../config/contracts';
import { getTenderWindowInfo } from './spreadCalculator';
import {
  evaluateVerdict,
  calculateSingleLegBuyCost,
  calculateSingleLegSellCost,
  VerdictPairKey,
} from './verdictEngine';

export interface BacktestTrade {
  expiry: string;
  isDev: boolean;
  classification: 'development' | 'unseen';
  hasTrade: boolean;
  noTradeReason?: string;
  signalDate?: string; // Day T
  entryDate?: string; // Day T+1
  exitDate?: string; // Last pre-tender day
  direction?: 'LONG_A_SHORT_B' | 'SHORT_A_LONG_B';
  directionLabel?: string;
  entryPriceA?: number; // ₹/g
  entryPriceB?: number; // ₹/g
  exitPriceA?: number; // ₹/g
  exitPriceB?: number; // ₹/g
  hedgeGrams: number;
  grossPnl: number;
  netGoldExposureGrams: number;
  guineaPriceChange: number;
  goldMovePnl: number;
  spreadPnl: number;
  costs: number;
  netPnl: number;
  entryValueA: number;
  entryValueB: number;
  totalContractValue: number;
  totalMargin?: number;
  returnOnCapital?: number; // %
}

export interface ExpiryAttribution {
  expiry: string;
  isDev: boolean;
  classification: 'development' | 'unseen';
  netGoldExposureGrams: number;
  beta: number;
  r2: number;
  n: number;
}

export interface PlaceboResult {
  pairKey: VerdictPairKey;
  drawsCount: number;
  seed: number;
  eligibleDaysCount: number;
  p5: number;
  p95: number;
  median: number;
  mean: number;
  actualNetPnl: number;
  isInsideRange: boolean;
  relationship: 'ABOVE_P95' | 'BELOW_P5' | 'INSIDE_RANGE';
  verdictStatement: string;
}

export interface BacktestGroupSummary {
  classification: 'development' | 'unseen' | 'total';
  expiriesCount: number;
  tradedExpiriesCount: number;
  grossPnl: number;
  goldMovePnl: number;
  spreadPnl: number;
  costs: number;
  netPnl: number;
  totalMargin?: number;
  returnOnCapital?: number; // %
}

export interface FullBacktestResult {
  pairKey: VerdictPairKey;
  hedgeSpec: HedgeSpec;
  trades: BacktestTrade[];
  devTrades: BacktestTrade[];
  unseenTrades: BacktestTrade[];
  devSummary: BacktestGroupSummary;
  unseenSummary: BacktestGroupSummary;
  totalSummary: BacktestGroupSummary;
  attributions: ExpiryAttribution[];
  placebo: PlaceboResult | null;
  marginPct?: number;
}

/**
 * Standard Seeded PRNG (Mulberry32)
 * Guarantees identical pseudo-random sequence given seed 42 across all environments.
 */
export function createMulberry32(seed: number = 42) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ordinary Least Squares (OLS) Linear Regression
 * Calculates slope (beta), coefficient of determination (R²), and sample size (n).
 * Returns slope 2.0 when y = 2x.
 */
export function computeBetaAndR2(
  x: number[],
  y: number[]
): { beta: number; r2: number; n: number } {
  if (x.length !== y.length || x.length < 2) {
    return { beta: 0, r2: 0, n: x.length };
  }
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  if (denX === 0) {
    return { beta: 0, r2: 0, n };
  }

  const beta = num / denX;
  const r2 = denY === 0 ? 0 : Math.min(1, Math.max(0, (num * num) / (denX * denY)));

  return { beta, r2, n };
}

/**
 * Normalizes Open price to 999 purity per gram (₹/g).
 * Returns null if open is blank (null, <= 0).
 */
export function normalizeOpenPrice(row: ParsedGoldContractRow): number | null {
  if (row.open === null || row.open <= 0) {
    return null;
  }
  return (row.open / row.spec.quoteBaseGrams) * (999 / row.spec.purity);
}

/**
 * Computes attribution (Beta & R² of daily gap change against daily GOLDGUINEA price change)
 * for a specific expiry and pair.
 */
export function computeExpiryAttribution(
  pairKey: VerdictPairKey,
  expiry: string,
  allActiveRows: ParsedGoldContractRow[]
): ExpiryAttribution {
  const hedgeSpec = HEDGE_SPECS[pairKey];
  const legASymbol = hedgeSpec.legA;
  const legBSymbol = hedgeSpec.legB;

  const legARows = allActiveRows
    .filter((r) => r.symbol === legASymbol && r.expiry === expiry)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const legBRows = allActiveRows
    .filter((r) => r.symbol === legBSymbol && r.expiry === expiry)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const guineaRows = allActiveRows
    .filter((r) => r.symbol === 'GOLDGUINEA' && r.expiry === expiry)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const legBByDate = new Map<string, ParsedGoldContractRow>();
  legBRows.forEach((r) => legBByDate.set(r.isoDate, r));

  const guineaByDate = new Map<string, ParsedGoldContractRow>();
  guineaRows.forEach((r) => guineaByDate.set(r.isoDate, r));

  interface PairedSeriesItem {
    isoDate: string;
    gap: number;
    guineaPrice: number;
  }

  const series: PairedSeriesItem[] = [];
  for (const rA of legARows) {
    const rB = legBByDate.get(rA.isoDate);
    const rG = guineaByDate.get(rA.isoDate);
    if (rB && rG) {
      series.push({
        isoDate: rA.isoDate,
        gap: rA.price_999_per_g - rB.price_999_per_g,
        guineaPrice: rG.price_999_per_g,
      });
    }
  }

  const deltaGuinea: number[] = [];
  const deltaGap: number[] = [];

  for (let i = 1; i < series.length; i++) {
    deltaGuinea.push(series[i].guineaPrice - series[i - 1].guineaPrice);
    deltaGap.push(series[i].gap - series[i - 1].gap);
  }

  const { beta, r2, n } = computeBetaAndR2(deltaGuinea, deltaGap);

  // Net gold exposure = legA grams - legB grams (0g for matched hedges)
  const specA = GOLD_CONTRACT_SPECS[legASymbol];
  const specB = GOLD_CONTRACT_SPECS[legBSymbol];
  const netGoldExposureGrams = Math.abs(hedgeSpec.lotsA * specA.lotGrams - hedgeSpec.lotsB * specB.lotGrams);

  return {
    expiry,
    isDev: isDevExpiry(expiry),
    classification: isDevExpiry(expiry) ? 'development' : 'unseen',
    netGoldExposureGrams,
    beta,
    r2,
    n,
  };
}

/**
 * Runs Rule A for a single contract-expiry.
 * - Scans days in chronological order.
 * - On first day T whose verdict is TRADE:
 *   - Enter at NEXT trading day's Open (normalized to ₹/g).
 *   - If either Open is blank (null/<=0), or entry day is not before last pre-tender day -> NO TRADE.
 *   - Exit at Close of last pre-tender day (caveat: settlement Close may not be executable).
 */
export function simulateRuleAForExpiry(
  pairKey: VerdictPairKey,
  expiry: string,
  allActiveRows: ParsedGoldContractRow[],
  quarantinedRecords: QuarantineRecord[],
  costs: CostAssumptions = DEFAULT_COST_ASSUMPTIONS,
  marginPct?: number
): BacktestTrade {
  const hedgeSpec = HEDGE_SPECS[pairKey];
  const legASymbol = hedgeSpec.legA;
  const legBSymbol = hedgeSpec.legB;
  const specA = GOLD_CONTRACT_SPECS[legASymbol];
  const specB = GOLD_CONTRACT_SPECS[legBSymbol];

  const isDev = isDevExpiry(expiry);
  const classification = isDev ? 'development' : 'unseen';

  // Get all unique trading dates for this expiry sorted chronologically
  const rowsForExpiry = allActiveRows
    .filter((r) => r.expiry === expiry)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const allTradingDates = Array.from(new Set(rowsForExpiry.map((r) => r.date))).sort((a, b) => {
    const isoA = rowsForExpiry.find((r) => r.date === a)?.isoDate || a;
    const isoB = rowsForExpiry.find((r) => r.date === b)?.isoDate || b;
    return isoA.localeCompare(isoB);
  });

  const sampleRow = rowsForExpiry[0];
  const tenderInfo = getTenderWindowInfo(allTradingDates, sampleRow?.expiryIsoDate || '');
  const lastPreTenderDate = tenderInfo.lastPreTenderDate;

  // Map rows by (symbol, date)
  const rowsByKey = new Map<string, ParsedGoldContractRow>();
  rowsForExpiry.forEach((r) => rowsByKey.set(`${r.symbol}_${r.date}`, r));

  // Exit row on last pre-tender day
  const exitRowA = rowsByKey.get(`${legASymbol}_${lastPreTenderDate}`);
  const exitRowB = rowsByKey.get(`${legBSymbol}_${lastPreTenderDate}`);

  if (!lastPreTenderDate || !exitRowA || !exitRowB) {
    return {
      expiry,
      isDev,
      classification,
      hasTrade: false,
      noTradeReason: 'Missing last pre-tender day data for one or both legs',
      hedgeGrams: hedgeSpec.grams,
      grossPnl: 0,
      netGoldExposureGrams: 0,
      guineaPriceChange: 0,
      goldMovePnl: 0,
      spreadPnl: 0,
      costs: 0,
      netPnl: 0,
      entryValueA: 0,
      entryValueB: 0,
      totalContractValue: 0,
    };
  }

  const exitPriceA = exitRowA.price_999_per_g;
  const exitPriceB = exitRowB.price_999_per_g;

  // Scan days in chronological order
  for (let i = 0; i < allTradingDates.length; i++) {
    const dateT = allTradingDates[i];
    const rowA_T = rowsByKey.get(`${legASymbol}_${dateT}`);
    const rowB_T = rowsByKey.get(`${legBSymbol}_${dateT}`);

    if (!rowA_T || !rowB_T) continue;

    // Evaluate verdict on dateT strictly with rows <= dateT
    const verdict = evaluateVerdict(
      pairKey,
      expiry,
      dateT,
      allActiveRows,
      quarantinedRecords,
      costs
    );

    if (verdict.status === 'TRADE' && verdict.direction) {
      // First day whose verdict is TRADE!
      // Entry is at the NEXT trading day's Open
      const nextIndex = i + 1;
      if (nextIndex >= allTradingDates.length) {
        return {
          expiry,
          isDev,
          classification,
          hasTrade: false,
          noTradeReason: 'No subsequent trading day after trade signal',
          hedgeGrams: hedgeSpec.grams,
          grossPnl: 0,
          netGoldExposureGrams: 0,
          guineaPriceChange: 0,
          goldMovePnl: 0,
          spreadPnl: 0,
          costs: 0,
          netPnl: 0,
          entryValueA: 0,
          entryValueB: 0,
          totalContractValue: 0,
        };
      }

      const entryDate = allTradingDates[nextIndex];
      const entryRowA = rowsByKey.get(`${legASymbol}_${entryDate}`);
      const entryRowB = rowsByKey.get(`${legBSymbol}_${entryDate}`);

      // Rule: "if the entry day is not before the last pre-tender day, no trade"
      const entryIndex = nextIndex;
      const lastPreTenderIndex = allTradingDates.indexOf(lastPreTenderDate);

      if (entryIndex >= lastPreTenderIndex) {
        return {
          expiry,
          isDev,
          classification,
          hasTrade: false,
          noTradeReason: `Entry date (${entryDate}) is not before last pre-tender day (${lastPreTenderDate})`,
          signalDate: dateT,
          hedgeGrams: hedgeSpec.grams,
          grossPnl: 0,
          netGoldExposureGrams: 0,
          guineaPriceChange: 0,
          goldMovePnl: 0,
          spreadPnl: 0,
          costs: 0,
          netPnl: 0,
          entryValueA: 0,
          entryValueB: 0,
          totalContractValue: 0,
        };
      }

      if (!entryRowA || !entryRowB) {
        return {
          expiry,
          isDev,
          classification,
          hasTrade: false,
          noTradeReason: `Missing row for entry date ${entryDate}`,
          signalDate: dateT,
          hedgeGrams: hedgeSpec.grams,
          grossPnl: 0,
          netGoldExposureGrams: 0,
          guineaPriceChange: 0,
          goldMovePnl: 0,
          spreadPnl: 0,
          costs: 0,
          netPnl: 0,
          entryValueA: 0,
          entryValueB: 0,
          totalContractValue: 0,
        };
      }

      // Rule: "if either Open is blank, no trade"
      const openA_norm = normalizeOpenPrice(entryRowA);
      const openB_norm = normalizeOpenPrice(entryRowB);

      if (openA_norm === null || openB_norm === null) {
        return {
          expiry,
          isDev,
          classification,
          hasTrade: false,
          noTradeReason: `Blank Open price on entry date ${entryDate} (${legASymbol}: ${entryRowA.open}, ${legBSymbol}: ${entryRowB.open})`,
          signalDate: dateT,
          entryDate,
          hedgeGrams: hedgeSpec.grams,
          grossPnl: 0,
          netGoldExposureGrams: 0,
          guineaPriceChange: 0,
          goldMovePnl: 0,
          spreadPnl: 0,
          costs: 0,
          netPnl: 0,
          entryValueA: 0,
          entryValueB: 0,
          totalContractValue: 0,
        };
      }

      // Determine trade direction from verdict
      const isLongA = verdict.direction.legABuySell === 'BUY';
      const direction: 'LONG_A_SHORT_B' | 'SHORT_A_LONG_B' = isLongA ? 'LONG_A_SHORT_B' : 'SHORT_A_LONG_B';
      const directionLabel = isLongA
        ? `BUY ${hedgeSpec.lotsA} lots ${legASymbol} / SELL ${hedgeSpec.lotsB} lots ${legBSymbol}`
        : `SELL ${hedgeSpec.lotsA} lots ${legASymbol} / BUY ${hedgeSpec.lotsB} lots ${legBSymbol}`;

      // Calculate Gross P&L:
      // If Long A / Short B: (exitA - openA) + (openB - exitB) in ₹/g * hedgeGrams
      // If Short A / Long B: (openA - exitA) + (exitB - openB) in ₹/g * hedgeGrams
      let pnlA_perG = 0;
      let pnlB_perG = 0;

      if (isLongA) {
        pnlA_perG = exitPriceA - openA_norm;
        pnlB_perG = openB_norm - exitPriceB;
      } else {
        pnlA_perG = openA_norm - exitPriceA;
        pnlB_perG = exitPriceB - openB_norm;
      }

      const grossPnl = (pnlA_perG + pnlB_perG) * hedgeSpec.grams;

      // Attribution:
      // net gold exposure in grams = lotsA*lotGramsA - lotsB*lotGramsB (signed by direction)
      const gramsA = hedgeSpec.lotsA * specA.lotGrams;
      const gramsB = hedgeSpec.lotsB * specB.lotGrams;
      const netGoldExposureGrams = isLongA ? gramsA - gramsB : gramsB - gramsA;

      // GOLDGUINEA price change between entry and exit
      const guineaRowEntry = rowsByKey.get(`GOLDGUINEA_${entryDate}`);
      const guineaRowExit = rowsByKey.get(`GOLDGUINEA_${lastPreTenderDate}`);
      const guineaEntryPrice = guineaRowEntry ? guineaRowEntry.price_999_per_g : openB_norm;
      const guineaExitPrice = guineaRowExit ? guineaRowExit.price_999_per_g : exitPriceB;
      const guineaPriceChange = guineaExitPrice - guineaEntryPrice;

      const goldMovePnl = netGoldExposureGrams * guineaPriceChange;
      const spreadPnl = grossPnl - goldMovePnl;

      // Friction Costs:
      // Long A / Short B:
      // Entry: Buy Leg A at openA_norm, Sell Leg B at openB_norm
      // Exit: Sell Leg A at exitPriceA, Buy Leg B at exitPriceB
      let costEntryA = 0;
      let costEntryB = 0;
      let costExitA = 0;
      let costExitB = 0;

      if (isLongA) {
        costEntryA = calculateSingleLegBuyCost(hedgeSpec.grams, openA_norm, costs.brokeragePerOrder, costs).totalCost;
        costEntryB = calculateSingleLegSellCost(hedgeSpec.grams, openB_norm, costs.brokeragePerOrder, costs).totalCost;
        costExitA = calculateSingleLegSellCost(hedgeSpec.grams, exitPriceA, costs.brokeragePerOrder, costs).totalCost;
        costExitB = calculateSingleLegBuyCost(hedgeSpec.grams, exitPriceB, costs.brokeragePerOrder, costs).totalCost;
      } else {
        costEntryA = calculateSingleLegSellCost(hedgeSpec.grams, openA_norm, costs.brokeragePerOrder, costs).totalCost;
        costEntryB = calculateSingleLegBuyCost(hedgeSpec.grams, openB_norm, costs.brokeragePerOrder, costs).totalCost;
        costExitA = calculateSingleLegBuyCost(hedgeSpec.grams, exitPriceA, costs.brokeragePerOrder, costs).totalCost;
        costExitB = calculateSingleLegSellCost(hedgeSpec.grams, exitPriceB, costs.brokeragePerOrder, costs).totalCost;
      }

      const totalCosts = costEntryA + costEntryB + costExitA + costExitB;
      const netPnl = grossPnl - totalCosts;

      // Contract values & Margin
      const entryValueA = hedgeSpec.grams * openA_norm;
      const entryValueB = hedgeSpec.grams * openB_norm;
      const totalContractValue = entryValueA + entryValueB;

      let totalMargin: number | undefined = undefined;
      let returnOnCapital: number | undefined = undefined;

      if (marginPct !== undefined && !isNaN(marginPct) && marginPct > 0) {
        totalMargin = (marginPct / 100) * totalContractValue;
        returnOnCapital = totalMargin > 0 ? (netPnl / totalMargin) * 100 : 0;
      }

      return {
        expiry,
        isDev,
        classification,
        hasTrade: true,
        signalDate: dateT,
        entryDate,
        exitDate: lastPreTenderDate,
        direction,
        directionLabel,
        entryPriceA: openA_norm,
        entryPriceB: openB_norm,
        exitPriceA,
        exitPriceB,
        hedgeGrams: hedgeSpec.grams,
        grossPnl,
        netGoldExposureGrams,
        guineaPriceChange,
        goldMovePnl,
        spreadPnl,
        costs: totalCosts,
        netPnl,
        entryValueA,
        entryValueB,
        totalContractValue,
        totalMargin,
        returnOnCapital,
      };
    }
  }

  // No day triggered TRADE
  return {
    expiry,
    isDev,
    classification,
    hasTrade: false,
    noTradeReason: 'No trading day met all pre-committed verdict gates during this expiry',
    hedgeGrams: hedgeSpec.grams,
    grossPnl: 0,
    netGoldExposureGrams: 0,
    guineaPriceChange: 0,
    goldMovePnl: 0,
    spreadPnl: 0,
    costs: 0,
    netPnl: 0,
    entryValueA: 0,
    entryValueB: 0,
    totalContractValue: 0,
  };
}

/**
 * Summarizes a group of trades (development or unseen or total)
 */
export function summarizeTradeGroup(
  classification: 'development' | 'unseen' | 'total',
  trades: BacktestTrade[],
  marginPct?: number
): BacktestGroupSummary {
  const traded = trades.filter((t) => t.hasTrade);

  const grossPnl = traded.reduce((sum, t) => sum + t.grossPnl, 0);
  const goldMovePnl = traded.reduce((sum, t) => sum + t.goldMovePnl, 0);
  const spreadPnl = traded.reduce((sum, t) => sum + t.spreadPnl, 0);
  const costs = traded.reduce((sum, t) => sum + t.costs, 0);
  const netPnl = grossPnl - costs;

  let totalMargin: number | undefined = undefined;
  let returnOnCapital: number | undefined = undefined;

  if (marginPct !== undefined && !isNaN(marginPct) && marginPct > 0) {
    totalMargin = traded.reduce((sum, t) => sum + (t.totalMargin || 0), 0);
    returnOnCapital = totalMargin > 0 ? (netPnl / totalMargin) * 100 : 0;
  }

  return {
    classification,
    expiriesCount: trades.length,
    tradedExpiriesCount: traded.length,
    grossPnl,
    goldMovePnl,
    spreadPnl,
    costs,
    netPnl,
    totalMargin,
    returnOnCapital,
  };
}

/**
 * Runs Placebo Monte Carlo Test:
 * For each pair, draw the entry day at random (seeded PRNG, seed 42, 5,000 draws)
 * from days that pass every gate except the z-score threshold,
 * apply the same entry, exit, and costs, and compute 5th-95th percentile distribution.
 */
export function runPlaceboTest(
  pairKey: VerdictPairKey,
  allActiveRows: ParsedGoldContractRow[],
  quarantinedRecords: QuarantineRecord[],
  costs: CostAssumptions = DEFAULT_COST_ASSUMPTIONS,
  actualNetPnl: number = 0,
  seed: number = 42,
  drawsCount: number = 5000
): PlaceboResult {
  const hedgeSpec = HEDGE_SPECS[pairKey];
  const legASymbol = hedgeSpec.legA;
  const legBSymbol = hedgeSpec.legB;

  // Find all expiries that have both legs
  const expiriesA = new Set(allActiveRows.filter((r) => r.symbol === legASymbol).map((r) => r.expiry));
  const validExpiries = Array.from(
    new Set(allActiveRows.filter((r) => r.symbol === legBSymbol && expiriesA.has(r.expiry)).map((r) => r.expiry))
  );

  interface EligibleDay {
    expiry: string;
    signalDate: string;
    entryDate: string;
    lastPreTenderDate: string;
    openA_norm: number;
    openB_norm: number;
    exitPriceA: number;
    exitPriceB: number;
    isLongA: boolean;
  }

  const eligiblePool: EligibleDay[] = [];

  for (const exp of validExpiries) {
    const rowsForExp = allActiveRows
      .filter((r) => r.expiry === exp)
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

    const dates = Array.from(new Set(rowsForExp.map((r) => r.date))).sort((a, b) => {
      const isoA = rowsForExp.find((r) => r.date === a)?.isoDate || a;
      const isoB = rowsForExp.find((r) => r.date === b)?.isoDate || b;
      return isoA.localeCompare(isoB);
    });

    const sampleRow = rowsForExp[0];
    const tenderInfo = getTenderWindowInfo(dates, sampleRow?.expiryIsoDate || '');
    const lastPreTenderDate = tenderInfo.lastPreTenderDate;
    if (!lastPreTenderDate) continue;

    const rowsMap = new Map<string, ParsedGoldContractRow>();
    rowsForExp.forEach((r) => rowsMap.set(`${r.symbol}_${r.date}`, r));

    const exitRowA = rowsMap.get(`${legASymbol}_${lastPreTenderDate}`);
    const exitRowB = rowsMap.get(`${legBSymbol}_${lastPreTenderDate}`);
    if (!exitRowA || !exitRowB) continue;

    const lastPreTenderIdx = dates.indexOf(lastPreTenderDate);

    for (let i = 0; i < dates.length; i++) {
      const dateT = dates[i];
      const rA = rowsMap.get(`${legASymbol}_${dateT}`);
      const rB = rowsMap.get(`${legBSymbol}_${dateT}`);
      if (!rA || !rB) continue;

      // Gate check: outside tender window and pre-tender day
      if (tenderInfo.tenderDates.includes(dateT) || dateT === lastPreTenderDate) continue;

      // Gate check: minimum volume (>= 5 kg per leg)
      if (rA.volume_kg < VERDICT_CONSTANTS.LIQUID_KG || rB.volume_kg < VERDICT_CONSTANTS.LIQUID_KG) continue;

      // Gate check: lookback >= 20
      if (i < VERDICT_CONSTANTS.LOOKBACK - 1) continue;

      // Gate check: no quarantine in lookback
      const lookbackDatesSlice = dates.slice(i - VERDICT_CONSTANTS.LOOKBACK + 1, i + 1);
      const hasQuarantine = quarantinedRecords.some(
        (q) =>
          (q.symbol === legASymbol || q.symbol === legBSymbol) &&
          q.expiry === exp &&
          (lookbackDatesSlice.includes(q.date) || q.date === dateT)
      );
      if (hasQuarantine) continue;

      // Next trading day must be strictly before last pre-tender day
      const nextIdx = i + 1;
      if (nextIdx >= lastPreTenderIdx) continue;

      const entryDate = dates[nextIdx];
      const entryRowA = rowsMap.get(`${legASymbol}_${entryDate}`);
      const entryRowB = rowsMap.get(`${legBSymbol}_${entryDate}`);
      if (!entryRowA || !entryRowB) continue;

      const openA_norm = normalizeOpenPrice(entryRowA);
      const openB_norm = normalizeOpenPrice(entryRowB);
      if (openA_norm === null || openB_norm === null) continue;

      // Direction based on whether gap is below or above trailing mean on dateT
      const lookbackGaps: number[] = [];
      for (const d of lookbackDatesSlice) {
        const rowA_lb = rowsMap.get(`${legASymbol}_${d}`);
        const rowB_lb = rowsMap.get(`${legBSymbol}_${d}`);
        if (rowA_lb && rowB_lb) {
          lookbackGaps.push(rowA_lb.price_999_per_g - rowB_lb.price_999_per_g);
        }
      }
      const meanGap = lookbackGaps.reduce((a, b) => a + b, 0) / lookbackGaps.length;
      const currentGap = rA.price_999_per_g - rB.price_999_per_g;
      const isLongA = currentGap < meanGap;

      eligiblePool.push({
        expiry: exp,
        signalDate: dateT,
        entryDate,
        lastPreTenderDate,
        openA_norm,
        openB_norm,
        exitPriceA: exitRowA.price_999_per_g,
        exitPriceB: exitRowB.price_999_per_g,
        isLongA,
      });
    }
  }

  if (eligiblePool.length === 0) {
    return {
      pairKey,
      drawsCount,
      seed,
      eligibleDaysCount: 0,
      p5: 0,
      p95: 0,
      median: 0,
      mean: 0,
      actualNetPnl,
      isInsideRange: true,
      relationship: 'INSIDE_RANGE',
      verdictStatement: 'Insufficient eligible trading days to compute placebo benchmark.',
    };
  }

  // Group eligible days by expiry
  const eligibleByExpiry = new Map<string, EligibleDay[]>();
  eligiblePool.forEach((item) => {
    if (!eligibleByExpiry.has(item.expiry)) {
      eligibleByExpiry.set(item.expiry, []);
    }
    eligibleByExpiry.get(item.expiry)!.push(item);
  });

  const prng = createMulberry32(seed);
  const simulatedNetPnls: number[] = new Array(drawsCount);

  // Group of active expiries that have eligible days
  const activeExpiriesList = Array.from(eligibleByExpiry.keys());

  for (let draw = 0; draw < drawsCount; draw++) {
    let totalSimulatedNetPnl = 0;

    for (const exp of activeExpiriesList) {
      const candidates = eligibleByExpiry.get(exp)!;
      const randomIdx = Math.floor(prng() * candidates.length);
      const chosen = candidates[randomIdx];

      // Calculate trade P&L
      let pnlA_perG = 0;
      let pnlB_perG = 0;
      if (chosen.isLongA) {
        pnlA_perG = chosen.exitPriceA - chosen.openA_norm;
        pnlB_perG = chosen.openB_norm - chosen.exitPriceB;
      } else {
        pnlA_perG = chosen.openA_norm - chosen.exitPriceA;
        pnlB_perG = chosen.exitPriceB - chosen.openB_norm;
      }

      const grossPnl = (pnlA_perG + pnlB_perG) * hedgeSpec.grams;

      let costEntryA = 0;
      let costEntryB = 0;
      let costExitA = 0;
      let costExitB = 0;

      if (chosen.isLongA) {
        costEntryA = calculateSingleLegBuyCost(hedgeSpec.grams, chosen.openA_norm, costs.brokeragePerOrder, costs).totalCost;
        costEntryB = calculateSingleLegSellCost(hedgeSpec.grams, chosen.openB_norm, costs.brokeragePerOrder, costs).totalCost;
        costExitA = calculateSingleLegSellCost(hedgeSpec.grams, chosen.exitPriceA, costs.brokeragePerOrder, costs).totalCost;
        costExitB = calculateSingleLegBuyCost(hedgeSpec.grams, chosen.exitPriceB, costs.brokeragePerOrder, costs).totalCost;
      } else {
        costEntryA = calculateSingleLegSellCost(hedgeSpec.grams, chosen.openA_norm, costs.brokeragePerOrder, costs).totalCost;
        costEntryB = calculateSingleLegBuyCost(hedgeSpec.grams, chosen.openB_norm, costs.brokeragePerOrder, costs).totalCost;
        costExitA = calculateSingleLegBuyCost(hedgeSpec.grams, chosen.exitPriceA, costs.brokeragePerOrder, costs).totalCost;
        costExitB = calculateSingleLegSellCost(hedgeSpec.grams, chosen.exitPriceB, costs.brokeragePerOrder, costs).totalCost;
      }

      const tradeCosts = costEntryA + costEntryB + costExitA + costExitB;
      totalSimulatedNetPnl += grossPnl - tradeCosts;
    }

    simulatedNetPnls[draw] = totalSimulatedNetPnl;
  }

  // Sort to compute empirical percentiles
  simulatedNetPnls.sort((a, b) => a - b);

  const idxP5 = Math.floor(drawsCount * 0.05);
  const idxP95 = Math.floor(drawsCount * 0.95);
  const idxMedian = Math.floor(drawsCount * 0.5);

  const p5 = simulatedNetPnls[idxP5];
  const p95 = simulatedNetPnls[idxP95];
  const median = simulatedNetPnls[idxMedian];
  const mean = simulatedNetPnls.reduce((a, b) => a + b, 0) / drawsCount;

  let relationship: 'ABOVE_P95' | 'BELOW_P5' | 'INSIDE_RANGE' = 'INSIDE_RANGE';
  let isInsideRange = true;
  let verdictStatement = '';

  if (actualNetPnl > p95) {
    relationship = 'ABOVE_P95';
    isInsideRange = false;
    verdictStatement = `OUTSIDE RANGE (ABOVE 95th PERCENTILE): Actual net P&L (₹${actualNetPnl.toFixed(1)}) exceeds the 95th percentile (₹${p95.toFixed(1)}) of random entries, confirming statistically significant edge over random timing.`;
  } else if (actualNetPnl < p5) {
    relationship = 'BELOW_P5';
    isInsideRange = false;
    verdictStatement = `OUTSIDE RANGE (BELOW 5th PERCENTILE): Actual net P&L (₹${actualNetPnl.toFixed(1)}) is below the 5th percentile (₹${p5.toFixed(1)}) of random timing.`;
  } else {
    relationship = 'INSIDE_RANGE';
    isInsideRange = true;
    verdictStatement = `INSIDE RANGE: Actual net P&L (₹${actualNetPnl.toFixed(1)}) lies within the 5th–95th percentile range [₹${p5.toFixed(1)}, ₹${p95.toFixed(1)}], consistent with the distribution of random valid entries.`;
  }

  return {
    pairKey,
    drawsCount,
    seed,
    eligibleDaysCount: eligiblePool.length,
    p5,
    p95,
    median,
    mean,
    actualNetPnl,
    isInsideRange,
    relationship,
    verdictStatement,
  };
}

/**
 * Runs the full backtest & evidence suite for a pair
 */
export function runFullBacktest(
  pairKey: VerdictPairKey,
  allActiveRows: ParsedGoldContractRow[],
  quarantinedRecords: QuarantineRecord[],
  costs: CostAssumptions = DEFAULT_COST_ASSUMPTIONS,
  marginPct?: number
): FullBacktestResult {
  const hedgeSpec = HEDGE_SPECS[pairKey];
  const legASymbol = hedgeSpec.legA;
  const legBSymbol = hedgeSpec.legB;

  // Identify all expiries where both legs are present
  const expiriesA = new Set(allActiveRows.filter((r) => r.symbol === legASymbol).map((r) => r.expiry));
  const candidateExpiries = Array.from(
    new Set(allActiveRows.filter((r) => r.symbol === legBSymbol && expiriesA.has(r.expiry)).map((r) => r.expiry))
  ).sort((a, b) => {
    const rowA = allActiveRows.find((r) => r.expiry === a);
    const rowB = allActiveRows.find((r) => r.expiry === b);
    const isoA = rowA?.expiryIsoDate || a;
    const isoB = rowB?.expiryIsoDate || b;
    return isoA.localeCompare(isoB);
  });

  const trades: BacktestTrade[] = candidateExpiries.map((exp) =>
    simulateRuleAForExpiry(pairKey, exp, allActiveRows, quarantinedRecords, costs, marginPct)
  );

  const devTrades = trades.filter((t) => t.isDev);
  const unseenTrades = trades.filter((t) => !t.isDev);

  const devSummary = summarizeTradeGroup('development', devTrades, marginPct);
  const unseenSummary = summarizeTradeGroup('unseen', unseenTrades, marginPct);
  const totalSummary = summarizeTradeGroup('total', trades, marginPct);

  // Compute attribution per expiry
  const attributions = candidateExpiries.map((exp) =>
    computeExpiryAttribution(pairKey, exp, allActiveRows)
  );

  // Placebo test
  const placebo = runPlaceboTest(
    pairKey,
    allActiveRows,
    quarantinedRecords,
    costs,
    totalSummary.netPnl,
    42,
    5000
  );

  return {
    pairKey,
    hedgeSpec,
    trades,
    devTrades,
    unseenTrades,
    devSummary,
    unseenSummary,
    totalSummary,
    attributions,
    placebo,
    marginPct,
  };
}
