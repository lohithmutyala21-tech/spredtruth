import React, { useState } from 'react';
import {
  runSourceVerification,
  VerificationReport,
  VerificationStatus,
} from '../utils/sourceVerifier';
import {
  ShieldCheck,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Loader2,
  Lock,
  Globe,
  Info,
} from 'lucide-react';

export const SourceVerifierPanel: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [report, setReport] = useState<VerificationReport | null>(null);

  const handleCheckAssumptions = async () => {
    setIsChecking(true);
    try {
      const result = await runSourceVerification(apiKey);
      setReport(result);
    } catch {
      setReport({
        timestamp: new Date().toLocaleTimeString(),
        isAvailable: false,
        unavailableReason: 'verification unavailable: Unexpected failure during network call.',
        results: [],
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'MATCHES':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[10px] uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            MATCHES
          </span>
        );
      case 'DIFFERS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-300 font-bold text-[10px] uppercase tracking-wider">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            DIFFERS
          </span>
        );
      case 'NOT FOUND':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[10px] uppercase tracking-wider">
            <HelpCircle className="w-3 h-3 text-amber-600" />
            NOT FOUND
          </span>
        );
      case 'NEEDS MANUAL CHECK':
      case 'NOT FOUND, NEEDS MANUAL CHECK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[10px] uppercase tracking-wider">
            <HelpCircle className="w-3 h-3 text-amber-600" />
            NEEDS MANUAL CHECK
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-[#1F2A44] text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5 text-[#C98A1B]" />
            <h3 className="text-base font-bold tracking-tight">
              Source Verifier <span className="text-xs text-amber-300 font-normal">(powered by TinyFish)</span>
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#2d3b5e] text-slate-200 border border-slate-600">
              External Assumptions Check
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Checks assumptions that MCX Bhavcopy price files cannot prove: exchange, stamp duty, CTT, SEBI, and GST fee rates; tender-window length and effective dates; and contract delivery centers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 bg-[#253252] px-3 py-1.5 rounded-lg border border-[#33446e] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Key strictly in-memory</span>
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* API Key Input & Action Controls */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1">
                <Key className="w-3.5 h-3.5 text-[#C98A1B]" />
                TinyFish API Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Paste TinyFish API key (held in memory only)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full sm:max-w-md px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#1F2A44] text-slate-900"
                />
              </div>
            </div>

            <div className="self-end sm:self-center">
              <button
                onClick={handleCheckAssumptions}
                disabled={isChecking}
                className="px-4 py-2 bg-[#1F2A44] hover:bg-[#2d3b5e] text-white text-xs font-semibold rounded-lg transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C98A1B]" />
                    <span>Fetching live sources...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#C98A1B]" />
                    <span>Check assumptions</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>Runtime Security Guarantee: </strong>
            The API key is typed by the user into a password field at runtime and kept only in memory: never hardcoded, saved to storage, logged, or included in URLs.
          </p>
        </div>

        {/* Unavailable Banner if error occurs or no key */}
        {report && !report.isAvailable && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-950 uppercase tracking-wide">
                Verification Unavailable
              </span>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                {report.unavailableReason || 'Verification unavailable due to network timeout or browser connection constraints.'}
              </p>
              <p className="text-[11px] text-amber-700 mt-1 italic">
                Rest of the application continues to run normally on local deterministic calculations.
              </p>
            </div>
          </div>
        )}

        {/* Verification Results Table */}
        {report && report.isAvailable && report.results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Verified at: <strong className="font-mono text-slate-800">{report.timestamp}</strong>
              </span>
              <span className="text-[11px] text-slate-400">
                Rule: Config values are never automatically overwritten.
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Assumption / Item</th>
                    <th className="px-4 py-3 text-left">SpreadTruth Value</th>
                    <th className="px-4 py-3 text-left">Source Found Value</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Source &amp; Excerpt</th>
                    <th className="px-4 py-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {report.results.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.name}
                      </td>

                      {/* Our Value */}
                      <td className="px-4 py-3 font-mono font-medium text-slate-800">
                        {item.ourValue}
                      </td>

                      {/* Found Value */}
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {item.foundValue}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Source & Excerpt */}
                      <td className="px-4 py-3 max-w-md">
                        {item.sourceUrl ? (
                          <div className="space-y-1">
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#1F2A44] hover:text-[#C98A1B] font-medium underline flex items-center gap-1 text-[11px]"
                            >
                              <span>{item.sourceLabel}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                            <p className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded border border-slate-200/60 leading-relaxed">
                              &ldquo;{item.excerpt}&rdquo;
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[11px] font-mono text-amber-700 font-semibold">
                              [enter manually]
                            </span>
                            <p className="text-[11px] text-slate-500 italic mt-0.5">
                              {item.excerpt}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Retrieved Time */}
                      <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {item.retrievedAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pre-fill URLs Guidance */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
          <Info className="w-4 h-4 text-[#C98A1B] shrink-0 mt-0.5" />
          <div className="leading-relaxed text-[11px]">
            <strong>Pre-filled Sources: </strong>
            Tender window is verified via FYERS Exchange Notice Board (Precious Metals Delivery Contracts); transaction fee rates are verified via Rupeezy MCX Charges Schedule; GOLDTEN delivery center has no public URL and is marked for manual confirmation. Never pointed at mcxindia.com or mcxccl.com.
          </div>
        </div>
      </div>
    </div>
  );
};
