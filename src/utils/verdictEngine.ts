import {
  VERDICT_CONSTANTS,
  HEDGE_SPECS,
  CostAssumptions,
  DEFAULT_COST_ASSUMPTIONS,
  HedgeSpec,
} from '../config/contracts';
import { ParsedGoldContractRow, QuarantineRecord } from '../types/bhavcopy';
import { getTenderWindowInfo } from './spreadCalculator';

export type VerdictStatus = 'TRADE' | 'NO TRADE' | 'DATA INVALID';

export interface SingleLegCostBreakdown {
  turnover: number;
  exchange: number;
  stamp: number;
  ctt: number;
  sebi: number;
  gst: number;
  brokerage: number;
  slippage: number;
  totalCost: number;
}

export interface PairRoundTripCosts {
  turnoverPerLegSide: number;
  totalTurnover: number;
  exchangeFee: number;
  stampDuty: number;
  ctt: number;
  sebiFee: number;
  brokerage: number;
  gst: number;
  slippage: number;
  totalCostINR: number;
  costPerGram: number;
  hedgeGrams: number;
}

export interface CostWaterfallItem {
  name: string;
  amountINR: number;
  perGramINR: number;
  type: 'positive' | 'negative' | 'total';
  note?: string;
}

export interface VerdictResult {
  status: VerdictStatus;
  pairKey: string;
  expiry: string;
  date: string;
  isoDate: string;
  hedgeSpec: HedgeSpec;
  currentGap: number;
  trailingMean: number;
  trailingSd: number;
  zScore: number;
  grossEdgePerG: number;
  grossEdgeINR: number;
  roundTripCosts: PairRoundTripCosts;
  netEdgePerG: number;
  netEdgeINR: number;
  edgeCostRatio: number;
  reasons: string[];
  failedGates: string[];
  direction?: {
    action: string;
    legABuySell: 'BUY' | 'SELL';
    legBBuySell: 'BUY' | 'SELL';
    legA: string;
    legB: string;
    description: string;
  };
  lookbackDates: string[];
  costWaterfall: CostWaterfallItem[];
  quarantinedRecordInLookback?: QuarantineRecord;
}

/**
 * Calculates buy-side friction for a single leg
 */
export function calculateSingleLegBuyCost(
  grams: number,
  pricePerG: number,
  brokerage: number = 0,
  costs: CostAssumptions = DEFAULT_COST_ASSUMPTIONS
): SingleLegCostBreakdown {
  const turnover = grams * pricePerG;
  const exchange = turnover * (costs.exchangeRatePct / 100);
  const stamp = turnover * (costs.stampDutyBuyPct / 100);
  const sebi = turnover * (costs.sebiFeePerCrore / 10000000);
  const gst = (brokerage + exchange + sebi) * (costs.gstPct / 100);
  const effectiveSlippage = costs.isSlippageStressed ? costs.slippagePerG * 4 : costs.slippagePerG;
  const slippage = effectiveSlippage * grams;
  const totalCost = exchange + stamp + sebi + gst + brokerage + slippage;

  return {
    turnover,
    exchange,
    stamp,
    ctt: 0,
    sebi,
    gst,
    brokerage,
    slippage,
    totalCost,
  };
}

/**
 * Calculates sell-side friction for a single leg
 */
export function calculateSingleLegSellCost(
  grams: number,
  pricePerG: number,
  brokerage: number = 0,
  costs: CostAssumptions = DEFAULT_COST_ASSUMPTIONS
): SingleLegCostBreakdown {
  const turnover = grams * pricePerG;
  const exchange = turnover * (costs.exchangeRatePct / 100);
  const ctt = turnover * (costs.cttSellPct / 100);
  const sebi = turnover * (costs.sebiFeePerCrore / 10000000);
  const gst = (brokerage + exchange + sebi) * (costs.gstPct / 100);
  const effectiveSlippage = costs.isSlippageStressed ? costs.slippagePerG * 4 : costs.slippagePerG;
  const slippage = effectiveSlippage * grams;
  const totalCost = exchange + ctt + sebi + gst + brokerage + slippage;

  return {
    turnover,
    exchange,
    stamp: 0,
    ctt,
    sebi,
    gst,
    brokerage,
    slippage,
    totalCost,
  };
}

/**
 * Calculates round-trip arbitrage costs for a hedged pair:
 * Round-trip entails 4 leg executions:
 * - Leg A: 1 Buy + 1 Sell
 * - Leg B: 1 Buy + 1 Sell
 */
export function calculatePairRoundTripCosts(
  hedgeGrams: number,
  averagePricePerG: number,
  costs: CostAssumptions
): PairRoundTripCosts {
  const turnoverPerLegSide = hedgeGrams * averagePricePerG;
  const totalTurnover = turnoverPerLegSide * 4;

  // 4 leg sides (2 buy, 2 sell)
  const exchangeFee = totalTurnover * (costs.exchangeRatePct / 100);
  // 2 buy sides
  const stampDuty = turnoverPerLegSide * 2 * (costs.stampDutyBuyPct / 100);
  // 2 sell sides
  const ctt = turnoverPerLegSide * 2 * (costs.cttSellPct / 100);
  // 4 leg sides
  const sebiFee = totalTurnover * (costs.sebiFeePerCrore / 10000000);
  // 4 orders
  const brokerage = costs.brokeragePerOrder * 4;
  // GST on (brokerage + exchange fee + sebi fee)
  const gst = (brokerage + exchangeFee + sebiFee) * (costs.gstPct / 100);

  const effectiveSlippagePerG = costs.isSlippageStressed
    ? costs.slippagePerG * 4
    : costs.slippagePerG;
  // Slippage per leg per side: 4 leg sides
  const slippage = effectiveSlippagePerG * hedgeGrams * 4;

  const totalCostINR = exchangeFee + stampDuty + ctt + sebiFee + brokerage + gst + slippage;
  const costPerGram = totalCostINR / hedgeGrams;

  return {
    turnoverPerLegSide,
    totalTurnover,
    exchangeFee,
    stampDuty,
    ctt,
    sebiFee,
    brokerage,
    gst,
    slippage,
    totalCostINR,
    costPerGram,
    hedgeGrams,
  };
}

/**
 * Evaluates the verdict for a pair, expiry, and date
 * Strictly enforces no look-ahead: only rows dated <= date are considered.
 */
export type VerdictPairKey = 'TEN-GUINEA' | 'TEN-PETAL' | 'GUINEA-PETAL' | 'PETAL-GUINEA';

export interface VerdictChartPoint {
  date: string;
  isoDate: string;
  gap: number;
  trailingMean: number;
  upperCostBand: number;
  lowerCostBand: number;
  upperZBand?: number;
  lowerZBand?: number;
  isLookback: boolean;
  isTarget: boolean;
  volKgA: number;
  volKgB: number;
  isLiquid: boolean;
}

export function evaluateVerdict(
  pairKey: VerdictPairKey,
  expiry: string,
  targetDateStr: string,
  allActiveRows: ParsedGoldContractRow[],
  quarantinedRecords: QuarantineRecord[],
  costs: CostAssumptions = DEFAULT_COST_ASSUMPTIONS
): VerdictResult {
  const hedgeSpec =
    HEDGE_SPECS[pairKey] ||
    (pairKey === 'PETAL-GUINEA' ? HEDGE_SPECS['PETAL-GUINEA'] : HEDGE_SPECS['TEN-GUINEA']);

  const legASymbol = hedgeSpec.legA;
  const legBSymbol = hedgeSpec.legB;

  // RULE: "uses only rows dated on or before that date"
  const rowsUpToDate = allActiveRows.filter((r) => r.date === targetDateStr || r.isoDate <= targetDateStr);
  const targetRow = allActiveRows.find((r) => r.date === targetDateStr);
  const targetIsoDate = targetRow ? targetRow.isoDate : targetDateStr;

  // Filter rows strictly <= targetIsoDate
  const priorRows = allActiveRows.filter((r) => r.isoDate <= targetIsoDate);

  // Group by (symbol, expiry)
  const legARows = priorRows
    .filter((r) => r.symbol === legASymbol && r.expiry === expiry)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const legBRows = priorRows
    .filter((r) => r.symbol === legBSymbol && r.expiry === expiry)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const legBByDate = new Map<string, ParsedGoldContractRow>();
  legBRows.forEach((r) => legBByDate.set(r.isoDate, r));

  // Match dates where both legs exist
  interface PairedDay {
    date: string;
    isoDate: string;
    gap: number;
    priceA: number;
    priceB: number;
    volKgA: number;
    volKgB: number;
  }

  const pairedDays: PairedDay[] = [];
  for (const rA of legARows) {
    const rB = legBByDate.get(rA.isoDate);
    if (rB) {
      pairedDays.push({
        date: rA.date,
        isoDate: rA.isoDate,
        gap: rA.price_999_per_g - rB.price_999_per_g,
        priceA: rA.price_999_per_g,
        priceB: rB.price_999_per_g,
        volKgA: rA.volume_kg,
        volKgB: rB.volume_kg,
      });
    }
  }

  // Find index of target day in matched days
  const targetIndex = pairedDays.findIndex(
    (d) => d.date === targetDateStr || d.isoDate === targetIsoDate
  );

  const lookbackCount = VERDICT_CONSTANTS.LOOKBACK; // 20
  const failedGates: string[] = [];
  const reasons: string[] = [];

  // If target day not found in common dates
  if (targetIndex === -1) {
    return {
      status: 'NO TRADE',
      pairKey,
      expiry,
      date: targetDateStr,
      isoDate: targetIsoDate,
      hedgeSpec,
      currentGap: 0,
      trailingMean: 0,
      trailingSd: 0,
      zScore: 0,
      grossEdgePerG: 0,
      grossEdgeINR: 0,
      roundTripCosts: calculatePairRoundTripCosts(hedgeSpec.grams, 15000, costs),
      netEdgePerG: 0,
      netEdgeINR: 0,
      edgeCostRatio: 0,
      reasons: [`Target date ${targetDateStr} not found in validated trading days for ${pairKey} ${expiry}`],
      failedGates: ['insufficient history'],
      lookbackDates: [],
      costWaterfall: [],
    };
  }

  // Slice trailing lookback window (up to and including targetIndex)
  const windowStart = Math.max(0, targetIndex - lookbackCount + 1);
  const lookbackSlice = pairedDays.slice(windowStart, targetIndex + 1);
  const lookbackDates = lookbackSlice.map((d) => d.date);
  const lookbackIsoDates = new Set(lookbackSlice.map((d) => d.isoDate));

  // --- CHECK 1: DATA INVALID check ---
  // "DATA INVALID if any quarantined row for either leg falls on that date or inside the lookback window."
  const quarantinedInWindow = quarantinedRecords.find((q) => {
    const isRelevantLeg = (q.symbol === legASymbol || q.symbol === legBSymbol) && q.expiry === expiry;
    if (!isRelevantLeg) return false;
    // Check if on date or inside lookback window
    return lookbackDates.includes(q.date) || q.date === targetDateStr;
  });

  if (quarantinedInWindow) {
    const roundTrip = calculatePairRoundTripCosts(hedgeSpec.grams, 15000, costs);
    return {
      status: 'DATA INVALID',
      pairKey,
      expiry,
      date: targetDateStr,
      isoDate: targetIsoDate,
      hedgeSpec,
      currentGap: pairedDays[targetIndex].gap,
      trailingMean: 0,
      trailingSd: 0,
      zScore: 0,
      grossEdgePerG: 0,
      grossEdgeINR: 0,
      roundTripCosts: roundTrip,
      netEdgePerG: 0,
      netEdgeINR: 0,
      edgeCostRatio: 0,
      reasons: [
        `DATA INVALID: Quarantined row (${quarantinedInWindow.check}) for ${quarantinedInWindow.symbol} on ${quarantinedInWindow.date} falls within lookback window.`,
      ],
      failedGates: ['quarantine invariant violated'],
      lookbackDates,
      costWaterfall: [],
      quarantinedRecordInLookback: quarantinedInWindow,
    };
  }

  // --- GATE 1: Insufficient History ---
  if (lookbackSlice.length < lookbackCount) {
    failedGates.push(`insufficient history (${lookbackSlice.length} days available < ${lookbackCount} required)`);
  }

  // Calculate trailing mean and sample standard deviation over lookback window
  const gaps = lookbackSlice.map((d) => d.gap);
  const sumGap = gaps.reduce((acc, g) => acc + g, 0);
  const trailingMean = gaps.length > 0 ? sumGap / gaps.length : 0;

  let trailingSd = 0;
  if (gaps.length > 1) {
    const variance = gaps.reduce((acc, g) => acc + Math.pow(g - trailingMean, 2), 0) / (gaps.length - 1);
    trailingSd = Math.sqrt(variance);
  }

  const currentDay = pairedDays[targetIndex];
  const currentGap = currentDay.gap;
  const zScore = trailingSd > 0 ? (currentGap - trailingMean) / trailingSd : 0;

  // Tender window check for this contract
  // "no entry inside the tender window or on the last pre-tender day"
  const allTradingDatesForExpiry = Array.from(
    new Set(allActiveRows.filter((r) => r.expiry === expiry).map((r) => r.date))
  ).sort((a, b) => {
    const isoA = allActiveRows.find((r) => r.date === a)?.isoDate || a;
    const isoB = allActiveRows.find((r) => r.date === b)?.isoDate || b;
    return isoA.localeCompare(isoB);
  });

  const tenderInfo = getTenderWindowInfo(allTradingDatesForExpiry, legARows[0]?.expiryIsoDate || '');
  const isInsideTenderWindow = tenderInfo.tenderDates.includes(currentDay.date);
  const isLastPreTenderDay = currentDay.date === tenderInfo.lastPreTenderDate;

  // --- GATE 2: Tender window ---
  if (isInsideTenderWindow) {
    failedGates.push(`tender window (date ${currentDay.date} is in tender window)`);
  }
  if (isLastPreTenderDay) {
    failedGates.push(`last pre-tender day (date ${currentDay.date} is the last pre-tender day)`);
  }

  // --- GATE 3: Thin leg ---
  if (currentDay.volKgA < VERDICT_CONSTANTS.LIQUID_KG || currentDay.volKgB < VERDICT_CONSTANTS.LIQUID_KG) {
    failedGates.push(
      `thin leg (${legASymbol}: ${currentDay.volKgA.toFixed(2)} kg, ${legBSymbol}: ${currentDay.volKgB.toFixed(2)} kg < ${VERDICT_CONSTANTS.LIQUID_KG} kg threshold)`
    );
  }

  // --- GATE 4: Z too small ---
  if (Math.abs(zScore) < VERDICT_CONSTANTS.Z_ENTRY) {
    failedGates.push(`z too small (|${zScore.toFixed(2)}| < ${VERDICT_CONSTANTS.Z_ENTRY})`);
  }

  // Edge and Costs calculations
  const avgPrice = (currentDay.priceA + currentDay.priceB) / 2;
  const roundTripCosts = calculatePairRoundTripCosts(hedgeSpec.grams, avgPrice, costs);

  const grossEdgePerG = Math.abs(currentGap - trailingMean);
  const grossEdgeINR = grossEdgePerG * hedgeSpec.grams;
  const netEdgeINR = grossEdgeINR - roundTripCosts.totalCostINR;
  const netEdgePerG = grossEdgePerG - roundTripCosts.costPerGram;

  const edgeCostRatio = roundTripCosts.totalCostINR > 0 ? grossEdgeINR / roundTripCosts.totalCostINR : 0;

  // --- GATE 5: Expected edge below 3x round-trip cost ---
  if (edgeCostRatio < VERDICT_CONSTANTS.EDGE_COST_MULTIPLE) {
    failedGates.push(
      `expected edge below ${VERDICT_CONSTANTS.EDGE_COST_MULTIPLE}x round-trip cost (gross edge ₹${grossEdgeINR.toFixed(1)} is ${edgeCostRatio.toFixed(2)}x cost, requires $\ge$ ${VERDICT_CONSTANTS.EDGE_COST_MULTIPLE}x = ₹${(roundTripCosts.totalCostINR * 3).toFixed(1)})`
    );
  }

  // Cost Waterfall items
  const costWaterfall: CostWaterfallItem[] = [
    {
      name: 'Gross Expected Edge',
      amountINR: grossEdgeINR,
      perGramINR: grossEdgePerG,
      type: 'positive',
      note: `|gap (${currentGap.toFixed(1)}) − mean (${trailingMean.toFixed(1)})| × ${hedgeSpec.grams}g`,
    },
    {
      name: 'Exchange Fee (0.0021% × 4)',
      amountINR: -roundTripCosts.exchangeFee,
      perGramINR: -roundTripCosts.exchangeFee / hedgeSpec.grams,
      type: 'negative',
    },
    {
      name: 'Stamp Duty (0.002% on buys)',
      amountINR: -roundTripCosts.stampDuty,
      perGramINR: -roundTripCosts.stampDuty / hedgeSpec.grams,
      type: 'negative',
    },
    {
      name: 'CTT (0.01% on sells)',
      amountINR: -roundTripCosts.ctt,
      perGramINR: -roundTripCosts.ctt / hedgeSpec.grams,
      type: 'negative',
    },
    {
      name: 'SEBI Regulatory Fee',
      amountINR: -roundTripCosts.sebiFee,
      perGramINR: -roundTripCosts.sebiFee / hedgeSpec.grams,
      type: 'negative',
    },
    {
      name: 'GST (18% on fees)',
      amountINR: -roundTripCosts.gst,
      perGramINR: -roundTripCosts.gst / hedgeSpec.grams,
      type: 'negative',
    },
    {
      name: 'Brokerage (₹/order)',
      amountINR: -roundTripCosts.brokerage,
      perGramINR: -roundTripCosts.brokerage / hedgeSpec.grams,
      type: 'negative',
    },
    {
      name: `Slippage (${costs.isSlippageStressed ? 'Stressed 4x' : 'Base'})`,
      amountINR: -roundTripCosts.slippage,
      perGramINR: -roundTripCosts.slippage / hedgeSpec.grams,
      type: 'negative',
    },
    {
      name: 'Net Executable Edge',
      amountINR: netEdgeINR,
      perGramINR: netEdgePerG,
      type: 'total',
      note: netEdgeINR > 0 ? 'Friction hurdle cleared' : 'Friction exceeds edge',
    },
  ];

  // Verdict decision
  if (failedGates.length > 0) {
    return {
      status: 'NO TRADE',
      pairKey,
      expiry,
      date: targetDateStr,
      isoDate: targetIsoDate,
      hedgeSpec,
      currentGap,
      trailingMean,
      trailingSd,
      zScore,
      grossEdgePerG,
      grossEdgeINR,
      roundTripCosts,
      netEdgePerG,
      netEdgeINR,
      edgeCostRatio,
      reasons: failedGates,
      failedGates,
      lookbackDates,
      costWaterfall,
    };
  }

  // All gates passed: TRADE!
  // "direction: gap below its mean: buy the cheaper leg, sell the other; above: the reverse"
  let directionDescription = '';
  let legABuySell: 'BUY' | 'SELL' = 'BUY';
  let legBBuySell: 'BUY' | 'SELL' = 'SELL';

  if (currentGap < trailingMean) {
    // gap = LegA - LegB is below mean -> LegA is undervalued relative to LegB
    legABuySell = 'BUY';
    legBBuySell = 'SELL';
    directionDescription = `Gap is below trailing mean (z = ${zScore.toFixed(2)}): BUY ${hedgeSpec.lotsA} lots ${legASymbol} (${hedgeSpec.grams}g), SELL ${hedgeSpec.lotsB} lots ${legBSymbol} (${hedgeSpec.grams}g)`;
  } else {
    // gap = LegA - LegB is above mean -> LegA is overvalued relative to LegB
    legABuySell = 'SELL';
    legBBuySell = 'BUY';
    directionDescription = `Gap is above trailing mean (z = +${zScore.toFixed(2)}): SELL ${hedgeSpec.lotsA} lots ${legASymbol} (${hedgeSpec.grams}g), BUY ${hedgeSpec.lotsB} lots ${legBSymbol} (${hedgeSpec.grams}g)`;
  }

  return {
    status: 'TRADE',
    pairKey,
    expiry,
    date: targetDateStr,
    isoDate: targetIsoDate,
    hedgeSpec,
    currentGap,
    trailingMean,
    trailingSd,
    zScore,
    grossEdgePerG,
    grossEdgeINR,
    roundTripCosts,
    netEdgePerG,
    netEdgeINR,
    edgeCostRatio,
    reasons: [
      `Z-score |${zScore.toFixed(2)}| $\ge$ ${VERDICT_CONSTANTS.Z_ENTRY}`,
      `Gross edge ₹${grossEdgeINR.toFixed(1)} $\ge$ 3x round-trip cost (ratio ${edgeCostRatio.toFixed(2)}x)`,
      `Both legs liquid ($\ge$ ${VERDICT_CONSTANTS.LIQUID_KG} kg)`,
      `Outside tender window and pre-tender day`,
      `20-day trailing lookback validated with zero quarantines`,
    ],
    failedGates: [],
    direction: {
      action: `${legABuySell} ${legASymbol} / ${legBBuySell} ${legBSymbol}`,
      legABuySell,
      legBBuySell,
      legA: legASymbol,
      legB: legBSymbol,
      description: directionDescription,
    },
    lookbackDates,
    costWaterfall,
  };
}

/**
 * Computes time series for the "Live Edge vs Friction" chart.
 * Strictly respects no look-ahead: only includes dates <= targetDateStr.
 */
export function computeVerdictSeries(
  pairKey: VerdictPairKey,
  expiry: string,
  targetDateStr: string,
  allActiveRows: ParsedGoldContractRow[],
  costs: CostAssumptions = DEFAULT_COST_ASSUMPTIONS
): VerdictChartPoint[] {
  const hedgeSpec =
    HEDGE_SPECS[pairKey] ||
    (pairKey === 'PETAL-GUINEA' ? HEDGE_SPECS['PETAL-GUINEA'] : HEDGE_SPECS['TEN-GUINEA']);

  const targetRow = allActiveRows.find((r) => r.date === targetDateStr);
  const targetIsoDate = targetRow ? targetRow.isoDate : targetDateStr;

  const priorRows = allActiveRows.filter((r) => r.isoDate <= targetIsoDate);

  const legARows = priorRows
    .filter((r) => r.symbol === hedgeSpec.legA && r.expiry === expiry)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const legBRows = priorRows
    .filter((r) => r.symbol === hedgeSpec.legB && r.expiry === expiry)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  const legBByDate = new Map<string, ParsedGoldContractRow>();
  legBRows.forEach((r) => legBByDate.set(r.isoDate, r));

  interface MatchedItem {
    date: string;
    isoDate: string;
    gap: number;
    priceA: number;
    priceB: number;
    volA: number;
    volB: number;
  }

  const matched: MatchedItem[] = [];
  for (const rA of legARows) {
    const rB = legBByDate.get(rA.isoDate);
    if (rB) {
      matched.push({
        date: rA.date,
        isoDate: rA.isoDate,
        gap: rA.price_999_per_g - rB.price_999_per_g,
        priceA: rA.price_999_per_g,
        priceB: rB.price_999_per_g,
        volA: rA.volume_kg,
        volB: rB.volume_kg,
      });
    }
  }

  const targetIndex = matched.findIndex(
    (d) => d.date === targetDateStr || d.isoDate === targetIsoDate
  );

  const lookbackStart = targetIndex >= 0 ? Math.max(0, targetIndex - VERDICT_CONSTANTS.LOOKBACK + 1) : 0;

  const points: VerdictChartPoint[] = [];

  for (let i = 0; i < matched.length; i++) {
    const item = matched[i];
    // Trailing lookback window up to index i
    const windowStart = Math.max(0, i - VERDICT_CONSTANTS.LOOKBACK + 1);
    const windowSlice = matched.slice(windowStart, i + 1);

    const sumGap = windowSlice.reduce((acc, curr) => acc + curr.gap, 0);
    const trailingMean = sumGap / windowSlice.length;

    // Approximate round-trip cost per gram based on average price
    const avgPrice = (item.priceA + item.priceB) / 2;
    const roundTrip = calculatePairRoundTripCosts(hedgeSpec.grams, avgPrice, costs);
    const costPerG = roundTrip.costPerGram;

    // Standard deviation if window >= 2
    let sd = 0;
    if (windowSlice.length > 1) {
      const variance =
        windowSlice.reduce((acc, curr) => acc + Math.pow(curr.gap - trailingMean, 2), 0) /
        (windowSlice.length - 1);
      sd = Math.sqrt(variance);
    }

    const isLookback = targetIndex >= 0 && i >= lookbackStart && i <= targetIndex;
    const isTarget = i === targetIndex;

    points.push({
      date: item.date,
      isoDate: item.isoDate,
      gap: Number(item.gap.toFixed(2)),
      trailingMean: Number(trailingMean.toFixed(2)),
      upperCostBand: Number((trailingMean + costPerG).toFixed(2)),
      lowerCostBand: Number((trailingMean - costPerG).toFixed(2)),
      upperZBand: sd > 0 ? Number((trailingMean + VERDICT_CONSTANTS.Z_ENTRY * sd).toFixed(2)) : undefined,
      lowerZBand: sd > 0 ? Number((trailingMean - VERDICT_CONSTANTS.Z_ENTRY * sd).toFixed(2)) : undefined,
      isLookback,
      isTarget,
      volKgA: item.volA,
      volKgB: item.volB,
      isLiquid: item.volA >= VERDICT_CONSTANTS.LIQUID_KG && item.volB >= VERDICT_CONSTANTS.LIQUID_KG,
    });
  }

  return points;
}

