/**
 * Central Configuration for SpreadTruth
 * All contract tables, conversion rates, thresholds, and trading cost parameters
 * reside exclusively in this file.
 */

export interface GoldContractSpec {
  symbol: string;
  name: string;
  lotGrams: number;
  quoteBaseGrams: number;
  purity: number; // e.g., 995 for GOLDM, 999 for GOLDTEN, GOLDGUINEA, GOLDPETAL
  deliveryLocation: string;
  description: string;
}

export const GOLD_CONTRACT_SPECS: Record<string, GoldContractSpec> = {
  GOLDM: {
    symbol: 'GOLDM',
    name: 'Gold Mini (100g)',
    lotGrams: 100,
    quoteBaseGrams: 10,
    purity: 995,
    deliveryLocation: 'Ahmedabad',
    description: '100g contract quoted per 10g at 995 purity',
  },
  GOLDTEN: {
    symbol: 'GOLDTEN',
    name: 'Gold Ten (10g)',
    lotGrams: 10,
    quoteBaseGrams: 10,
    purity: 999,
    deliveryLocation: 'Ahmedabad (unverified)',
    description: '10g contract quoted per 10g at 999 purity',
  },
  GOLDGUINEA: {
    symbol: 'GOLDGUINEA',
    name: 'Gold Guinea (8g)',
    lotGrams: 8,
    quoteBaseGrams: 8,
    purity: 999,
    deliveryLocation: 'Ahmedabad',
    description: '8g contract quoted per 8g at 999 purity',
  },
  GOLDPETAL: {
    symbol: 'GOLDPETAL',
    name: 'Gold Petal (1g)',
    lotGrams: 1,
    quoteBaseGrams: 1,
    purity: 999,
    deliveryLocation: 'Mumbai',
    description: '1g contract quoted per 1g at 999 purity',
  },
};

export const ALLOWED_INSTRUMENT = 'FUTCOM';
export const ALLOWED_GOLD_SYMBOLS = ['GOLDM', 'GOLDTEN', 'GOLDGUINEA', 'GOLDPETAL'] as const;
export type AllowedGoldSymbol = typeof ALLOWED_GOLD_SYMBOLS[number];

/**
 * Data Truth Validation Thresholds
 */
export const DATA_TRUTH_THRESHOLDS = {
  JUMP_PCT: 3, // 3% jump threshold
  THIN_LOTS: 1000, // 1000 lots thin-day threshold
};

/**
 * Spread & Lifecycle Configuration
 */
export const SPREAD_CONFIG = {
  LIQUID_KG: 5, // A day is liquid when all three legs traded at least 5 kg that day
  TENDER_WINDOW_RULE_NOTE: 'verify against MCX circulars',
  TENDER_DAYS_POST_2026: 3, // For expiries from 2026-01-01: last 3 trading days
  TENDER_DAYS_PRE_2026: 5, // For earlier expiries: last 5 trading days
  MIN_PERSISTENT_EDGE_EXPIRIES: 10, // When n < 10, warn "Too few expiries to claim a persistent edge."
};

/**
 * Pre-committed Verdict Constants (Never tune)
 */
export const VERDICT_CONSTANTS = {
  LOOKBACK: 20, // 20 trading days (trailing only)
  Z_ENTRY: 2.0,
  EDGE_COST_MULTIPLE: 3, // expected edge must exceed 3x round-trip cost
  LIQUID_KG: 5, // 5 kg minimum volume per leg on date
};

/**
 * Backtest & Evidence Configuration
 * DEV_EXPIRIES in config = ["31JUL2026","31AUG2026","30SEP2026"] (inspected while building the rule).
 * Every other expiry with all three legs is UNSEEN.
 */
export const DEV_EXPIRIES = ['31JUL2026', '31AUG2026', '30SEP2026'] as const;
export type DevExpiry = typeof DEV_EXPIRIES[number];

export function isDevExpiry(expiry: string): boolean {
  return (DEV_EXPIRIES as readonly string[]).includes(expiry);
}

/**
 * Source Verifier Items
 * Pre-filled URLs:
 * tender window → https://fyers.in/notice-board/precious-metals-expiry-30th-january-2026-compulsory-delivery-contracts/
 * fee rates → https://support.rupeezy.in/support/solutions/articles/2100044913-what-are-mcx-transaction-and-other-charges-as-per-exchange-and-government
 * GOLDTEN delivery centre → no URL, marked "enter manually"
 * Do not invent other URLs. Never point at mcxindia.com or mcxccl.com.
 */
export interface VerifyItemConfig {
  id: string;
  name: string;
  category: 'FEE' | 'TENDER' | 'DELIVERY';
  ourCurrentValue: string;
  sourceUrl?: string;
  sourceLabel: string;
  targetKeyword: string;
  parseField: string;
}

export const VERIFY_ITEMS: VerifyItemConfig[] = [
  {
    id: 'exchange-rate',
    name: 'MCX Exchange Turnover Fee',
    category: 'FEE',
    ourCurrentValue: '0.0021% of value per leg per side',
    sourceUrl: 'https://support.rupeezy.in/support/solutions/articles/2100044913-what-are-mcx-transaction-and-other-charges-as-per-exchange-and-government',
    sourceLabel: 'Rupeezy MCX Charges Article',
    targetKeyword: '0.0021%',
    parseField: '0.0021%',
  },
  {
    id: 'stamp-duty',
    name: 'Stamp Duty Rate (Buy Side)',
    category: 'FEE',
    ourCurrentValue: '0.002% on buy side',
    sourceUrl: 'https://support.rupeezy.in/support/solutions/articles/2100044913-what-are-mcx-transaction-and-other-charges-as-per-exchange-and-government',
    sourceLabel: 'Rupeezy MCX Charges Article',
    targetKeyword: '0.002%',
    parseField: '0.002%',
  },
  {
    id: 'ctt-rate',
    name: 'Commodities Transaction Tax (CTT)',
    category: 'FEE',
    ourCurrentValue: '0.01% on sell side',
    sourceUrl: 'https://support.rupeezy.in/support/solutions/articles/2100044913-what-are-mcx-transaction-and-other-charges-as-per-exchange-and-government',
    sourceLabel: 'Rupeezy MCX Charges Article',
    targetKeyword: '0.01%',
    parseField: '0.01%',
  },
  {
    id: 'sebi-fee',
    name: 'SEBI Regulatory Fee Rate',
    category: 'FEE',
    ourCurrentValue: '₹10 per crore of turnover per leg per side',
    sourceUrl: 'https://support.rupeezy.in/support/solutions/articles/2100044913-what-are-mcx-transaction-and-other-charges-as-per-exchange-and-government',
    sourceLabel: 'Rupeezy MCX Charges Article',
    targetKeyword: '10 per crore',
    parseField: '₹10 / crore',
  },
  {
    id: 'gst-rate',
    name: 'GST Rate on Exchange & Brokerage Fees',
    category: 'FEE',
    ourCurrentValue: '18% on (brokerage + exchange charge + SEBI fee)',
    sourceUrl: 'https://support.rupeezy.in/support/solutions/articles/2100044913-what-are-mcx-transaction-and-other-charges-as-per-exchange-and-government',
    sourceLabel: 'Rupeezy MCX Charges Article',
    targetKeyword: '18%',
    parseField: '18%',
  },
  {
    id: 'tender-window',
    name: 'Tender Window Length',
    category: 'TENDER',
    ourCurrentValue: '3 trading days (for expiries from 2026-01-01)',
    sourceUrl: 'https://fyers.in/notice-board/precious-metals-expiry-30th-january-2026-compulsory-delivery-contracts/',
    sourceLabel: 'FYERS Notice Board (Precious Metals Delivery)',
    targetKeyword: 'tender',
    parseField: '3 trading days',
  },
  {
    id: 'tender-effective-date',
    name: 'Tender Window Effective Date & Pre-2026 Rule',
    category: 'TENDER',
    ourCurrentValue: 'Effective date 2026-01-01 & 5 days before 2026',
    sourceUrl: 'https://fyers.in/notice-board/precious-metals-expiry-30th-january-2026-compulsory-delivery-contracts/',
    sourceLabel: 'FYERS Notice Board (Precious Metals Delivery)',
    targetKeyword: 'effective',
    parseField: 'effective date',
  },
  {
    id: 'goldten-delivery',
    name: "GOLDTEN's Delivery Centre",
    category: 'DELIVERY',
    ourCurrentValue: 'Ahmedabad (unverified in contract spec)',
    sourceUrl: undefined,
    sourceLabel: 'enter manually',
    targetKeyword: 'Ahmedabad',
    parseField: 'manual check',
  },
];

/**
 * Hedge Sizes & Grams per Pair
 */
export interface HedgeSpec {
  pairKey: string;
  legA: string;
  legB: string;
  lotsA: number;
  lotsB: number;
  grams: number;
  label: string;
}

export const HEDGE_SPECS: Record<string, HedgeSpec> = {
  'TEN-GUINEA': {
    pairKey: 'TEN-GUINEA',
    legA: 'GOLDTEN',
    legB: 'GOLDGUINEA',
    lotsA: 4,
    lotsB: 5,
    grams: 40,
    label: '4 lots GOLDTEN (40g) vs 5 lots GOLDGUINEA (40g)',
  },
  'TEN-PETAL': {
    pairKey: 'TEN-PETAL',
    legA: 'GOLDTEN',
    legB: 'GOLDPETAL',
    lotsA: 1,
    lotsB: 10,
    grams: 10,
    label: '1 lot GOLDTEN (10g) vs 10 lots GOLDPETAL (10g)',
  },
  'GUINEA-PETAL': {
    pairKey: 'GUINEA-PETAL',
    legA: 'GOLDGUINEA',
    legB: 'GOLDPETAL',
    lotsA: 1,
    lotsB: 8,
    grams: 8,
    label: '1 lot GOLDGUINEA (8g) vs 8 lots GOLDPETAL (8g)',
  },
  'PETAL-GUINEA': {
    pairKey: 'PETAL-GUINEA',
    legA: 'GOLDPETAL',
    legB: 'GOLDGUINEA',
    lotsA: 8,
    lotsB: 1,
    grams: 8,
    label: '8 lots GOLDPETAL (8g) vs 1 lot GOLDGUINEA (8g)',
  },
};

/**
 * Default Editable Cost Assumptions (labeled "assumptions, verify with MCX / broker")
 */
export interface CostAssumptions {
  exchangeRatePct: number; // 0.0021% of value per leg per side
  stampDutyBuyPct: number; // 0.002% on the buy side
  cttSellPct: number; // 0.01% on the sell side
  sebiFeePerCrore: number; // ₹10 per crore of turnover per leg per side
  brokeragePerOrder: number; // ₹ per order (default 0)
  gstPct: number; // 18% on (brokerage + exchange charge + SEBI fee)
  slippagePerG: number; // ₹/g per leg per side (default 0.5)
  isSlippageStressed: boolean; // Stress x4 toggle
}

export const DEFAULT_COST_ASSUMPTIONS: CostAssumptions = {
  exchangeRatePct: 0.0021,
  stampDutyBuyPct: 0.002,
  cttSellPct: 0.01,
  sebiFeePerCrore: 10,
  brokeragePerOrder: 0,
  gstPct: 18.0,
  slippagePerG: 0.5,
  isSlippageStressed: false,
};

/**
 * Pair Comparison Quality Configurations
 */
export interface PairQualitySpec {
  pairKey: string;
  legA: string;
  legB: string;
  name: string;
  purityMatch: boolean;
  purityDetail: string;
  expiryMatch: boolean;
  expiryDetail: string;
  locationMatch: boolean;
  locationDetail: string;
  overallQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  note?: string;
}

export const PAIR_COMPARISON_SPECS: PairQualitySpec[] = [
  {
    pairKey: 'TEN-GUINEA',
    legA: 'GOLDTEN',
    legB: 'GOLDGUINEA',
    name: 'GOLDTEN vs GOLDGUINEA',
    purityMatch: true,
    purityDetail: '999 vs 999 identical purity',
    expiryMatch: true,
    expiryDetail: 'Standard month-end expiry match',
    locationMatch: false,
    locationDetail: 'Ahmedabad (unverified) vs Ahmedabad',
    overallQuality: 'MEDIUM',
  },
  {
    pairKey: 'PETAL-GUINEA',
    legA: 'GOLDPETAL',
    legB: 'GOLDGUINEA',
    name: 'GOLDPETAL vs GOLDGUINEA',
    purityMatch: true,
    purityDetail: '999 vs 999 identical purity',
    expiryMatch: true,
    expiryDetail: 'Standard month-end expiry match',
    locationMatch: false,
    locationDetail: 'Mumbai vs Ahmedabad (location basis risk)',
    overallQuality: 'MEDIUM',
  },
  {
    pairKey: 'TEN-PETAL',
    legA: 'GOLDTEN',
    legB: 'GOLDPETAL',
    name: 'GOLDTEN vs GOLDPETAL',
    purityMatch: true,
    purityDetail: '999 vs 999 identical purity',
    expiryMatch: true,
    expiryDetail: 'Standard month-end expiry match',
    locationMatch: false,
    locationDetail: 'Ahmedabad (unverified) vs Mumbai',
    overallQuality: 'MEDIUM',
  },
  {
    pairKey: 'GOLDM-GOLDTEN',
    legA: 'GOLDM',
    legB: 'GOLDTEN',
    name: 'GOLDM vs GOLDTEN',
    purityMatch: false,
    purityDetail: '995 vs 999 purity basis',
    expiryMatch: false,
    expiryDetail: '05th of month vs month-end expiry',
    locationMatch: false,
    locationDetail: 'Ahmedabad vs Ahmedabad (unverified)',
    overallQuality: 'LOW',
    note: 'Carry model is future work (different expiry schedules & purity standard)',
  },
  {
    pairKey: 'GOLDM-GOLDGUINEA',
    legA: 'GOLDM',
    legB: 'GOLDGUINEA',
    name: 'GOLDM vs GOLDGUINEA',
    purityMatch: false,
    purityDetail: '995 vs 999 purity basis',
    expiryMatch: false,
    expiryDetail: '05th of month vs month-end expiry',
    locationMatch: true,
    locationDetail: 'Ahmedabad vs Ahmedabad',
    overallQuality: 'LOW',
    note: 'Carry model is future work (different expiry schedules & purity standard)',
  },
  {
    pairKey: 'GOLDM-GOLDPETAL',
    legA: 'GOLDM',
    legB: 'GOLDPETAL',
    name: 'GOLDM vs GOLDPETAL',
    purityMatch: false,
    purityDetail: '995 vs 999 purity basis',
    expiryMatch: false,
    expiryDetail: '05th of month vs month-end expiry',
    locationMatch: false,
    locationDetail: 'Ahmedabad vs Mumbai',
    overallQuality: 'LOW',
    note: 'Carry model is future work (different expiry schedules & purity standard)',
  },
];

/**
 * Operational / Anomaly thresholds
 */
export const THRESHOLDS = {
  minLiquidVolumeKg: 0.05,
  maxNormalSpreadBps: 150,
  zeroVolumeWarning: true,
};

/**
 * Acceptance criteria definitions for Self-Check Tab
 */
export const ACCEPTANCE_SPECS = {
  check1: {
    targetDate: '01 Oct 2026',
    expectedTotalRows: 15104,
    expectedTrimmedRows: 15104,
    expectedGoldRows: 24,
    title: 'Check 1: 01 Oct 2026 File Row Integrity & Symbol Trimming',
    description: 'A loaded file with Date 01 Oct 2026 has 15,104 rows, all 15,104 needed symbol trimming, and 24 gold-future rows remain after filtering.',
  },
  check2: {
    targetDate: '01 Oct 2026',
    title: 'Check 2: Normalized 999 Price per Gram Exactness',
    description: 'From 01 Oct 2026 file, 30OCT2026 price_999_per_g (1 decimal): GOLDTEN 14943.6, GOLDGUINEA 14999.1, GOLDPETAL 15002.0; GOLDM 05NOV2026 14965.4.',
    contracts: [
      { symbol: 'GOLDTEN', expiry: '30OCT2026', expectedPrice999PerG: 14943.6 },
      { symbol: 'GOLDGUINEA', expiry: '30OCT2026', expectedPrice999PerG: 14999.1 },
      { symbol: 'GOLDPETAL', expiry: '30OCT2026', expectedPrice999PerG: 15002.0 },
      { symbol: 'GOLDM', expiry: '05NOV2026', expectedPrice999PerG: 14965.4 },
    ],
  },
  check3: {
    symbols: ['GOLDTEN', 'GOLDGUINEA', 'GOLDPETAL'],
    expiries: ['31JUL2026', '31AUG2026', '30SEP2026'],
    expectedRowsPerContract: 130,
    title: 'Check 3: Historical Contract Lifecycle Completeness (130 Trading Days)',
    description: 'Each loaded file holding GOLDTEN, GOLDGUINEA or GOLDPETAL for 31JUL2026, 31AUG2026 or 30SEP2026 has exactly 130 rows for one symbol and one expiry.',
  },
  check4: {
    title: 'Check 4: Data Truth Validation Rules (V3, V4, V5, V6) on Contract Files',
    description: 'For the contract files V3 = 0 everywhere; V4 and V5 each equal 1 for GOLDGUINEA 30SEP2026, GOLDTEN 31AUG2026 and GOLDGUINEA 31JUL2026 and 0 for the other six. V6 counts: GOLDGUINEA 30SEP2026 = 1, GOLDPETAL 30SEP2026 = 0, GOLDTEN 30SEP2026 = 1, GOLDGUINEA 31AUG2026 = 2, GOLDPETAL 31AUG2026 = 0, GOLDTEN 31AUG2026 = 3, GOLDGUINEA 31JUL2026 = 5, GOLDPETAL 31JUL2026 = 0, GOLDTEN 31JUL2026 = 4.',
    targetContracts: [
      { symbol: 'GOLDGUINEA', expiry: '30SEP2026', expectedV3: 0, expectedV4: 1, expectedV5: 1, expectedV6: 1 },
      { symbol: 'GOLDPETAL', expiry: '30SEP2026', expectedV3: 0, expectedV4: 0, expectedV5: 0, expectedV6: 0 },
      { symbol: 'GOLDTEN', expiry: '30SEP2026', expectedV3: 0, expectedV4: 0, expectedV5: 0, expectedV6: 1 },
      { symbol: 'GOLDGUINEA', expiry: '31AUG2026', expectedV3: 0, expectedV4: 0, expectedV5: 0, expectedV6: 2 },
      { symbol: 'GOLDPETAL', expiry: '31AUG2026', expectedV3: 0, expectedV4: 0, expectedV5: 0, expectedV6: 0 },
      { symbol: 'GOLDTEN', expiry: '31AUG2026', expectedV3: 0, expectedV4: 1, expectedV5: 1, expectedV6: 3 },
      { symbol: 'GOLDGUINEA', expiry: '31JUL2026', expectedV3: 0, expectedV4: 1, expectedV5: 1, expectedV6: 5 },
      { symbol: 'GOLDPETAL', expiry: '31JUL2026', expectedV3: 0, expectedV4: 0, expectedV5: 0, expectedV6: 0 },
      { symbol: 'GOLDTEN', expiry: '31JUL2026', expectedV3: 0, expectedV4: 0, expectedV5: 0, expectedV6: 4 },
    ],
  },
  check5: {
    title: 'Check 5: Spreads & Lifecycle Metrics Across Expiries',
    description: 'TEN-GUINEA (median / last pre-tender / final, 1 decimal): Jul 2026 -80.4 / -13.2 / -53.2; Aug 2026 -69.3 / -33.2 / -163.8; Sep 2026 -68.8 / -15.3 / -97.0. PETAL-GUINEA final-day gap: Jul +135.8, Aug -65.6, Sep -37.8. Liquid-day counts 72, 68, 72. Last pre-tender days: 28 Jul, 26 Aug, 25 Sep 2026. GOLDTEN 30SEP2026: first date 01 Apr 2026, 130 trading days, open interest in lots 15,921 on 24 Sep, 6,451 on 25 Sep, 2,997 on 28 Sep, 568 on 30 Sep.',
    expiries: [
      {
        monthLabel: 'Jul 2026',
        expiry: '31JUL2026',
        expectedTenGuineaMedian: -80.4,
        expectedTenGuineaPreTender: -13.2,
        expectedTenGuineaFinal: -53.2,
        expectedPetalGuineaFinal: 135.8,
        expectedLiquidDays: 72,
        expectedPreTenderDate: '28 Jul 2026',
      },
      {
        monthLabel: 'Aug 2026',
        expiry: '31AUG2026',
        expectedTenGuineaMedian: -69.3,
        expectedTenGuineaPreTender: -33.2,
        expectedTenGuineaFinal: -163.8,
        expectedPetalGuineaFinal: -65.6,
        expectedLiquidDays: 68,
        expectedPreTenderDate: '26 Aug 2026',
      },
      {
        monthLabel: 'Sep 2026',
        expiry: '30SEP2026',
        expectedTenGuineaMedian: -68.8,
        expectedTenGuineaPreTender: -15.3,
        expectedTenGuineaFinal: -97.0,
        expectedPetalGuineaFinal: -37.8,
        expectedLiquidDays: 72,
        expectedPreTenderDate: '25 Sep 2026',
      },
    ],
    goldtenSepLifecycle: {
      symbol: 'GOLDTEN',
      expiry: '30SEP2026',
      expectedFirstDate: '01 Apr 2026',
      expectedTradingDays: 130,
      expectedOiLots: [
        { date: '24 Sep 2026', expectedOi: 15921 },
        { date: '25 Sep 2026', expectedOi: 6451 },
        { date: '28 Sep 2026', expectedOi: 2997 },
        { date: '30 Sep 2026', expectedOi: 568 },
      ],
    },
  },
  check6: {
    title: 'Check 6: Cost Waterfall Arithmetic, No Look-Ahead, & Quarantine Invariant',
    description: '(1) Buying 40 g at ₹15,000/g (₹600,000) with brokerage 0 costs exchange ₹12.60, stamp ₹12.00, SEBI ₹0.60, GST ₹2.376; (2) Selling it costs exchange ₹12.60, CTT ₹60.00, SEBI ₹0.60, GST ₹2.376; (3) No look-ahead: for a sample date, removing every row after it does not change the verdict; (4) A synthetic quarantined row inside the lookback window gives DATA INVALID.',
    costBenchmark: {
      grams: 40,
      pricePerG: 15000,
      value: 600000,
      expectedBuy: {
        exchange: 12.60,
        stamp: 12.00,
        sebi: 0.60,
        gst: 2.376,
      },
      expectedSell: {
        exchange: 12.60,
        ctt: 60.00,
        sebi: 0.60,
        gst: 2.376,
      },
    },
  },
  check7: {
    title: 'Check 7: Backtest Evidence, Deterministic Placebo, & Invariants',
    description: '(1) The placebo gives identical results on repeated runs (seeded PRNG, seed 42); (2) A blank Open means no trade; (3) Adding an unseen expiry does not change any development result; (4) The beta function returns slope 2.0 on a synthetic series where the gap is exactly 2x the GUINEA price.',
  },
};
