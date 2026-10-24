import {
  ALLOWED_INSTRUMENT,
  ALLOWED_GOLD_SYMBOLS,
  GOLD_CONTRACT_SPECS,
  AllowedGoldSymbol,
  DATA_TRUTH_THRESHOLDS,
  THRESHOLDS,
} from '../config/contracts';
import {
  FileParseReport,
  ParsedGoldContractRow,
  AnomalyItem,
  MergedDataset,
  ContractSummary,
  QuarantineRecord,
  FlaggedRecord,
  ContractTruthSummary,
  DateMismatchReport,
  DuplicateContractWarning,
  LegsPerExpirySummary,
} from '../types/bhavcopy';

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

/**
 * Normalizes any date string (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD Mon YYYY) into ISO "YYYY-MM-DD"
 */
export function normalizeAnyDate(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();

  // Format: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Format: YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Format: DD Mon YYYY (e.g. "01 Oct 2026")
  const parts = trimmed.split(/[\s-]+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = MONTH_MAP[parts[1].toLowerCase()];
    if (month) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${month}-${day}`;
    }
  }

  return trimmed;
}

export function parseDateToISO(dateStr: string): string {
  return normalizeAnyDate(dateStr);
}

export function parseExpiryToISO(expiryStr: string): string {
  if (!expiryStr) return '';
  const clean = expiryStr.trim();
  const match = clean.match(/^(\d{2})([A-Za-z]{3})(\d{4})$/);
  if (match) {
    const day = match[1];
    const month = MONTH_MAP[match[2].toLowerCase()] || '01';
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  return clean;
}

/**
 * RFC-4180 compliant CSV line parser supporting quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parses a single MCX Bhavcopy CSV content string
 * Strictly never uses file name as data.
 */
export function parseBhavcopyCSV(
  fileContent: string,
  fileName: string,
  fileSize: number
): FileParseReport {
  const anomalies: AnomalyItem[] = [];

  try {
    const lines = fileContent.split(/\r?\n/);

    let headerIndex = -1;
    let headers: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      const parsed = parseCSVLine(trimmed).map((h) => h.trim().replace(/^"|"$/g, ''));
      if (parsed.includes('Date') && parsed.includes('Symbol') && parsed.includes('Close')) {
        headerIndex = i;
        headers = parsed;
        break;
      }
    }

    if (headerIndex === -1) {
      anomalies.push({
        id: `${fileName}-no-header`,
        type: 'error',
        fileName,
        message: 'Missing standard MCX Bhavcopy header row.',
        details: 'Required columns: Date, Instrument Name, Symbol, Expiry Date, Close, Volume(Lots), etc.',
      });
      return {
        id: `${fileName}-${Date.now()}`,
        fileName,
        fileSize,
        totalRows: 0,
        rowsTrimmed: 0,
        goldRowsKept: 0,
        ignoredRows: 0,
        detectedDates: [],
        contractRows: [],
        symbolCounts: {},
        anomalies,
        symbolExpiryCounts: {},
      };
    }

  const colIndex = {
    date: headers.indexOf('Date'),
    instrument: headers.indexOf('Instrument Name'),
    symbol: headers.indexOf('Symbol'),
    expiry: headers.indexOf('Expiry Date'),
    optionType: headers.indexOf('Option Type'),
    strikePrice: headers.indexOf('Strike Price'),
    open: headers.indexOf('Open'),
    high: headers.indexOf('High'),
    low: headers.indexOf('Low'),
    close: headers.indexOf('Close'),
    prevClose: headers.indexOf('Previous Close'),
    volLots: headers.indexOf('Volume(Lots)'),
    valueLacs: headers.indexOf('Value(Lacs)'),
    oiLots: headers.indexOf('Open Interest(Lots)'),
  };

  let totalDataRows = 0;
  let rowsTrimmed = 0;
  let goldRowsKept = 0;
  let ignoredRows = 0;
  const contractRows: ParsedGoldContractRow[] = [];
  const detectedDatesSet = new Set<string>();
  const symbolCounts: Record<string, number> = {};
  const symbolExpiryCounts: Record<string, number> = {};

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    totalDataRows++;
    const rowCells = parseCSVLine(line).map((c) => c.replace(/^"|"$/g, ''));

    const rawDate = rowCells[colIndex.date] ?? '';
    const rawInstrument = rowCells[colIndex.instrument] ?? '';
    const rawSymbol = rowCells[colIndex.symbol] ?? '';
    const rawExpiry = rowCells[colIndex.expiry] ?? '';
    const rawClose = rowCells[colIndex.close] ?? '';
    const rawVolLots = rowCells[colIndex.volLots] ?? '0';
    const rawOiLots = rowCells[colIndex.oiLots] ?? '0';
    const rawOpen = rowCells[colIndex.open] ?? '';
    const rawHigh = rowCells[colIndex.high] ?? '';
    const rawLow = rowCells[colIndex.low] ?? '';
    const rawPrevClose = rowCells[colIndex.prevClose] ?? '';
    const rawValueLacs = rowCells[colIndex.valueLacs] ?? '';
    const rawOptionType = rowCells[colIndex.optionType] ?? '';
    const rawStrikePrice = rowCells[colIndex.strikePrice] ?? '0';

    if (rawDate) {
      detectedDatesSet.add(rawDate.trim());
    }

    // V1: Check symbol trimming
    const trimmedSymbol = rawSymbol.trim();
    const neededTrim = rawSymbol !== trimmedSymbol;
    if (neededTrim) {
      rowsTrimmed++;
    }

    const trimmedInstrument = rawInstrument.trim();

    // Check if gold future
    const isGoldFuture =
      trimmedInstrument === ALLOWED_INSTRUMENT &&
      ALLOWED_GOLD_SYMBOLS.includes(trimmedSymbol as AllowedGoldSymbol);

    symbolCounts[trimmedSymbol] = (symbolCounts[trimmedSymbol] || 0) + 1;
    const symExpKey = `${trimmedSymbol}_${rawExpiry.trim()}`;
    symbolExpiryCounts[symExpKey] = (symbolExpiryCounts[symExpKey] || 0) + 1;

    if (!isGoldFuture) {
      ignoredRows++;
      continue;
    }

    const closePrice = parseFloat(rawClose.replace(/,/g, ''));
    if (isNaN(closePrice) || closePrice <= 0) {
      anomalies.push({
        id: `${fileName}-invalid-close-${i}`,
        type: 'error',
        fileName,
        rowNumber: i + 1,
        symbol: trimmedSymbol,
        expiry: rawExpiry.trim(),
        date: rawDate.trim(),
        message: `Invalid or missing Close price "${rawClose}" on row ${i + 1}.`,
      });
      ignoredRows++;
      continue;
    }

    const volLotsNum = parseFloat(rawVolLots.replace(/,/g, '')) || 0;
    const oiLotsNum = parseFloat(rawOiLots.replace(/,/g, '')) || 0;
    const openNum = rawOpen && rawOpen !== '-' && !isNaN(parseFloat(rawOpen)) ? parseFloat(rawOpen) : null;
    const highNum = rawHigh && rawHigh !== '-' && !isNaN(parseFloat(rawHigh)) ? parseFloat(rawHigh) : null;
    const lowNum = rawLow && rawLow !== '-' && !isNaN(parseFloat(rawLow)) ? parseFloat(rawLow) : null;
    const prevCloseNum = rawPrevClose && !isNaN(parseFloat(rawPrevClose)) ? parseFloat(rawPrevClose) : null;
    const valLacsNum = rawValueLacs && !isNaN(parseFloat(rawValueLacs)) ? parseFloat(rawValueLacs) : null;
    const strikeNum = parseFloat(rawStrikePrice) || 0;

    const spec = GOLD_CONTRACT_SPECS[trimmedSymbol];

    const price999PerG = (closePrice / spec.quoteBaseGrams) * (999 / spec.purity);
    const volumeKg = (volLotsNum * spec.lotGrams) / 1000;
    const oiKg = (oiLotsNum * spec.lotGrams) / 1000;

    const parsedRow: ParsedGoldContractRow = {
      id: `${rawDate.trim()}_${trimmedSymbol}_${rawExpiry.trim()}_${fileName}_${i}`,
      rowNumber: i + 1,
      date: rawDate.trim(),
      isoDate: parseDateToISO(rawDate.trim()),
      symbol: trimmedSymbol,
      rawSymbol,
      symbolWasTrimmed: neededTrim,
      expiry: rawExpiry.trim(),
      expiryIsoDate: parseExpiryToISO(rawExpiry.trim()),
      instrument: trimmedInstrument,
      optionType: rawOptionType.trim(),
      strikePrice: strikeNum,
      open: openNum,
      high: highNum,
      low: lowNum,
      close: closePrice,
      prevClose: prevCloseNum,
      volumeLots: volLotsNum,
      valueLacs: valLacsNum,
      openInterestLots: oiLotsNum,
      sourceFileName: fileName,
      price_999_per_g: price999PerG,
      volume_kg: volumeKg,
      oi_kg: oiKg,
      spec,
    };

    contractRows.push(parsedRow);
    goldRowsKept++;
  }

    return {
      id: `${fileName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName,
      fileSize,
      totalRows: totalDataRows,
      rowsTrimmed,
      goldRowsKept,
      ignoredRows,
      detectedDates: Array.from(detectedDatesSet),
      contractRows,
      symbolCounts,
      anomalies,
      symbolExpiryCounts,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown parsing error';
    anomalies.push({
      id: `${fileName}-read-fail-${Date.now()}`,
      type: 'error',
      fileName,
      message: 'Unreadable or corrupted file format.',
      details: `Could not parse contents cleanly: ${errorMsg}. SpreadTruth safely skipped unreadable data without crashing.`,
    });
    return {
      id: `${fileName}-failed-${Date.now()}`,
      fileName,
      fileSize,
      totalRows: 0,
      rowsTrimmed: 0,
      goldRowsKept: 0,
      ignoredRows: 0,
      detectedDates: [],
      contractRows: [],
      symbolCounts: {},
      anomalies,
      symbolExpiryCounts: {},
    };
  }
}

/**
 * Merges multiple parsed files into a unified dataset and executes the Data Truth validation suite (V1 - V7).
 * Quarantined rows are removed from all later analysis; flagged rows stay but are marked.
 */
export function mergeParsedFiles(
  fileReports: FileParseReport[],
  requestedDate?: string
): MergedDataset {
  const allAnomalies: AnomalyItem[] = [];
  const quarantinedRecords: QuarantineRecord[] = [];
  const flaggedRecords: FlaggedRecord[] = [];

  // Track file appearances per contract (Symbol + Expiry)
  // Requirement 4: "if the same Symbol + Expiry appears in more than one uploaded file, show a clear warning naming both files instead of silently merging"
  const contractFilesMap = new Map<string, Set<string>>();
  for (const file of fileReports) {
    for (const symExpKey of Object.keys(file.symbolExpiryCounts)) {
      const [symbol, expiry] = symExpKey.split('_');
      if (ALLOWED_GOLD_SYMBOLS.includes(symbol as AllowedGoldSymbol)) {
        if (!contractFilesMap.has(symExpKey)) {
          contractFilesMap.set(symExpKey, new Set<string>());
        }
        contractFilesMap.get(symExpKey)!.add(file.fileName);
      }
    }
  }

  const duplicateContractWarnings: DuplicateContractWarning[] = [];
  contractFilesMap.forEach((filesSet, symExpKey) => {
    if (filesSet.size > 1) {
      const [symbol, expiry] = symExpKey.split('_');
      duplicateContractWarnings.push({
        symbol,
        expiry,
        fileNames: Array.from(filesSet),
      });
    }
  });

  // V7: Requested Date Validation
  // "if a requested date is entered and any row's Date differs, show a red 'DATE MISMATCH: file rejected' with the first offending row (test: requested date 02/10/2026 against a file dated 01 Oct 2026 must be rejected)."
  const normalizedRequestedDate = requestedDate ? normalizeAnyDate(requestedDate) : '';
  let dateMismatchReport: DateMismatchReport = {
    hasMismatch: false,
    requestedDate: requestedDate || '',
    normalizedRequestedDate,
  };

  if (normalizedRequestedDate) {
    let firstMismatchFound = false;
    for (const file of fileReports) {
      if (firstMismatchFound) break;
      for (const row of file.contractRows) {
        if (row.isoDate !== normalizedRequestedDate) {
          dateMismatchReport = {
            hasMismatch: true,
            requestedDate: requestedDate || '',
            normalizedRequestedDate,
            firstOffendingRow: {
              fileName: file.fileName,
              rowNumber: row.rowNumber,
              rowDate: row.date,
              symbol: row.symbol,
              expiry: row.expiry,
              close: row.close,
            },
          };
          firstMismatchFound = true;
          break;
        }
      }
    }
  }

  // Processing rows for V2 (Duplicates) & V3 (Close outside [Low, High])
  const seenContractDays = new Map<string, ParsedGoldContractRow>();
  const activeRows: ParsedGoldContractRow[] = [];

  let totalRows = 0;
  let totalRowsTrimmed = 0;
  let totalRowsIgnored = 0;
  let totalGoldRows = 0;

  for (const file of fileReports) {
    totalRows += file.totalRows;
    totalRowsTrimmed += file.rowsTrimmed;
    totalRowsIgnored += file.ignoredRows;
    totalGoldRows += file.goldRowsKept;
    allAnomalies.push(...file.anomalies);

    for (const row of file.contractRows) {
      const contractDayKey = `${row.date}_${row.symbol}_${row.expiry}`;

      // V2: Duplicate (Date, Symbol, Expiry) -> Quarantine, keep the first
      if (seenContractDays.has(contractDayKey)) {
        const firstRow = seenContractDays.get(contractDayKey)!;
        row.isQuarantined = true;
        row.quarantineCheck = 'V2';
        row.quarantineReason = `Duplicate contract-day record for (${row.date}, ${row.symbol}, ${row.expiry}). First occurrence in ${firstRow.sourceFileName} kept.`;

        quarantinedRecords.push({
          id: `v2-${row.id}`,
          check: 'V2',
          checkLabel: 'Duplicate (Date, Symbol, Expiry)',
          file: file.fileName,
          date: row.date,
          symbol: row.symbol,
          expiry: row.expiry,
          detail: `Duplicate record with Close ₹${row.close.toLocaleString()} found. Kept earlier record from ${firstRow.sourceFileName}.`,
          action: 'Quarantined (removed from analysis)',
          rowNumber: row.rowNumber,
          closePrice: row.close,
        });
        continue; // Quarantined rows are removed from all later analysis
      }

      // V3: Close outside [Low, High] when both are present -> Quarantine
      if (row.low !== null && row.high !== null) {
        if (row.close < row.low - 0.0001 || row.close > row.high + 0.0001) {
          row.isQuarantined = true;
          row.quarantineCheck = 'V3';
          row.quarantineReason = `Close ₹${row.close} outside [Low: ₹${row.low}, High: ₹${row.high}]`;

          quarantinedRecords.push({
            id: `v3-${row.id}`,
            check: 'V3',
            checkLabel: 'Close outside [Low, High]',
            file: file.fileName,
            date: row.date,
            symbol: row.symbol,
            expiry: row.expiry,
            detail: `Close (₹${row.close.toLocaleString()}) outside range [Low: ₹${row.low.toLocaleString()}, High: ₹${row.high.toLocaleString()}].`,
            action: 'Quarantined (removed from analysis)',
            rowNumber: row.rowNumber,
            closePrice: row.close,
          });
          continue; // Quarantined rows are removed from all later analysis
        }
      }

      // Not quarantined: keep as first seen and add to active rows
      seenContractDays.set(contractDayKey, row);
      activeRows.push(row);
    }
  }

  // Group active rows by contract (Symbol, Expiry) and sort chronologically by isoDate
  const contractGroups = new Map<string, ParsedGoldContractRow[]>();
  for (const row of activeRows) {
    const cKey = `${row.symbol}_${row.expiry}`;
    if (!contractGroups.has(cKey)) {
      contractGroups.set(cKey, []);
    }
    contractGroups.get(cKey)!.push(row);
  }

  // Now evaluate V4, V5, V6 on chronological active series
  const truthSummariesByContract: ContractTruthSummary[] = [];

  contractGroups.forEach((rows, cKey) => {
    // Sort chronologically:
    rows.sort((a, b) => a.isoDate.localeCompare(b.isoDate));

    const [symbol, expiry] = cKey.split('_');

    let v1Count = 0;
    let v2Count = quarantinedRecords.filter((q) => q.check === 'V2' && q.symbol === symbol && q.expiry === expiry).length;
    let v3Count = quarantinedRecords.filter((q) => q.check === 'V3' && q.symbol === symbol && q.expiry === expiry).length;
    let v4Count = 0;
    let v5Count = 0;
    let v6Count = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.symbolWasTrimmed) {
        v1Count++;
      }

      row.flags = [];
      row.flagNotes = [];

      // V5: zero-volume row that has a Close -> flag "settlement only, not executable"
      if (row.volumeLots === 0 && row.close > 0) {
        v5Count++;
        row.flags.push('V5');
        row.flagNotes.push('settlement only, not executable');

        flaggedRecords.push({
          id: `v5-${row.id}`,
          check: 'V5',
          checkLabel: 'Zero Volume Settlement',
          file: row.sourceFileName,
          date: row.date,
          symbol: row.symbol,
          expiry: row.expiry,
          detail: 'settlement only, not executable',
          action: 'Flagged (kept for analysis)',
          rowNumber: row.rowNumber,
          closePrice: row.close,
        });
      }

      // Sequential checks against previous trading day
      if (i > 0) {
        const prevRow = rows[i - 1];

        // V4: Previous Close differs from the previous trading day's Close for the same contract -> flag
        if (row.prevClose !== null && Math.abs(row.prevClose - prevRow.close) > 0.01) {
          v4Count++;
          row.flags.push('V4');
          row.flagNotes.push(`Previous Close (₹${row.prevClose}) differs from prior trading day Close (₹${prevRow.close})`);

          flaggedRecords.push({
            id: `v4-${row.id}`,
            check: 'V4',
            checkLabel: 'Previous Close Inconsistency',
            file: row.sourceFileName,
            date: row.date,
            symbol: row.symbol,
            expiry: row.expiry,
            detail: `Row Previous Close (₹${row.prevClose.toLocaleString()}) ≠ Prior day Close (₹${prevRow.close.toLocaleString()})`,
            action: 'Flagged (kept for analysis)',
            rowNumber: row.rowNumber,
            closePrice: row.close,
          });
        }

        // V6: thin-day jump: |Close / previous row's Close − 1| > JUMP_PCT% AND Volume(Lots) < THIN_LOTS -> flag
        const pctJump = Math.abs(row.close / prevRow.close - 1) * 100;
        if (
          pctJump > DATA_TRUTH_THRESHOLDS.JUMP_PCT &&
          row.volumeLots < DATA_TRUTH_THRESHOLDS.THIN_LOTS
        ) {
          v6Count++;
          row.flags.push('V6');
          row.flagNotes.push(
            `Thin-day jump: ${pctJump.toFixed(2)}% > ${DATA_TRUTH_THRESHOLDS.JUMP_PCT}% with volume ${row.volumeLots} < ${DATA_TRUTH_THRESHOLDS.THIN_LOTS} lots`
          );

          flaggedRecords.push({
            id: `v6-${row.id}`,
            check: 'V6',
            checkLabel: 'Thin-Day Price Jump',
            file: row.sourceFileName,
            date: row.date,
            symbol: row.symbol,
            expiry: row.expiry,
            detail: `Jump: ${pctJump.toFixed(2)}% (threshold: ${DATA_TRUTH_THRESHOLDS.JUMP_PCT}%), Volume: ${row.volumeLots} lots (threshold: ${DATA_TRUTH_THRESHOLDS.THIN_LOTS})`,
            action: 'Flagged (kept for analysis)',
            rowNumber: row.rowNumber,
            closePrice: row.close,
          });
        }
      }
    }

    truthSummariesByContract.push({
      symbol,
      expiry,
      contractKey: cKey,
      totalRows: rows.length,
      v1Count,
      v2Count,
      v3Count,
      v4Count,
      v5Count,
      v6Count,
      totalQuarantined: v2Count + v3Count,
      totalFlagged: v4Count + v5Count + v6Count,
    });
  });

  // Sort truth summaries by expiry then symbol
  truthSummariesByContract.sort((a, b) => {
    if (a.expiry !== b.expiry) return a.expiry.localeCompare(b.expiry);
    return a.symbol.localeCompare(b.symbol);
  });

  // Requirement 4: "add a small table 'Legs per expiry' showing which of GOLDTEN, GOLDGUINEA and GOLDPETAL are loaded for each expiry and which are missing."
  const allExpiriesSet = new Set<string>();
  contractGroups.forEach((_, cKey) => {
    const [, exp] = cKey.split('_');
    allExpiriesSet.add(exp);
  });

  const targetLegSymbols = ['GOLDTEN', 'GOLDGUINEA', 'GOLDPETAL'] as const;
  const legsPerExpiry: LegsPerExpirySummary[] = [];

  Array.from(allExpiriesSet).sort().forEach((expiry) => {
    const legs = {
      GOLDTEN: contractGroups.has(`GOLDTEN_${expiry}`),
      GOLDGUINEA: contractGroups.has(`GOLDGUINEA_${expiry}`),
      GOLDPETAL: contractGroups.has(`GOLDPETAL_${expiry}`),
    };
    const missingLegs = targetLegSymbols.filter((sym) => !legs[sym]);

    legsPerExpiry.push({
      expiry,
      legs,
      missingLegs,
    });
  });

  // Overall validation badge rule:
  // "Overall badge: DATA VALID, or DATA INVALID when any quarantine or date mismatch exists."
  const hasQuarantine = quarantinedRecords.length > 0;
  const hasDateMismatch = dateMismatchReport.hasMismatch;
  const overallBadge: 'DATA VALID' | 'DATA INVALID' =
    hasQuarantine || hasDateMismatch ? 'DATA INVALID' : 'DATA VALID';

  // Build contract summaries from active rows
  const contracts: ContractSummary[] = [];
  contractGroups.forEach((rows, contractKey) => {
    const first = rows[0];
    const latest = rows[rows.length - 1];

    let totalVolumeLots = 0;
    let totalVolumeKg = 0;

    for (const r of rows) {
      totalVolumeLots += r.volumeLots;
      totalVolumeKg += r.volume_kg;
    }

    contracts.push({
      contractKey,
      symbol: first.symbol,
      expiry: first.expiry,
      expiryIsoDate: first.expiryIsoDate,
      tradingDaysCount: rows.length,
      firstDate: first.date,
      lastDate: latest.date,
      latestClose: latest.close,
      latestPrice999PerG: latest.price_999_per_g,
      totalVolumeLots,
      totalVolumeKg,
      latestOiLots: latest.openInterestLots,
      latestOiKg: latest.oi_kg,
      rows,
    });
  });

  contracts.sort((a, b) => {
    if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
    return a.expiryIsoDate.localeCompare(b.expiryIsoDate);
  });

  const uniqueDatesSet = new Set<string>();
  for (const r of activeRows) {
    if (r.isoDate) uniqueDatesSet.add(r.isoDate);
  }
  const sortedDates = Array.from(uniqueDatesSet).sort();

  return {
    files: fileReports,
    totalFiles: fileReports.length,
    totalRows,
    totalRowsTrimmed,
    totalRowsIgnored,
    totalGoldRows,
    contracts,
    allGoldRows: activeRows,
    allDates: sortedDates,
    contractDaysMap: seenContractDays,
    anomalies: allAnomalies,

    // Data Truth additions
    overallBadge,
    quarantinedRecords,
    flaggedRecords,
    truthSummariesByContract,
    duplicateContractWarnings,
    legsPerExpiry,
    dateMismatchReport,
  };
}
