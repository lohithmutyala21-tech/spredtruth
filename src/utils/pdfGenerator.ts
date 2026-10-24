import { jsPDF } from 'jspdf';
import { ContractSummary } from '../types/bhavcopy';
import { GOLD_CONTRACT_SPECS } from '../config/contracts';

/**
 * Generates a publication-grade SVG string of the contract's Price 999/g history.
 * Features Navy (#1F2A44) and Gold (#C98A1B) palette, chronological date axis,
 * horizontal gridlines, high/low/latest markers, and area gradient fill.
 */
export function generatePriceHistorySVG(
  contract: ContractSummary,
  width: number,
  height: number
): string {
  const sortedRows = [...contract.rows].sort((a, b) => a.isoDate.localeCompare(b.isoDate));

  // Fallback for empty data
  if (sortedRows.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" rx="3" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.8"/>
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#94a3b8" font-family="Helvetica, Arial, sans-serif" font-size="9">No price history available</text>
    </svg>`;
  }

  const prices = sortedRows.map((r) => r.price_999_per_g);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const latestPrice = sortedRows[sortedRows.length - 1].price_999_per_g;
  const firstPrice = sortedRows[0].price_999_per_g;
  const netChange = latestPrice - firstPrice;
  const netChangePct = firstPrice > 0 ? (netChange / firstPrice) * 100 : 0;

  // Single row case
  if (sortedRows.length === 1) {
    const singlePrice = prices[0];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" rx="3" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.8"/>
      <text x="12" y="16" fill="#1F2A44" font-family="Helvetica, Arial, sans-serif" font-size="8.5" font-weight="bold">PRICE 999 / GRAM HISTORY</text>
      <line x1="50" y1="${height / 2}" x2="${width - 20}" y2="${height / 2}" stroke="#1F2A44" stroke-width="1.8"/>
      <circle cx="${(width + 30) / 2}" cy="${height / 2}" r="3.5" fill="#C98A1B"/>
      <text x="${(width + 30) / 2}" y="${height / 2 - 8}" text-anchor="middle" fill="#1F2A44" font-family="Helvetica, Arial, sans-serif" font-size="8.5" font-weight="bold">INR ${singlePrice.toFixed(1)}/g (${sortedRows[0].date})</text>
    </svg>`;
  }

  // Padding on Y range
  const priceRange = maxPrice - minPrice;
  const padding = priceRange > 0 ? priceRange * 0.12 : 5;
  const yMin = Math.floor(minPrice - padding);
  const yMax = Math.ceil(maxPrice + padding);
  const ySpan = yMax - yMin || 1;

  // Plot boundaries inside SVG
  const chartLeft = 54;
  const chartRight = width - 14;
  const chartTop = 26;
  const chartBottom = height - 20;
  const plotWidth = chartRight - chartLeft;
  const plotHeight = chartBottom - chartTop;

  // Coordinate mapping
  const points = sortedRows.map((row, idx) => {
    const x = chartLeft + (idx / (sortedRows.length - 1)) * plotWidth;
    const normalizedY = (row.price_999_per_g - yMin) / ySpan;
    const y = chartBottom - normalizedY * plotHeight;
    return {
      x,
      y,
      date: row.date,
      price: row.price_999_per_g,
    };
  });

  // Polyline path & area path
  const linePathD = 'M ' + points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');
  const areaPathD =
    `M ${points[0].x.toFixed(1)},${chartBottom} ` +
    points.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L ${points[points.length - 1].x.toFixed(1)},${chartBottom} Z`;

  // Horizontal Grid Lines (4 levels)
  const gridLevels = [0, 0.333, 0.667, 1];
  const gridElements = gridLevels
    .map((lvl) => {
      const gY = chartBottom - lvl * plotHeight;
      const val = yMin + lvl * ySpan;
      return `
        <line x1="${chartLeft}" y1="${gY.toFixed(1)}" x2="${chartRight}" y2="${gY.toFixed(1)}" stroke="#f1f5f9" stroke-width="0.9" stroke-dasharray="3 3"/>
        <text x="${chartLeft - 6}" y="${(gY + 3).toFixed(1)}" text-anchor="end" fill="#94a3b8" font-family="Helvetica, Arial, sans-serif" font-size="7.5">INR ${Math.round(val).toLocaleString()}</text>
      `;
    })
    .join('');

  // X-axis Date Labels (up to 4 evenly spaced)
  const dateStep = Math.max(1, Math.floor((points.length - 1) / 3));
  const dateIndices = Array.from(new Set([0, dateStep, dateStep * 2, points.length - 1])).sort((a, b) => a - b);
  const dateElements = dateIndices
    .map((idx, pos) => {
      const pt = points[idx];
      let anchor = 'middle';
      if (pos === 0) anchor = 'start';
      else if (pos === dateIndices.length - 1) anchor = 'end';
      return `<text x="${pt.x.toFixed(1)}" y="${chartBottom + 13}" text-anchor="${anchor}" fill="#64748b" font-family="Helvetica, Arial, sans-serif" font-size="7">${pt.date}</text>`;
    })
    .join('');

  const lastPt = points[points.length - 1];
  const changeColor = netChange >= 0 ? '#15803d' : '#b91c1c';
  const changeSign = netChange >= 0 ? '+' : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="priceAreaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#C98A1B" stop-opacity="0.25"/>
        <stop offset="80%" stop-color="#C98A1B" stop-opacity="0.04"/>
        <stop offset="100%" stop-color="#C98A1B" stop-opacity="0.0"/>
      </linearGradient>
    </defs>

    <!-- Outer card container -->
    <rect width="${width}" height="${height}" rx="3" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.8"/>

    <!-- Chart Header -->
    <text x="12" y="16" fill="#1F2A44" font-family="Helvetica, Arial, sans-serif" font-size="8.5" font-weight="bold">PRICE 999 / GRAM TRAJECTORY</text>
    <text x="178" y="16" fill="#64748b" font-family="Helvetica, Arial, sans-serif" font-size="7.5">(${sortedRows.length} Trading Days · Normalized INR/g)</text>

    <!-- Right Header Summary -->
    <text x="${width - 12}" y="16" text-anchor="end" fill="#1F2A44" font-family="Helvetica, Arial, sans-serif" font-size="8">
      Low: <tspan font-weight="bold">INR ${minPrice.toFixed(1)}</tspan> | High: <tspan font-weight="bold">INR ${maxPrice.toFixed(1)}</tspan> | Net: <tspan fill="${changeColor}" font-weight="bold">${changeSign}INR ${netChange.toFixed(1)} (${changeSign}${netChangePct.toFixed(2)}%)</tspan>
    </text>

    <!-- Grid lines -->
    ${gridElements}

    <!-- Plot axes boundary -->
    <line x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}" stroke="#cbd5e1" stroke-width="0.8"/>
    <line x1="${chartLeft}" y1="${chartTop}" x2="${chartLeft}" y2="${chartBottom}" stroke="#cbd5e1" stroke-width="0.8"/>

    <!-- Gradient area under curve -->
    <path d="${areaPathD}" fill="url(#priceAreaGrad)"/>

    <!-- Main line curve -->
    <path d="${linePathD}" fill="none" stroke="#1F2A44" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Start dot -->
    <circle cx="${points[0].x.toFixed(1)}" cy="${points[0].y.toFixed(1)}" r="2" fill="#1F2A44"/>

    <!-- Latest point marker (Gold) -->
    <circle cx="${lastPt.x.toFixed(1)}" cy="${lastPt.y.toFixed(1)}" r="3.5" fill="#C98A1B" stroke="#ffffff" stroke-width="1"/>
    
    <!-- Latest price callout badge -->
    <rect x="${(lastPt.x - 44).toFixed(1)}" y="${(lastPt.y - 14).toFixed(1)}" width="42" height="11" rx="2" fill="#1F2A44"/>
    <text x="${(lastPt.x - 23).toFixed(1)}" y="${(lastPt.y - 6).toFixed(1)}" text-anchor="middle" fill="#ffffff" font-family="Helvetica, Arial, sans-serif" font-size="6.5" font-weight="bold">INR ${latestPrice.toFixed(1)}</text>

    <!-- Date axis ticks -->
    ${dateElements}
  </svg>`;
}

/**
 * Converts an SVG string into a high-DPI PNG data URL via HTML5 Canvas.
 */
export async function svgToPngDataUrl(
  svgString: string,
  width: number,
  height: number,
  scale: number = 2.5
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
        } catch (e) {
          console.warn('[pdfGenerator] Canvas rendering exception:', e);
        }
        URL.revokeObjectURL(url);
        resolve('');
      };

      img.onerror = (err) => {
        console.warn('[pdfGenerator] SVG image loading failed:', err);
        URL.revokeObjectURL(url);
        resolve('');
      };

      img.src = url;
    } catch (err) {
      console.warn('[pdfGenerator] Failed to create SVG blob:', err);
      resolve('');
    }
  });
}

/**
 * Generates and downloads a clean, printable, publication-grade PDF summary report
 * of the currently selected contract, including key metrics, contract specs,
 * the SVG-based Price 999/g price history line chart, and the complete multi-page pricing table.
 */
export async function generateContractPDFReport(contract: ContractSummary): Promise<void> {
  // A4 dimensions in points (pt): 595.28 x 841.89 (width x height)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36; // 0.5 inch margins
  const contentWidth = pageWidth - margin * 2;

  const navyColor = [31, 42, 68] as const;
  const goldColor = [201, 138, 27] as const;
  const slateDark = [15, 23, 42] as const;
  const slateMuted = [100, 116, 139] as const;
  const borderLight = [226, 232, 240] as const;

  const spec = GOLD_CONTRACT_SPECS[contract.symbol] || contract.rows[0]?.spec || {
    purity: 999,
    lotGrams: 10,
    quoteBaseGrams: 10,
    deliveryLocation: 'Ahmedabad',
  };

  let y = margin;

  // --- HEADER BANNER ---
  doc.setFillColor(...navyColor);
  doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'F');

  // Title: SpreadTruth | Team Quiet Edge
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SpreadTruth', margin + 14, y + 24);

  doc.setTextColor(...goldColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('| Team Quiet Edge', margin + 98, y + 24);

  // Subtitle in header
  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('MCX GOLD FUTURES CONTRACT SUMMARY & VALUATION AUDIT', margin + 14, y + 42);

  // Date on top right
  const now = new Date();
  const reportDateStr = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${reportDateStr}`, pageWidth - margin - 14, y + 24, { align: 'right' });

  y += 66;

  // --- CONTRACT IDENTIFIER BAR ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderLight);
  doc.roundedRect(margin, y, contentWidth, 34, 3, 3, 'FD');

  doc.setTextColor(...navyColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${contract.symbol}`, margin + 12, y + 22);

  doc.setTextColor(...goldColor);
  doc.setFontSize(13);
  doc.text(`${contract.expiry}`, margin + 12 + doc.getTextWidth(`${contract.symbol} `) + 4, y + 22);

  const loc = spec.deliveryLocation || 'MCX Designated Vault';
  doc.setTextColor(...slateMuted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Delivery Location: ${loc}  |  Purity: ${spec.purity}/1000  |  Lot Size: ${spec.lotGrams}g`, pageWidth - margin - 12, y + 21, { align: 'right' });

  y += 44;

  // --- KEY METRICS SUMMARY (4 TILES) ---
  const tileGap = 8;
  const tileWidth = (contentWidth - tileGap * 3) / 4;
  const tileHeight = 44;

  const metrics = [
    {
      label: 'LATEST CLOSE',
      value: `INR ${contract.latestClose.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `${contract.lastDate}`,
    },
    {
      label: 'PRICE 999 / GRAM',
      value: `INR ${contract.latestPrice999PerG.toFixed(1)}/g`,
      sub: `Normalized 999 Purity`,
    },
    {
      label: 'RECORDED VOLUME',
      value: `${contract.totalVolumeKg.toFixed(2)} kg`,
      sub: `${contract.rows.reduce((sum, r) => sum + r.volumeLots, 0).toLocaleString()} lots total`,
    },
    {
      label: 'LATEST OPEN INTEREST',
      value: `${contract.latestOiKg.toFixed(2)} kg`,
      sub: `${contract.rows[contract.rows.length - 1]?.openInterestLots.toLocaleString() ?? 0} lots`,
    },
  ];

  metrics.forEach((m, idx) => {
    const tileX = margin + idx * (tileWidth + tileGap);
    // Background
    if (idx === 1) {
      // Highlighted Price 999
      doc.setFillColor(254, 247, 235); // subtle amber
      doc.setDrawColor(245, 158, 11);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...borderLight);
    }
    doc.roundedRect(tileX, y, tileWidth, tileHeight, 3, 3, 'FD');

    // Tile Label
    doc.setTextColor(...slateMuted);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(m.label, tileX + 8, y + 12);

    // Tile Value
    doc.setTextColor(idx === 1 ? goldColor[0] : navyColor[0], idx === 1 ? goldColor[1] : navyColor[1], idx === 1 ? goldColor[2] : navyColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(m.value, tileX + 8, y + 26);

    // Tile Subtext
    doc.setTextColor(...slateMuted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(m.sub, tileX + 8, y + 37);
  });

  y += tileHeight + 12;

  // --- SVG-BASED PRICE 999/G LINE CHART ---
  const chartWidth = contentWidth;
  const chartHeight = 138;
  const svgChart = generatePriceHistorySVG(contract, chartWidth, chartHeight);

  try {
    const chartPngUrl = await svgToPngDataUrl(svgChart, chartWidth, chartHeight, 2.5);
    if (chartPngUrl) {
      doc.addImage(chartPngUrl, 'PNG', margin, y, chartWidth, chartHeight);
      y += chartHeight + 14;
    }
  } catch (err) {
    console.warn('[pdfGenerator] Chart rendering error:', err);
  }

  // --- SECTION HEADER FOR PRICING TABLE ---
  doc.setTextColor(...navyColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Daily Trading History & Settlement Records (${contract.tradingDaysCount} Trading Days: ${contract.firstDate} to ${contract.lastDate})`, margin, y);

  y += 8;

  // --- PRICING TABLE ---
  interface ColDef {
    header: string;
    width: number;
    align: 'left' | 'right';
  }

  const columns: ColDef[] = [
    { header: 'Date', width: 68, align: 'left' },
    { header: 'Close (INR)', width: 80, align: 'right' },
    { header: 'Price 999/g (INR)', width: 86, align: 'right' },
    { header: 'Vol (Lots)', width: 64, align: 'right' },
    { header: 'Vol (kg)', width: 64, align: 'right' },
    { header: 'OI (Lots)', width: 64, align: 'right' },
    { header: 'OI (kg)', width: 64, align: 'right' },
    { header: 'Source File', width: 33, align: 'left' },
  ];

  const rowHeight = 14.5;
  const headerHeight = 17;

  const drawTableHeader = (curY: number): number => {
    doc.setFillColor(...navyColor);
    doc.rect(margin, curY, contentWidth, headerHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);

    let curX = margin;
    columns.forEach((col) => {
      const textX = col.align === 'right' ? curX + col.width - 5 : curX + 5;
      doc.text(col.header, textX, curY + 11.5, { align: col.align });
      curX += col.width;
    });

    return curY + headerHeight;
  };

  // Draw initial table header
  y = drawTableHeader(y);

  // Draw Rows
  const rows = contract.rows;
  const pageFooterMargin = 30;

  rows.forEach((row, rowIndex) => {
    // Check if row exceeds printable page boundary
    if (y + rowHeight > pageHeight - pageFooterMargin) {
      // Add page
      doc.addPage();
      y = margin + 10;
      // Re-draw table header on new page
      y = drawTableHeader(y);
    }

    // Alternating row background
    if (rowIndex % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    // Border line bottom
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

    // Text cells
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    let curX = margin;

    // Col 0: Date
    doc.setTextColor(...slateDark);
    doc.text(row.date, curX + 5, y + 10);
    curX += columns[0].width;

    // Col 1: Close (INR)
    doc.setTextColor(...slateDark);
    const closeStr = row.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    doc.text(closeStr, curX + columns[1].width - 5, y + 10, { align: 'right' });
    curX += columns[1].width;

    // Col 2: Price 999/g (INR) - Highlighted
    doc.setTextColor(...navyColor);
    doc.setFont('helvetica', 'bold');
    doc.text(row.price_999_per_g.toFixed(1), curX + columns[2].width - 5, y + 10, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    curX += columns[2].width;

    // Col 3: Vol (Lots)
    doc.setTextColor(...slateDark);
    doc.text(row.volumeLots.toLocaleString(), curX + columns[3].width - 5, y + 10, { align: 'right' });
    curX += columns[3].width;

    // Col 4: Vol (kg)
    doc.setTextColor(...slateDark);
    doc.text(row.volume_kg.toFixed(3), curX + columns[4].width - 5, y + 10, { align: 'right' });
    curX += columns[4].width;

    // Col 5: OI (Lots)
    doc.setTextColor(...slateDark);
    doc.text(row.openInterestLots.toLocaleString(), curX + columns[5].width - 5, y + 10, { align: 'right' });
    curX += columns[5].width;

    // Col 6: OI (kg)
    doc.setTextColor(...slateDark);
    doc.text(row.oi_kg.toFixed(3), curX + columns[6].width - 5, y + 10, { align: 'right' });
    curX += columns[6].width;

    // Col 7: Source File (truncated)
    doc.setTextColor(...slateMuted);
    doc.setFontSize(6.5);
    const shortFile = row.sourceFileName.length > 7 ? `${row.sourceFileName.slice(0, 6)}...` : row.sourceFileName;
    doc.text(shortFile, curX + 3, y + 10);

    y += rowHeight;
  });

  // --- ADD PAGE NUMBERS & FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setDrawColor(...borderLight);
    doc.line(margin, pageHeight - 24, pageWidth - margin, pageHeight - 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...slateMuted);
    doc.text('SpreadTruth | Team Quiet Edge · Confidential Quantitative Audit Report', margin, pageHeight - 14);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 14, { align: 'right' });
  }

  // --- TRIGGER BROWSER DOWNLOAD ---
  const cleanFileName = `${contract.symbol}_${contract.expiry}_Summary_Report.pdf`.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  doc.save(cleanFileName);
}
