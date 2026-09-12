import React, { useState } from 'react';
import { Copy, Check, Download, Search, FileJson } from 'lucide-react';
import { AuditReport } from '../types';

interface JsonReportViewProps {
  report: AuditReport;
}

export const JsonReportView: React.FC<JsonReportViewProps> = ({ report }) => {
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const jsonString = JSON.stringify(report, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopify-revenue-audit-${report.audit_metadata.store_domain || 'store'}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Simple highlight or filter display
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-md space-y-0">
      {/* JSON Viewer Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-bold text-zinc-200">
            structured_audit_report.json
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            ({Math.round(jsonString.length / 1024)} KB)
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Find in report JSON..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-[11px] font-mono bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg focus:outline-none focus:border-zinc-500"
            />
          </div>

          <button
            id="copy-json-report-btn"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded-lg text-zinc-200 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy JSON</span>
              </>
            )}
          </button>

          <button
            id="download-json-report-btn"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded-lg text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .json</span>
          </button>
        </div>
      </div>

      {/* JSON Content Pre Block */}
      <div className="p-4 overflow-x-auto max-h-[650px] overflow-y-auto">
        <pre className="font-mono text-[11.5px] leading-relaxed text-emerald-300/90 whitespace-pre">
          {jsonString}
        </pre>
      </div>
    </div>
  );
};
