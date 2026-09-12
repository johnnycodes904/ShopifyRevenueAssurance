/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  FileJson,
  TrendingDown,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { Header } from './components/Header';
import { RawInputSection } from './components/RawInputSection';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { FindingsList } from './components/FindingsList';
import { MarginSimulator } from './components/MarginSimulator';
import { JsonReportView } from './components/JsonReportView';
import { RemediationPlaybook } from './components/RemediationPlaybook';
import { GraphQLQueryModal } from './components/GraphQLQueryModal';
import { runShopifyRevenueAudit } from './audit/engine';
import { BENCHMARK_CASES } from './data/benchmarkPayloads';
import { AuditReport, ShopifyRawPayload } from './types';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { theme, setTheme } = useTheme();
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>(
    BENCHMARK_CASES[0].id
  );
  const [rawJson, setRawJson] = useState<string>(() =>
    JSON.stringify(BENCHMARK_CASES[0].payload, null, 2)
  );
  const [report, setReport] = useState<AuditReport | null>(null);
  const [activeTab, setActiveTab] = useState<
    'findings' | 'json_report' | 'margin_sim' | 'playbook'
  >('findings');
  const [activeDomainFilter, setActiveDomainFilter] = useState<string>('ALL');
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<string>('ALL');
  const [isQueryModalOpen, setIsQueryModalOpen] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Initial audit execution
  useEffect(() => {
    executeAudit(BENCHMARK_CASES[0].payload);
  }, []);

  const executeAudit = (payload: ShopifyRawPayload) => {
    try {
      const generatedReport = runShopifyRevenueAudit(payload);
      setReport(generatedReport);
      setErrorNotice(null);
    } catch (err: any) {
      console.error('Audit execution error:', err);
      setErrorNotice(err.message || 'Failed to analyze payload');
    }
  };

  const handleRunAudit = () => {
    try {
      const parsed = JSON.parse(rawJson);
      executeAudit(parsed);
    } catch (err: any) {
      setErrorNotice('Invalid JSON input: ' + err.message);
    }
  };

  const handleLoadBenchmark = (payload: ShopifyRawPayload) => {
    const jsonStr = JSON.stringify(payload, null, 2);
    setRawJson(jsonStr);

    // Identify which benchmark case this matches
    const matched = BENCHMARK_CASES.find(
      (b) => b.payload.shop?.name === payload.shop?.name
    );
    if (matched) {
      setSelectedBenchmarkId(matched.id);
    } else {
      setSelectedBenchmarkId('');
    }

    executeAudit(payload);
  };

  const handleDownloadReport = () => {
    if (!report) return;
    const jsonString = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopify-revenue-assurance-audit-${
      report.audit_metadata.store_domain || 'store'
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    handleLoadBenchmark(BENCHMARK_CASES[0].payload);
  };

  return (
    <div className="min-h-screen bg-zinc-100/60 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans antialiased transition-colors">
      {/* Top Navigation */}
      <Header
        report={report}
        onOpenQueryModal={() => setIsQueryModalOpen(true)}
        onDownloadReport={handleDownloadReport}
        onReset={handleReset}
        theme={theme}
        onSetTheme={setTheme}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Error notification if any */}
        {errorNotice && (
          <div className="p-4 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
            <span>{errorNotice}</span>
            <button
              onClick={() => setErrorNotice(null)}
              className="text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-100 font-bold ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Raw GraphQL Ingest Section */}
        <RawInputSection
          rawJson={rawJson}
          onChangeJson={setRawJson}
          onRunAudit={handleRunAudit}
          onLoadBenchmark={handleLoadBenchmark}
          selectedBenchmarkId={selectedBenchmarkId}
          isAudited={!!report}
        />

        {/* Audit Results Dashboard */}
        {report && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <ExecutiveSummary
              report={report}
              onSelectDomainFilter={(domain) => {
                setActiveDomainFilter(domain);
                setActiveSeverityFilter('ALL');
                setActiveTab('findings');
              }}
              onSelectSeverityFilter={(sev) => {
                setActiveSeverityFilter(sev);
                setActiveTab('findings');
              }}
            />

            {/* Navigation Tabs */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto pt-1 pb-3 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full">
              <button
                id="tab-findings-btn"
                onClick={() => setActiveTab('findings')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'findings'
                    ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Identified Risks & Remediation</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {report.findings.length}
                </span>
              </button>

              <button
                id="tab-json-report-btn"
                onClick={() => setActiveTab('json_report')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'json_report'
                    ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <FileJson className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Structured JSON Audit Report</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Standard Schema
                </span>
              </button>

              <button
                id="tab-margin-sim-btn"
                onClick={() => setActiveTab('margin_sim')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'margin_sim'
                    ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Worst-Case Margin Simulator</span>
                {report.worst_case_margin_exposure.zero_dollar_cart_vulnerable && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-bold">
                    $0 Alert
                  </span>
                )}
              </button>

              <button
                id="tab-playbook-btn"
                onClick={() => setActiveTab('playbook')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'playbook'
                    ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <Wrench className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <span>Remediation Playbook & Mutations</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {report.findings.filter((f) => f.graphql_mutation_snippet).length}
                </span>
              </button>
            </div>

            {/* Active Tab View */}
            <div>
              {activeTab === 'findings' && (
                <FindingsList
                  findings={report.findings}
                  activeDomain={activeDomainFilter}
                  activeSeverity={activeSeverityFilter}
                  onSetDomain={setActiveDomainFilter}
                  onSetSeverity={setActiveSeverityFilter}
                />
              )}

              {activeTab === 'json_report' && (
                <JsonReportView report={report} />
              )}

              {activeTab === 'margin_sim' && (
                <MarginSimulator exposure={report.worst_case_margin_exposure} />
              )}

              {activeTab === 'playbook' && (
                <RemediationPlaybook findings={report.findings} />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-4 px-4 text-center text-xs text-zinc-500 dark:text-zinc-400 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Shopify Revenue Assurance & Architecture Audit Engine • Compliant with Shopify Admin API
            2024-10
          </span>
          <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
            Strict Input Validation • No Synthetic Configurations
          </span>
        </div>
      </footer>

      {/* GraphQL Master Query Modal */}
      <GraphQLQueryModal
        isOpen={isQueryModalOpen}
        onClose={() => setIsQueryModalOpen(false)}
      />
    </div>
  );
}
