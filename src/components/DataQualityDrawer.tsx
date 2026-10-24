import React from 'react';
import { AnomalyItem } from '../types/bhavcopy';
import { X, AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';

interface DataQualityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  anomalies: AnomalyItem[];
}

export const DataQualityDrawer: React.FC<DataQualityDrawerProps> = ({
  isOpen,
  onClose,
  anomalies,
}) => {
  if (!isOpen) return null;

  const errors = anomalies.filter((a) => a.type === 'error');
  const warnings = anomalies.filter((a) => a.type === 'warning');
  const infos = anomalies.filter((a) => a.type === 'info');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 bg-[#1F2A44] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#C98A1B]" />
            <div>
              <h3 className="text-base font-bold">Data Quality & Problem Flags</h3>
              <p className="text-xs text-slate-300">
                Rule: All data issues are flagged visibly; never silently dropped.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Counts Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1 text-rose-700">
            <AlertCircle className="w-4 h-4" />
            <span>{errors.length} Error{errors.length === 1 ? '' : 's'}</span>
          </span>
          <span className="flex items-center gap-1 text-amber-700">
            <AlertTriangle className="w-4 h-4" />
            <span>{warnings.length} Warning{warnings.length === 1 ? '' : 's'}</span>
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            <Info className="w-4 h-4" />
            <span>{infos.length} Info</span>
          </span>
        </div>

        {/* Anomaly list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {anomalies.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              <span className="font-semibold block text-slate-700">No Data Problems Flagged</span>
              All rows passed parsing and consistency checks with zero conflicts.
            </div>
          ) : (
            anomalies.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                  item.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : item.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-1.5">
                    {item.type === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : item.type === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className="uppercase tracking-wider font-mono text-[11px]">
                      {item.type}
                    </span>
                  </div>
                  {item.rowNumber && (
                    <span className="font-mono text-slate-500 font-normal">
                      Row #{item.rowNumber}
                    </span>
                  )}
                </div>

                <div className="font-semibold text-slate-900 leading-snug">
                  {item.message}
                </div>

                {item.details && (
                  <div className="text-slate-600 font-mono text-[11px] bg-white/70 p-1.5 rounded">
                    {item.details}
                  </div>
                )}

                <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-200/60">
                  <span>File: <span className="font-medium text-slate-700">{item.fileName}</span></span>
                  {item.symbol && <span>· Symbol: <span className="font-medium text-slate-700">{item.symbol}</span></span>}
                  {item.expiry && <span>· Expiry: <span className="font-medium text-slate-700">{item.expiry}</span></span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1F2A44] hover:bg-[#2d3b5e] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
