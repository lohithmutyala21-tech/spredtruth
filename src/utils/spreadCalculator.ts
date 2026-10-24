import { SPREAD_CONFIG } from '../config/contracts';
import { ParsedGoldContractRow, ContractSummary } from '../types/bhavcopy';

export interface MatchedSpreadDay {
  date: string;
  isoDate: string;
  tenPrice: number;
  guineaPrice: number;
  petalPrice: number;
  tenVolKg: number;
  guineaVolKg: number;
  petalVolKg: number;
  isLiquid: boolean;
  gapTenGuinea: number;
  gapPetalGuinea: number;
  gapTenPetal: number;
  isTenderWindow: boolean;
  isLastPreTenderDay: boolean;
  isFinalDay: boolean;
}

export interface ExpirySpreadSummary {
  expiry: string;
  expiryIsoDate: string;
  tradingDaysCount: number;
  liquidDaysCount: number;
  lastPreTenderDate: string;
  firstTenderDate: string;
  finalDate: string;
  tenderDates: string[];

  // TEN-GUINEA
  tenGuineaMedianLiquid: number | null;
  tenGuineaLastPreTender: number | null;
  tenGuineaFinal: number | null;

  // PETAL-GUINEA
  petalGuineaMedianLiquid: number | null;
  petalGuineaLastPreTender: number | null;
  petalGuineaFinal: number | null;

  // TEN-PETAL
  tenPetalMedianLiquid: number | null;
  tenPetalLastPreTender: number | null;
  tenPetalFinal: number | null;

  matchedDays: MatchedSpreadDay[];
}

export interface SkippedExpiryInfo {
  expiry: string;
  missingLegs: string[];
}

export interface MonthlyVolumeStats {
  monthKey: string; // "2026-04"
  monthLabel: string; // "Apr 2026"
  tradingDays: number;
  totalVolKg: number;
  avgDailyVolKg: number;
}

export interface ContractLifecycleAnalysis {
  contractKey: string;
  symbol: string;
  expiry: string;
  firstDate: string;
  lastDate: string;
  tradingDaysCount: number;
  tenderWindowDays: number;
  tenderDates: string[];
  lastPreTenderDate: string;
  firstTenderDate: string;
  monthlyVolume: MonthlyVolumeStats[];
  peakOiDate: string;
  peakOiLots: number;
  peakOiKg: number;
  lastPreTenderOiLots: number | null;
  lastPreTenderOiKg: number | null;
  firstTenderOiLots: number | null;
  firstTenderOiKg: number | null;
  tenderOiChangePct: number | null;
  history: ParsedGoldContractRow[];
}

export function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculates tender window and last pre-tender day for a sequence of trading dates
 */
export function getTenderWindowInfo(sortedDates: string[], expiryIsoDate: string) {
  const tenderLength =
    expiryIsoDate >= '2026-01-01'
      ? SPREAD_CONFIG.TENDER_DAYS_POST_2026
      : SPREAD_CONFIG.TENDER_DAYS_PRE_2026;

  const totalDays = sortedDates.length;
  if (totalDays === 0) {
    return {
      tenderDates: [],
      firstTenderDate: '',
      lastPreTenderDate: '',
      finalDate: '',
      tenderLength,
    };
  }

  const actualTenderCount = Math.min(tenderLength, totalDays);
  const tenderDates = sortedDates.slice(totalDays - actualTenderCount);
  const firstTenderDate = tenderDates[0] || '';
  const finalDate = sortedDates[totalDays - 1] || '';
  const lastPreTenderIndex = totalDays - actualTenderCount - 1;
  const lastPreTenderDate = lastPreTenderIndex >= 0 ? sortedDates[lastPreTenderIndex] : '';

  return {
    tenderDates,
    firstTenderDate,
    lastPreTenderDate,
    finalDate,
    tenderLength,
  };
}

/**
 * Computes Spreads for all loaded expiries where GOLDTEN, GOLDGUINEA, and GOLDPETAL are present.
 * Uses only rows that passed validation.
 */
export function computeSpreadsDataset(activeRows: ParsedGoldContractRow[]) {
  // Group rows by contract key `${symbol}_${expiry}`
  const contractMap = new Map<string, ParsedGoldContractRow[]>();
  const allExpiries = new Set<string>();

  for (const row of activeRows) {
    const key = `${row.symbol}_${row.expiry}`;
    if (!contractMap.has(key)) {
      contractMap.set(key, []);
    }
    contractMap.get(key)!.push(row);
    allExpiries.add(row.expiry);
  }

  const validSummaries: ExpirySpreadSummary[] = [];
  const skippedExpiries: SkippedExpiryInfo[] = [];

  const sortedExpiries = Array.from(allExpiries).sort();

  for (const expiry of sortedExpiries) {
    const tenRows = contractMap.get(`GOLDTEN_${expiry}`) || [];
    const guineaRows = contractMap.get(`GOLDGUINEA_${expiry}`) || [];
    const petalRows = contractMap.get(`GOLDPETAL_${expiry}`) || [];

    const missingLegs: string[] = [];
    if (tenRows.length === 0) missingLegs.push('GOLDTEN');
    if (guineaRows.length === 0) missingLegs.push('GOLDGUINEA');
    if (petalRows.length === 0) missingLegs.push('GOLDPETAL');

    if (missingLegs.length > 0) {
      skippedExpiries.push({ expiry, missingLegs });
      continue;
    }

    // Index rows by isoDate for fast intersection
    const guineaByDate = new Map<string, ParsedGoldContractRow>();
    guineaRows.forEach((r) => guineaByDate.set(r.isoDate, r));

    const petalByDate = new Map<string, ParsedGoldContractRow>();
    petalRows.forEach((r) => petalByDate.set(r.isoDate, r));

    // Common dates across all 3 legs
    const commonDays: MatchedSpreadDay[] = [];
    // Sort tenRows chronologically
    const sortedTen = [...tenRows].sort((a, b) => a.isoDate.localeCompare(b.isoDate));

    for (const rTen of sortedTen) {
      const rGuinea = guineaByDate.get(rTen.isoDate);
      const rPetal = petalByDate.get(rTen.isoDate);

      if (rGuinea && rPetal) {
        // Liquid when all 3 legs traded >= LIQUID_KG (5 kg) that day
        const isLiquid =
          rTen.volume_kg >= SPREAD_CONFIG.LIQUID_KG &&
          rGuinea.volume_kg >= SPREAD_CONFIG.LIQUID_KG &&
          rPetal.volume_kg >= SPREAD_CONFIG.LIQUID_KG;

        // Gap = price_999_per_g difference
        const gapTenGuinea = rTen.price_999_per_g - rGuinea.price_999_per_g;
        const gapPetalGuinea = rPetal.price_999_per_g - rGuinea.price_999_per_g;
        const gapTenPetal = rTen.price_999_per_g - rPetal.price_999_per_g;

        commonDays.push({
          date: rTen.date,
          isoDate: rTen.isoDate,
          tenPrice: rTen.price_999_per_g,
          guineaPrice: rGuinea.price_999_per_g,
          petalPrice: rPetal.price_999_per_g,
          tenVolKg: rTen.volume_kg,
          guineaVolKg: rGuinea.volume_kg,
          petalVolKg: rPetal.volume_kg,
          isLiquid,
          gapTenGuinea,
          gapPetalGuinea,
          gapTenPetal,
          isTenderWindow: false,
          isLastPreTenderDay: false,
          isFinalDay: false,
        });
      }
    }

    if (commonDays.length === 0) {
      skippedExpiries.push({ expiry, missingLegs: ['No overlapping trading dates'] });
      continue;
    }

    const expiryIso = sortedTen[0].expiryIsoDate;
    const sortedDates = commonDays.map((d) => d.date);
    const tenderInfo = getTenderWindowInfo(sortedDates, expiryIso);

    // Annotate days with tender flags
    commonDays.forEach((d) => {
      d.isTenderWindow = tenderInfo.tenderDates.includes(d.date);
      d.isLastPreTenderDay = d.date === tenderInfo.lastPreTenderDate;
      d.isFinalDay = d.date === tenderInfo.finalDate;
    });

    // Liquid days metrics (includes all liquid days, tender and pre-tender)
    const liquidDays = commonDays.filter((d) => d.isLiquid);
    const tenGuineaLiquidGaps = liquidDays.map((d) => d.gapTenGuinea);
    const petalGuineaLiquidGaps = liquidDays.map((d) => d.gapPetalGuinea);
    const tenPetalLiquidGaps = liquidDays.map((d) => d.gapTenPetal);

    const lastPreTenderDay = commonDays.find((d) => d.isLastPreTenderDay);
    const finalDay = commonDays.find((d) => d.isFinalDay);

    validSummaries.push({
      expiry,
      expiryIsoDate: expiryIso,
      tradingDaysCount: commonDays.length,
      liquidDaysCount: liquidDays.length,
      lastPreTenderDate: tenderInfo.lastPreTenderDate,
      firstTenderDate: tenderInfo.firstTenderDate,
      finalDate: tenderInfo.finalDate,
      tenderDates: tenderInfo.tenderDates,

      tenGuineaMedianLiquid: computeMedian(tenGuineaLiquidGaps),
      tenGuineaLastPreTender: lastPreTenderDay ? lastPreTenderDay.gapTenGuinea : null,
      tenGuineaFinal: finalDay ? finalDay.gapTenGuinea : null,

      petalGuineaMedianLiquid: computeMedian(petalGuineaLiquidGaps),
      petalGuineaLastPreTender: lastPreTenderDay ? lastPreTenderDay.gapPetalGuinea : null,
      petalGuineaFinal: finalDay ? finalDay.gapPetalGuinea : null,

      tenPetalMedianLiquid: computeMedian(tenPetalLiquidGaps),
      tenPetalLastPreTender: lastPreTenderDay ? lastPreTenderDay.gapTenPetal : null,
      tenPetalFinal: finalDay ? finalDay.gapTenPetal : null,

      matchedDays: commonDays,
    });
  }

  return {
    validSummaries,
    skippedExpiries,
    totalExpiriesLoaded: validSummaries.length,
    persistentEdgeWarning:
      validSummaries.length < SPREAD_CONFIG.MIN_PERSISTENT_EDGE_EXPIRIES
        ? 'Too few expiries to claim a persistent edge.'
        : null,
  };
}

/**
 * Computes Lifecycle statistics and charts dataset for a specific contract
 */
export function computeContractLifecycle(
  contract: ContractSummary
): ContractLifecycleAnalysis {
  const sortedRows = [...contract.rows].sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  const sortedDates = sortedRows.map((r) => r.date);
  const tenderInfo = getTenderWindowInfo(sortedDates, contract.expiryIsoDate);

  // Group by calendar month for average daily volume
  const monthMap = new Map<string, { days: number; totalVolKg: number; monthLabel: string }>();
  const monthsAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let peakOiLots = 0;
  let peakOiKg = 0;
  let peakOiDate = '';

  for (const r of sortedRows) {
    if (r.openInterestLots > peakOiLots) {
      peakOiLots = r.openInterestLots;
      peakOiKg = r.oi_kg;
      peakOiDate = r.date;
    }

    const monthKey = r.isoDate.slice(0, 7); // "YYYY-MM"
    if (!monthMap.has(monthKey)) {
      const year = r.isoDate.slice(0, 4);
      const mIdx = parseInt(r.isoDate.slice(5, 7), 10) - 1;
      const monthLabel = `${monthsAbbr[mIdx]} ${year}`;
      monthMap.set(monthKey, { days: 0, totalVolKg: 0, monthLabel });
    }
    const mEntry = monthMap.get(monthKey)!;
    mEntry.days++;
    mEntry.totalVolKg += r.volume_kg;
  }

  const monthlyVolume: MonthlyVolumeStats[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, val]) => ({
      monthKey,
      monthLabel: val.monthLabel,
      tradingDays: val.days,
      totalVolKg: val.totalVolKg,
      avgDailyVolKg: val.days > 0 ? val.totalVolKg / val.days : 0,
    }));

  // Open interest on last pre-tender day vs first tender day
  const preTenderRow = sortedRows.find((r) => r.date === tenderInfo.lastPreTenderDate);
  const firstTenderRow = sortedRows.find((r) => r.date === tenderInfo.firstTenderDate);

  const lastPreTenderOiLots = preTenderRow ? preTenderRow.openInterestLots : null;
  const lastPreTenderOiKg = preTenderRow ? preTenderRow.oi_kg : null;
  const firstTenderOiLots = firstTenderRow ? firstTenderRow.openInterestLots : null;
  const firstTenderOiKg = firstTenderRow ? firstTenderRow.oi_kg : null;

  let tenderOiChangePct: number | null = null;
  if (lastPreTenderOiLots !== null && firstTenderOiLots !== null && lastPreTenderOiLots > 0) {
    tenderOiChangePct = ((firstTenderOiLots - lastPreTenderOiLots) / lastPreTenderOiLots) * 100;
  }

  return {
    contractKey: contract.contractKey,
    symbol: contract.symbol,
    expiry: contract.expiry,
    firstDate: contract.firstDate,
    lastDate: contract.lastDate,
    tradingDaysCount: contract.tradingDaysCount,
    tenderWindowDays: tenderInfo.tenderLength,
    tenderDates: tenderInfo.tenderDates,
    lastPreTenderDate: tenderInfo.lastPreTenderDate,
    firstTenderDate: tenderInfo.firstTenderDate,
    monthlyVolume,
    peakOiDate,
    peakOiLots,
    peakOiKg,
    lastPreTenderOiLots,
    lastPreTenderOiKg,
    firstTenderOiLots,
    firstTenderOiKg,
    tenderOiChangePct,
    history: sortedRows,
  };
}
