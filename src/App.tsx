import React, { useState, useMemo, useTransition } from 'react';
import { Header, AppTab } from './components/Header';
import { UploadDropzone } from './components/UploadDropzone';
import { LoadReportTab } from './components/LoadReportTab';
import { DataTruthTab } from './components/DataTruthTab';
import { ContractTruthTab } from './components/ContractTruthTab';
import { SpreadLifecycleTab } from './components/SpreadLifecycleTab';
import { VerdictTab } from './components/VerdictTab';
import { BacktestEvidenceTab } from './components/BacktestEvidenceTab';
import { SelfCheckTab } from './components/SelfCheckTab';
import { DataQualityDrawer } from './components/DataQualityDrawer';
import { DemoWalkthroughModal } from './components/DemoWalkthroughModal';
import { AboutLimitsModal } from './components/AboutLimitsModal';
import { parseBhavcopyCSV, mergeParsedFiles } from './utils/csvParser';
import { evaluateAcceptanceChecks } from './utils/selfCheck';
import { generateContractPDFReport } from './utils/pdfGenerator';
import { FileParseReport, MergedDataset, ContractSummary } from './types/bhavcopy';
import { Upload, X, FileDown, Printer, Loader2 } from 'lucide-react';

export default function App() {
  const [fileReports, setFileReports] = useState<FileParseReport[]>([]);
  const [activeTab, setActiveTab] = useState<AppTab>('load-report');
  const [requestedDate, setRequestedDate] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showAnomaliesDrawer, setShowAnomaliesDrawer] = useState<boolean>(false);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [selectedContract, setSelectedContract] = useState<ContractSummary | null>(null);

  const handleDownloadPdf = async (contract: ContractSummary) => {
    try {
      setIsGeneratingPdf(true);
      await generateContractPDFReport(contract);
    } catch (err) {
      console.warn('PDF generation error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Merge loaded files into unified dataset with Data Truth suite & requested date check
  const dataset: MergedDataset | null = useMemo(() => {
    if (fileReports.length === 0) return null;
    return mergeParsedFiles(fileReports, requestedDate);
  }, [fileReports, requestedDate]);

  // Acceptance self-checks evaluated dynamically
  const acceptanceChecks = useMemo(() => {
    return evaluateAcceptanceChecks(dataset);
  }, [dataset]);

  // Handle uploaded files strictly from user input
  const handleFilesParsed = (rawFiles: { name: string; size: number; content: string }[]) => {
    setIsProcessing(true);

    setTimeout(() => {
      startTransition(() => {
        const newReports: FileParseReport[] = [];

        for (const raw of rawFiles) {
          const report = parseBhavcopyCSV(raw.content, raw.name, raw.size);
          newReports.push(report);
        }

        setFileReports((prev) => [...prev, ...newReports]);
        setIsProcessing(false);
        setShowUploadModal(false);
      });
    }, 50);
  };

  const handleResetAll = () => {
    setFileReports([]);
    setSelectedContract(null);
    setRequestedDate('');
  };

  const totalAnomaliesCount = dataset ? dataset.anomalies.length : 0;
  const totalQuarantineCount = dataset ? dataset.quarantinedRecords.length : 0;
  const overallBadge = dataset ? dataset.overallBadge : undefined;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        filesLoadedCount={fileReports.length}
        anomaliesCount={totalAnomaliesCount}
        quarantineCount={totalQuarantineCount}
        overallBadge={overallBadge}
        onOpenUpload={() => setShowUploadModal(true)}
        onClearAll={handleResetAll}
        onToggleAnomalies={() => setShowAnomaliesDrawer(true)}
        onOpenDemo={() => setShowDemoModal(true)}
        onOpenAbout={() => setShowAboutModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* If no files loaded: Show Empty State Asking User to Upload */}
        {!dataset || dataset.files.length === 0 ? (
          activeTab === 'self-check' ? (
            <SelfCheckTab
              checks={acceptanceChecks}
              onOpenUpload={() => setShowUploadModal(true)}
            />
          ) : activeTab === 'data-truth' || activeTab === 'contract-truth' || activeTab === 'spread-lifecycle' || activeTab === 'verdict' || activeTab === 'backtest-evidence' ? (
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm max-w-2xl mx-auto">
                <h3 className="text-xl font-bold text-[#1F2A44] mb-2">
                  No Bhavcopy Files Loaded
                </h3>
                <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                  Upload MCX price files to analyze validated contracts, monitor spread differences, and review spread backtests and empirical evidence.
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#1F2A44] hover:bg-[#2d3b5e] text-white font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 text-[#C98A1B]" />
                  <span>Upload Bhavcopy CSVs</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto py-4">
              <UploadDropzone
                onFilesParsed={handleFilesParsed}
                isProcessing={isProcessing || isPending}
              />
            </div>
          )
        ) : (
          /* Populated State with Tabs */
          <div className="space-y-6">
            {activeTab === 'load-report' && (
              <LoadReportTab
                dataset={dataset}
                onOpenContractDetail={(c) => setSelectedContract(c)}
              />
            )}

            {activeTab === 'data-truth' && (
              <DataTruthTab
                dataset={dataset}
                requestedDate={requestedDate}
                onRequestedDateChange={setRequestedDate}
              />
            )}

            {activeTab === 'contract-truth' && (
              <ContractTruthTab
                dataset={dataset}
                onOpenContractDetail={(c) => setSelectedContract(c)}
              />
            )}

            {activeTab === 'spread-lifecycle' && (
              <SpreadLifecycleTab dataset={dataset} />
            )}

            {activeTab === 'verdict' && (
              <VerdictTab dataset={dataset} />
            )}

            {activeTab === 'backtest-evidence' && (
              <BacktestEvidenceTab dataset={dataset} />
            )}

            {activeTab === 'self-check' && (
              <SelfCheckTab
                checks={acceptanceChecks}
                onOpenUpload={() => setShowUploadModal(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Contract Detail Modal */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] shadow-2xl flex flex-col border border-slate-200">
            <div className="px-6 py-5 bg-[#1F2A44] text-white flex items-center justify-between rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold">{selectedContract.symbol}</span>
                  <span className="text-[#C98A1B] font-mono text-base font-semibold">{selectedContract.expiry}</span>
                </div>
                <p className="text-xs text-slate-300">
                  {selectedContract.tradingDaysCount} trading day{selectedContract.tradingDaysCount > 1 ? 's' : ''} recorded ({selectedContract.firstDate} &rarr; {selectedContract.lastDate})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(selectedContract)}
                  disabled={isGeneratingPdf}
                  className="px-3 py-1.5 rounded-lg bg-[#253252] hover:bg-[#2e3e66] border border-[#3a4d7d] text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                  title="Generate printable PDF summary report with SVG price chart"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C98A1B]" />
                      <span className="hidden sm:inline">Rendering PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3.5 h-3.5 text-[#C98A1B]" />
                      <span className="hidden sm:inline">Download PDF Report</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Print view"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedContract(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Latest Close</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    ₹{selectedContract.latestClose.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 bg-[#fef7eb] rounded-lg border border-amber-200">
                  <span className="text-slate-500 block">Price 999 / g</span>
                  <span className="text-base font-bold font-mono text-[#1F2A44]">
                    ₹{selectedContract.latestPrice999PerG.toFixed(1)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Total Volume</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    {selectedContract.totalVolumeKg.toFixed(2)} kg
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Latest Open Interest</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    {selectedContract.latestOiKg.toFixed(2)} kg
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-700">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Date</th>
                      <th className="px-4 py-2.5 text-right">Close (₹)</th>
                      <th className="px-4 py-2.5 text-right text-[#C98A1B]">Price 999/g (₹)</th>
                      <th className="px-4 py-2.5 text-right">Vol (Lots)</th>
                      <th className="px-4 py-2.5 text-right">Vol (kg)</th>
                      <th className="px-4 py-2.5 text-right">OI (Lots)</th>
                      <th className="px-4 py-2.5 text-left">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedContract.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-900">{row.date}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          ₹{row.close.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums font-bold text-slate-900 bg-[#fef7eb]/40">
                          ₹{row.price_999_per_g.toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-600">
                          {row.volumeLots.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-600">
                          {row.volume_kg.toFixed(3)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-600">
                          {row.openInterestLots.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-slate-400 font-mono truncate max-w-xs">
                          {row.sourceFileName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between rounded-b-2xl">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(selectedContract)}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2 bg-[#1F2A44] hover:bg-[#2d3b5e] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-60"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#C98A1B]" />
                      <span>Generating PDF Report...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 text-[#C98A1B]" />
                      <span>Download PDF Report</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print View</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedContract(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add CSVs Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#C98A1B]" />
                <h3 className="text-base font-bold text-[#1F2A44]">Add MCX Bhavcopy CSV Files</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <UploadDropzone
              onFilesParsed={handleFilesParsed}
              isProcessing={isProcessing || isPending}
              compact={false}
            />
          </div>
        </div>
      )}

      {/* Data Quality & Anomalies Drawer */}
      <DataQualityDrawer
        isOpen={showAnomaliesDrawer}
        onClose={() => setShowAnomaliesDrawer(false)}
        anomalies={dataset ? dataset.anomalies : []}
      />

      {/* Guided 60-Second Demo Walkthrough Modal */}
      <DemoWalkthroughModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setShowDemoModal(false);
        }}
        onSetRequestedDate={(date) => {
          setRequestedDate(date);
          setActiveTab('data-truth');
          setShowDemoModal(false);
        }}
      />

      {/* About & Quantitative Limits Modal */}
      <AboutLimitsModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      {/* Footer on Every Page */}
      <footer className="mt-auto py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="font-medium text-slate-700">Team Quiet Edge · Hack in Hills &apos;26</p>
        </div>
      </footer>
    </div>
  );
}
