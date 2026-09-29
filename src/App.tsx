/**
 * Copyright (c) 2026 Jon Deming. All rights reserved.
 * Proprietary and Confidential - Unauthorized copying or distribution is strictly prohibited.
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
  MessageSquarePlus,
  Mail,
  FileText,
} from 'lucide-react';
import { Header } from './components/Header';
import { RawInputSection } from './components/RawInputSection';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { FindingsList } from './components/FindingsList';
import { MarginSimulator } from './components/MarginSimulator';
import { JsonReportView } from './components/JsonReportView';
import { RemediationPlaybook } from './components/RemediationPlaybook';
import { GraphQLQueryModal } from './components/GraphQLQueryModal';
import { FeedbackModal } from './components/FeedbackModal';
import { EmailRecapModal } from './components/EmailRecapModal';
import { downloadJsonFile } from './utils/browser';
import { generateApplicationOverviewPdf } from './utils/pdfExport';
import { runShopifyRevenueAudit } from './audit/engine';
import { BENCHMARK_CASES } from './data/benchmarkPayloads';
import {
  AuditReport,
  ShopifyRawPayload,
  RemediationStatus,
  RemediationChange,
  AuditComparisonDiff,
} from './types';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { theme, setTheme } = useTheme();
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('');
  const [rawJson, setRawJson] = useState<string>('');
  const [report, setReport] = useState<AuditReport | null>(null);
  const [previousReport, setPreviousReport] = useState<AuditReport | null>(null);
  const [comparisonDiff, setComparisonDiff] = useState<AuditComparisonDiff | null>(null);
  const [remediationStatuses, setRemediationStatuses] = useState<Record<string, RemediationStatus>>({});
  const [remediationNotes, setRemediationNotes] = useState<Record<string, string>>({});
  const [remediationChanges, setRemediationChanges] = useState<RemediationChange[]>([]);
  const [activeTab, setActiveTab] = useState<
    'findings' | 'json_report' | 'margin_sim' | 'playbook'
  >('findings');
  const [activeDomainFilter, setActiveDomainFilter] = useState<string>('ALL');
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<string>('ALL');
  const [isQueryModalOpen, setIsQueryModalOpen] = useState<boolean>(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [isEmailRecapModalOpen, setIsEmailRecapModalOpen] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const executeAudit = (payload: ShopifyRawPayload) => {
    try {
      const generatedReport = runShopifyRevenueAudit(payload);

      // Track comparison diff if a previous report was active
      if (report) {
        const prevFindingsSet = new Set(report.findings.map((f) => f.id));
        const newFindingsSet = new Set(generatedReport.findings.map((f) => f.id));

        const resolvedIds = report.findings
          .filter((f) => !newFindingsSet.has(f.id))
          .map((f) => f.id);
        const newIds = generatedReport.findings
          .filter((f) => !prevFindingsSet.has(f.id))
          .map((f) => f.id);

        const diff: AuditComparisonDiff = {
          previousTimestamp: report.audit_metadata.audit_timestamp,
          previousRiskScore: report.audit_metadata.risk_score,
          currentRiskScore: generatedReport.audit_metadata.risk_score,
          riskScoreDelta:
            generatedReport.audit_metadata.risk_score - report.audit_metadata.risk_score,
          resolvedFindingIds: resolvedIds,
          newFindingIds: newIds,
          previousZeroDollarVulnerable:
            report.worst_case_margin_exposure.zero_dollar_cart_vulnerable,
          currentZeroDollarVulnerable:
            generatedReport.worst_case_margin_exposure.zero_dollar_cart_vulnerable,
        };

        setComparisonDiff(diff);
        setPreviousReport(report);
      }

      setReport(generatedReport);
      setErrorNotice(null);
    } catch (err: unknown) {
      console.error('Audit execution error:', err);
      const message = err instanceof Error ? err.message : 'Failed to analyze payload';
      setErrorNotice(message);
    }
  };

  const handleUpdateRemediationStatus = (
    findingId: string,
    status: RemediationStatus,
    note?: string
  ) => {
    setRemediationStatuses((prev) => ({ ...prev, [findingId]: status }));
    if (note) {
      setRemediationNotes((prev) => ({ ...prev, [findingId]: note }));
    }

    const finding = report?.findings.find((f) => f.id === findingId);
    if (finding) {
      setRemediationChanges((prev) => {
        const existingIdx = prev.findIndex((c) => c.findingId === findingId);
        const newEntry: RemediationChange = {
          findingId,
          findingTitle: finding.title,
          severity: finding.severity,
          domain: finding.domain,
          status,
          note: note || remediationNotes[findingId] || finding.remediation_steps[0],
          updatedAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = newEntry;
          return updated;
        } else {
          return [newEntry, ...prev];
        }
      });
    }
  };

  const handleRunAudit = () => {
    try {
      const parsed = JSON.parse(rawJson);
      executeAudit(parsed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown parsing error';
      setErrorNotice('Invalid JSON input: ' + message);
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
    const filename = `shopify-revenue-assurance-audit-${
      report.audit_metadata.store_domain || 'store'
    }.json`;
    downloadJsonFile(report, filename);
  };

  const handleReset = () => {
    setRawJson('');
    setSelectedBenchmarkId('');
    setReport(null);
    setPreviousReport(null);
    setComparisonDiff(null);
    setRemediationStatuses({});
    setRemediationNotes({});
    setRemediationChanges([]);
    setErrorNotice(null);
  };

  const resolvedCount = remediationChanges.filter((c) => c.status === 'RESOLVED').length;

  return (
    <div className="min-h-screen bg-zinc-100/60 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans antialiased transition-colors">
      {/* Top Navigation */}
      <Header
        report={report}
        onOpenQueryModal={() => setIsQueryModalOpen(true)}
        onOpenFeedbackModal={() => setIsFeedbackModalOpen(true)}
        onOpenEmailRecap={() => setIsEmailRecapModalOpen(true)}
        onDownloadOverviewPdf={() => generateApplicationOverviewPdf()}
        onDownloadReport={handleDownloadReport}
        onReset={handleReset}
        theme={theme}
        onSetTheme={setTheme}
        resolvedChangesCount={resolvedCount}
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

        {/* Onboarding Instructions when no audit report has been generated */}
        {!report && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xs transition-colors">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center mx-auto">
              <Terminal className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Ready for GraphQL Ingestion
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Paste raw JSON from your Shopify Admin API into the editor above, or select any production benchmark case to run the audit engine.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
              <button
                onClick={() => setIsQueryModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>View GraphQL Audit Query</span>
              </button>
              <button
                onClick={() => handleLoadBenchmark(BENCHMARK_CASES[0].payload)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors cursor-pointer shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Load Sample Case ({BENCHMARK_CASES[0].name})</span>
              </button>
            </div>
          </div>
        )}

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
              onOpenEmailRecap={() => setIsEmailRecapModalOpen(true)}
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
                {resolvedCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {resolvedCount} resolved
                  </span>
                )}
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
                <RemediationPlaybook
                  findings={report.findings}
                  remediationStatuses={remediationStatuses}
                  remediationNotes={remediationNotes}
                  onUpdateStatus={handleUpdateRemediationStatus}
                  onOpenEmailRecap={() => setIsEmailRecapModalOpen(true)}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-4 px-4 text-center text-xs text-zinc-500 dark:text-zinc-400 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span>
              Shopify Revenue Assurance & Architecture Audit Engine • Compliant with Shopify Admin API 2024-10
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            {report && (
              <button
                id="footer-email-recap-btn"
                type="button"
                onClick={() => setIsEmailRecapModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Issues Summary</span>
              </button>
            )}

            <button
              id="footer-feedback-btn"
              type="button"
              onClick={() => setIsFeedbackModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-zinc-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>Feedback / Report Bug</span>
            </button>

            <button
              id="footer-overview-pdf-btn"
              type="button"
              onClick={() => generateApplicationOverviewPdf()}
              className="inline-flex items-center gap-1.5 text-zinc-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer"
              title="Download formatted application overview PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>Download Overview PDF</span>
            </button>
            <span className="font-mono text-zinc-400 dark:text-zinc-600">•</span>
            <span className="font-mono text-zinc-500 dark:text-zinc-400">
              Strict Input Validation
            </span>
          </div>
        </div>
      </footer>

      {/* GraphQL Master Query Modal */}
      <GraphQLQueryModal
        isOpen={isQueryModalOpen}
        onClose={() => setIsQueryModalOpen(false)}
      />

      {/* User Feedback & Bug Reporting Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        storeDomain={report?.audit_metadata.store_domain}
        storeName={report?.audit_metadata.store_name}
      />

      {/* Email Recap Modal (Extensible for User Accounts) */}
      <EmailRecapModal
        isOpen={isEmailRecapModalOpen}
        onClose={() => setIsEmailRecapModalOpen(false)}
        report={report}
        changes={remediationChanges}
        comparisonDiff={comparisonDiff}
      />
    </div>
  );
}
