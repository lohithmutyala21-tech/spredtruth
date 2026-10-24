import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface UploadDropzoneProps {
  onFilesParsed: (files: { name: string; size: number; content: string }[]) => void;
  isProcessing: boolean;
  compact?: boolean;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFilesParsed,
  isProcessing,
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);

    const validFiles: { name: string; size: number; content: string }[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
        setErrorMsg(`File "${file.name}" is not a CSV file. Please upload .csv MCX Bhavcopy files.`);
        return;
      }

      if (file.size === 0) {
        setErrorMsg(`The file "${file.name}" is empty (0 bytes). Please upload a valid MCX Bhavcopy CSV file.`);
        return;
      }

      try {
        const text = await file.text();
        if (!text || text.trim().length === 0) {
          setErrorMsg(`The file "${file.name}" contains no readable text. Please ensure it is a valid CSV file.`);
          return;
        }
        validFiles.push({
          name: file.name,
          size: file.size,
          content: text,
        });
      } catch {
        setErrorMsg(`The file "${file.name}" could not be opened. Please ensure the file is accessible and formatted as standard UTF-8 CSV text.`);
        return;
      }
    }

    if (validFiles.length > 0) {
      onFilesParsed(validFiles);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  if (compact) {
    return (
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-[#C98A1B] bg-[#fef7eb]'
              : 'border-slate-300 hover:border-[#1F2A44] hover:bg-slate-50'
          }`}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2 text-[#1F2A44] py-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#C98A1B]" />
              <span className="font-semibold text-sm">Processing Bhavcopy CSVs...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <UploadCloud className="w-6 h-6 text-[#C98A1B]" />
              <div className="text-left">
                <span className="text-sm font-bold text-[#1F2A44] block">
                  Click or drag MCX Bhavcopy CSV files here
                </span>
                <span className="text-xs text-slate-500">
                  Files are merged by (Date, Symbol, Expiry). Zero mock data.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Main Empty State Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 md:p-12 text-center">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 md:p-16 cursor-pointer transition-all ${
              isDragOver
                ? 'border-[#C98A1B] bg-[#fef7eb] scale-[1.01]'
                : 'border-slate-300 hover:border-[#1F2A44] hover:bg-slate-50/60'
            }`}
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-[#1F2A44] mb-4 shadow-inner">
              {isProcessing ? (
                <Loader2 className="w-8 h-8 animate-spin text-[#C98A1B]" />
              ) : (
                <UploadCloud className="w-8 h-8 text-[#C98A1B]" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-[#1F2A44] mb-2 tracking-tight">
              {isProcessing ? 'Analyzing MCX Bhavcopy Files...' : 'Upload MCX Gold Futures Price Files'}
            </h2>
            <p className="text-base text-slate-600 max-w-xl mx-auto mb-6">
              Drag and drop your Bhavcopy CSVs here, or click to browse files. Every calculation is performed deterministically entirely in your browser with zero server uploads and zero mock data.
            </p>

            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1F2A44] text-white font-semibold text-sm hover:bg-[#2d3b5e] transition-colors shadow">
              <FileText className="w-4 h-4 text-[#C98A1B]" />
              <span>Select CSV Files from Computer</span>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center gap-2 text-left max-w-lg mx-auto">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Expected Bhavcopy Schema Format */}
          <div className="mt-8 pt-8 border-t border-slate-100 text-left text-xs text-slate-500">
            <span className="font-semibold text-slate-700 block mb-1">Expected MCX Bhavcopy Columns:</span>
            <code className="bg-slate-100 px-2 py-1 rounded text-[11px] font-mono text-slate-700 block overflow-x-auto whitespace-nowrap">
              Date, Instrument Name, Symbol, Expiry Date, Option Type, Strike Price, Open, High, Low, Close, Previous Close, Volume(Lots), Volume(In 000&apos;s), Value(Lacs), Open Interest(Lots)
            </code>
            <div className="mt-2 text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
              <span>· Filter: <strong className="text-slate-700">FUTCOM</strong></span>
              <span>· Target Symbols: <strong className="text-slate-700">GOLDM, GOLDTEN, GOLDGUINEA, GOLDPETAL</strong></span>
              <span>· Key: <strong className="text-slate-700">(Date, Symbol, Expiry)</strong></span>
              <span>· Symbol spaces trimmed and counted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
