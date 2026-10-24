import { GoldContractSpec } from '../config/contracts';

export interface RawBhavcopyRow {
  Date: string;
  'Instrument Name': string;
  Symbol: string;
  'Expiry Date': string;
  'Option Type': string;
  'Strike Price': string;
  Open: string;
  High: string;
  Low: string;
  Close: string;
  'Previous Close': string;
  'Volume(Lots)': string;
  'Volume(In 000\'s)': string;
  'Value(Lacs)': string;
  'Open Interest(Lots)': string;
}

export interface AnomalyItem {
  id: string;
  type: 'error' | 'warning' | 'info';
  fileName: string;
  rowNumber?: number;
  message: string;
  details?: string;
  date?: string;
  symbol?: string;
  expiry?: string;
}

export interface ParsedGoldContractRow {
  id: string;
  rowNumber?: number;
  date: string; // e.g. "01 Oct 2026"
  isoDate: string; // e.g. "2026-10-01"
  symbol: string; // trimmed e.g. "GOLDTEN"
  rawSymbol: string; // original e.g. "GOLDTEN      "
  symbolWasTrimmed: boolean;
  expiry: string; // e.g. "30OCT2026"
  expiryIsoDate: string; // e.g. "2026-10-30"
  instrument: string; // "FUTCOM"
  optionType: string;
  strikePrice: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  prevClose: number | null;
  volumeLots: number;
  valueLacs: number | null;
  openInterestLots: number;
  sourceFileName: string; // display reference only

  // Exact formulas:
  // price_999_per_g = Close / quoteBaseGrams * 999 / purity
  // volume_kg = Volume(Lots) * lotGrams / 1000
  // oi_kg = Open Interest(Lots) * lotGrams / 1000
  price_999_per_g: number;
  volume_kg: number;
  oi_kg: number;

  spec: GoldContractSpec;

  // Data Truth flags on this row
  isQuarantined?: boolean;
  quarantineReason?: string;
  quarantineCheck?: 'V2' | 'V3';
  flags?: ('V4' | 'V5' | 'V6')[];
  flagNotes?: string[];
}

export interface QuarantineRecord {
  id: string;
  check: 'V2' | 'V3';
  checkLabel: string;
  file: string;
  date: string;
  symbol: string;
  expiry: string;
  detail: string;
  action: string; // "Quarantined (removed from analysis)"
  rowNumber?: number;
  closePrice?: number;
}

export interface FlaggedRecord {
  id: string;
  check: 'V4' | 'V5' | 'V6';
  checkLabel: string;
  file: string;
  date: string;
  symbol: string;
  expiry: string;
  detail: string;
  action: string; // "Flagged (kept for analysis)"
  rowNumber?: number;
  closePrice?: number;
}

export interface ContractTruthSummary {
  symbol: string;
  expiry: string;
  contractKey: string;
  totalRows: number;
  v1Count: number; // symbol padding trimmed
  v2Count: number; // duplicate quarantine
  v3Count: number; // range quarantine
  v4Count: number; // prev close diff
  v5Count: number; // zero volume settlement
  v6Count: number; // thin-day jump
  totalQuarantined: number;
  totalFlagged: number;
}

export interface DateMismatchReport {
  hasMismatch: boolean;
  requestedDate: string;
  normalizedRequestedDate: string;
  firstOffendingRow?: {
    fileName: string;
    rowNumber?: number;
    rowDate: string;
    symbol: string;
    expiry: string;
    close: number;
  };
}

export interface DuplicateContractWarning {
  symbol: string;
  expiry: string;
  fileNames: string[];
}

export interface LegsPerExpirySummary {
  expiry: string;
  legs: {
    GOLDTEN: boolean;
    GOLDGUINEA: boolean;
    GOLDPETAL: boolean;
  };
  missingLegs: string[];
}

export interface FileParseReport {
  id: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
  rowsTrimmed: number;
  goldRowsKept: number;
  ignoredRows: number;
  detectedDates: string[]; // strictly derived from row data
  contractRows: ParsedGoldContractRow[];
  symbolCounts: Record<string, number>;
  anomalies: AnomalyItem[];
  symbolExpiryCounts: Record<string, number>;
}

export interface ContractSummary {
  contractKey: string; // `${symbol}_${expiry}`
  symbol: string;
  expiry: string;
  expiryIsoDate: string;
  tradingDaysCount: number;
  firstDate: string;
  lastDate: string;
  latestClose: number;
  latestPrice999PerG: number;
  totalVolumeLots: number;
  totalVolumeKg: number;
  latestOiLots: number;
  latestOiKg: number;
  rows: ParsedGoldContractRow[];
}

export interface MergedDataset {
  files: FileParseReport[];
  totalFiles: number;
  totalRows: number;
  totalRowsTrimmed: number;
  totalRowsIgnored: number;
  totalGoldRows: number;
  contracts: ContractSummary[];
  allGoldRows: ParsedGoldContractRow[]; // Active non-quarantined rows
  allDates: string[]; // unique ISO dates ascending
  contractDaysMap: Map<string, ParsedGoldContractRow>; // key: `${date}_${symbol}_${expiry}`
  anomalies: AnomalyItem[];

  // Data Truth Layer:
  overallBadge: 'DATA VALID' | 'DATA INVALID';
  quarantinedRecords: QuarantineRecord[];
  flaggedRecords: FlaggedRecord[];
  truthSummariesByContract: ContractTruthSummary[];
  duplicateContractWarnings: DuplicateContractWarning[];
  legsPerExpiry: LegsPerExpirySummary[];
  dateMismatchReport: DateMismatchReport;
}
