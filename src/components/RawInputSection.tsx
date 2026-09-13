import React, { useState, useRef } from 'react';
import {
  Upload,
  Play,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BENCHMARK_CASES } from '../data/benchmarkPayloads';
import { ShopifyRawPayload } from '../types';

interface RawInputSectionProps {
  rawJson: string;
  onChangeJson: (val: string) => void;
  onRunAudit: () => void;
  onLoadBenchmark: (payload: ShopifyRawPayload) => void;
  selectedBenchmarkId: string;
  isAudited: boolean;
}

export const RawInputSection: React.FC<RawInputSectionProps> = ({
  rawJson,
  onChangeJson,
  onRunAudit,
  onLoadBenchmark,
  selectedBenchmarkId,
  isAudited,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(isAudited);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate JSON on change
  const handleTextChange = (text: string) => {
    onChangeJson(text);
    if (!text.trim()) {
      setParseError(null);
      return;
    }
    try {
      JSON.parse(text);
      setParseError(null);
    } catch (err: any) {
      setParseError(err.message);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(rawJson);
      onChangeJson(JSON.stringify(parsed, null, 2));
      setParseError(null);
    } catch (err: any) {
      setParseError('Cannot format: ' + err.message);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const parsed = JSON.parse(content);
        onChangeJson(JSON.stringify(parsed, null, 2));
        setParseError(null);
      } catch (err: any) {
        setParseError('Invalid JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
      {/* Section Header */}
      <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-white dark:text-zinc-200 flex items-center justify-center">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Raw Shopify Admin GraphQL Ingestion
              </h2>
              {parseError ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 dark:text-rose-300 font-medium bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/60">
                  <AlertCircle className="w-3 h-3" /> Syntax Error
                </span>
              ) : rawJson.trim() ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/60">
                  <CheckCircle2 className="w-3 h-3" /> Valid Payload
                </span>
              ) : null}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Paste raw JSON responses from Shopify Admin API or select an audit benchmark case
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1 transition-colors cursor-pointer"
          >
            {isCollapsed ? (
              <>
                <span>Expand Editor</span>
                <ChevronDown className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Collapse</span>
                <ChevronUp className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            id="run-audit-btn"
            onClick={onRunAudit}
            disabled={!!parseError || !rawJson.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Audit Engine</span>
          </button>
        </div>
      </div>

      {/* Benchmark Case Selectors */}
      <div className="px-5 py-4 sm:py-4.5 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-[64px]">
        <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium shrink-0">
          <Layers className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <span>Load Production Case:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-3 w-full sm:w-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full">
          {BENCHMARK_CASES.map((bCase) => {
            const isSelected = selectedBenchmarkId === bCase.id;
            return (
              <button
                key={bCase.id}
                onClick={() => onLoadBenchmark(bCase.payload)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-xs'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700'
                }`}
                title={bCase.description}
              >
                <span>{bCase.name}</span>
                <span
                  className={`ml-1.5 text-[9px] px-1.5 py-0.2 rounded-full font-mono uppercase ${
                    isSelected
                      ? 'bg-zinc-700 text-zinc-100 dark:bg-zinc-300 dark:text-zinc-900'
                      : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {bCase.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Collapsible Editor Body */}
      {!isCollapsed && (
        <div className="p-5 space-y-3">
          {/* Action Tools Bar */}
          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={handleFormatJson}
                disabled={!rawJson.trim()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>Format JSON</span>
              </button>

              <button
                onClick={() => {
                  onChangeJson('');
                  setParseError(null);
                }}
                disabled={!rawJson.trim()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                <span>Upload .json File</span>
              </button>
            </div>
          </div>

          {/* Drag & Drop JSON Textarea */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative rounded-xl border transition-all ${
              dragOver
                ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900/50 bg-indigo-50/20'
                : parseError
                ? 'border-rose-300 dark:border-rose-800 bg-rose-50/10'
                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-950'
            }`}
          >
            <textarea
              id="raw-graphql-json-textarea"
              rows={12}
              value={rawJson}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Paste raw Shopify Admin GraphQL response data here (e.g. { data: { deliveryProfiles: [...], discountNodes: [...], webPixels: [...] } })..."
              className="w-full p-4 font-mono text-xs leading-relaxed text-zinc-200 focus:outline-none resize-y bg-transparent"
              spellCheck={false}
            />

            {dragOver && (
              <div className="absolute inset-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs flex items-center justify-center text-zinc-800 dark:text-zinc-100 font-medium text-sm rounded-xl">
                Drop Shopify JSON file here to ingest
              </div>
            )}
          </div>

          {parseError && (
            <div className="text-xs text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg p-2.5 font-mono">
              Syntax error: {parseError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
