import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Mail,
  CheckCircle2,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Info,
  ShieldAlert,
  ShieldCheck,
  Flame,
  Percent,
  Copy,
  Check,
  Loader2,
  UserCheck,
  Edit3,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  AuditReport,
  SeverityLevel,
  AuditDomain,
  IdentifiedIssueSummaryItem,
  RemediationChange,
  AuditComparisonDiff,
} from '../types';
import { useUserAccount } from '../hooks/useUserAccount';
import { copyToClipboard } from '../utils/browser';

interface EmailRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AuditReport | null;
  changes?: RemediationChange[];
  comparisonDiff?: AuditComparisonDiff | null;
  /**
   * Extensibility prop: In the future, pass the authenticated user's email directly
   * from your Auth context (e.g. Firebase, Shopify App Bridge, OAuth session).
   */
  accountEmailOverride?: string | null;
}

export function EmailRecapModal({
  isOpen,
  onClose,
  report,
  accountEmailOverride,
}: EmailRecapModalProps) {
  // Extensible account hook
  const { account, accountEmail, linkEmail, validateEmail } = useUserAccount();

  // Determine starting email from override, account, or empty
  const initialEmail = accountEmailOverride || accountEmail || '';
  const [emailInput, setEmailInput] = useState<string>(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(!initialEmail);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [lastSentEmail, setLastSentEmail] = useState<string>('');
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Sync email input if account or override loads
  useEffect(() => {
    if (isOpen) {
      const resolved = accountEmailOverride || accountEmail || '';
      setEmailInput(resolved);
      setIsEditingEmail(!resolved);
      setValidationError(null);
      setIsSuccess(false);

      if (!resolved) {
        setTimeout(() => {
          emailInputRef.current?.focus();
        }, 80);
      }
    }
  }, [isOpen, accountEmail, accountEmailOverride]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const storeName = report?.audit_metadata.store_name || 'Shopify Store';
  const storeDomain = report?.audit_metadata.store_domain || 'myshopify.com';
  const riskScore = report?.audit_metadata.risk_score ?? 0;
  const overallHealth = report?.audit_metadata.overall_health_status || 'HIGH_RISK';
  const severityBreakdown = report?.audit_metadata.severity_breakdown || {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  const totalFindings = report?.findings.length ?? 0;
  const zeroDollarVulnerable = report?.worst_case_margin_exposure.zero_dollar_cart_vulnerable ?? false;
  const maxDiscountPct = report?.worst_case_margin_exposure.max_stackable_discount_pct ?? 0;

  // Format issues list
  const identifiedIssues: IdentifiedIssueSummaryItem[] = (report?.findings || []).map((f) => ({
    id: f.id,
    title: f.title,
    severity: f.severity,
    domain: f.domain,
    financialImpact: f.financial_impact,
    description: f.description,
    remediationStep: f.remediation_steps[0] || 'Remediate in Shopify Admin.',
  }));

  const filteredIssues =
    selectedSeverityFilter === 'ALL'
      ? identifiedIssues
      : identifiedIssues.filter((i) => i.severity === selectedSeverityFilter);

  const isAccountSource = !!(accountEmailOverride || account?.email) && !isEditingEmail;

  const formatDomainLabel = (domain: AuditDomain) => {
    switch (domain) {
      case 'discounts_and_promotions':
        return 'Discounts & Promotions';
      case 'delivery_and_shipping':
        return 'Delivery & Shipping';
      case 'tracking_and_scripts':
        return 'Tracking & Web Pixels';
      default:
        return domain;
    }
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900';
      case 'HIGH':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900';
      case 'MEDIUM':
        return 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900';
      case 'LOW':
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetEmail = emailInput.trim();
    if (!targetEmail) {
      setValidationError('Please enter a recipient email address.');
      emailInputRef.current?.focus();
      return;
    }

    if (!validateEmail(targetEmail)) {
      setValidationError('Please enter a valid email address (e.g., merchant@company.com).');
      emailInputRef.current?.focus();
      return;
    }

    setIsSending(true);
    setValidationError(null);

    try {
      // Extensible service: cache/link email for future sessions
      if (targetEmail !== accountEmail) {
        await linkEmail(targetEmail);
      }

      const response = await fetch('/api/send-recap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: targetEmail,
          storeName,
          storeDomain,
          auditTimestamp: report?.audit_metadata.audit_timestamp || new Date().toISOString(),
          riskScore,
          overallHealthStatus: overallHealth,
          severityBreakdown,
          totalIssuesCount: totalFindings,
          zeroDollarCartVulnerable: zeroDollarVulnerable,
          maxStackableDiscountPct: maxDiscountPct,
          issues: identifiedIssues,
          summaryNotes: customNotes.trim() || undefined,
          source: isAccountSource ? 'user_account' : 'manual_input',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to dispatch email recap.');
      }

      setLastSentEmail(targetEmail);
      setIsSuccess(true);
    } catch (err: unknown) {
      console.error('Send recap error:', err);
      const msg = err instanceof Error ? err.message : 'An error occurred while sending recap.';
      setValidationError(msg);
    } finally {
      setIsSending(false);
    }
  };

  const generatePlaintextSummary = () => {
    const headerLines = [
      `Shopify Revenue Assurance Audit - Issues Identified Summary`,
      `======================================================`,
      `Store:                  ${storeName} (${storeDomain})`,
      `Audit Timestamp:        ${new Date(report?.audit_metadata.audit_timestamp || Date.now()).toLocaleString()}`,
      `Store Risk Index:       ${riskScore}/100 [${overallHealth.replace(/_/g, ' ')}]`,
      `Total Issues Found:     ${totalFindings} (${severityBreakdown.CRITICAL} Critical, ${severityBreakdown.HIGH} High, ${severityBreakdown.MEDIUM} Medium, ${severityBreakdown.LOW} Low)`,
      `Zero-Dollar Cart Risk:  ${zeroDollarVulnerable ? 'VULNERABLE (Immediate checkout revenue leak)' : 'Protected'}`,
      `Max Stackable Discount: ${maxDiscountPct > 0 ? `${maxDiscountPct}%` : 'N/A'}`,
      ``,
      `EXECUTIVE SUMMARY OF ISSUES IDENTIFIED:`,
      `------------------------------------------------------`,
    ];

    const issueLines = identifiedIssues.map((issue, idx) => {
      return `${idx + 1}. [${issue.severity}] ${issue.id}: ${issue.title}
   Domain:         ${formatDomainLabel(issue.domain)}
   Impact:         ${issue.financialImpact}
   Description:    ${issue.description}
   Remediation:    ${issue.remediationStep}`;
    });

    const notesLines = customNotes.trim()
      ? [
          ``,
          `AUDITOR EXECUTIVE NOTES:`,
          `------------------------------------------------------`,
          customNotes.trim(),
        ]
      : [];

    const footerLines = [
      ``,
      `======================================================`,
      `Generated by Shopify Revenue Assurance & Architecture Audit Engine`,
    ];

    return [...headerLines, ...issueLines, ...notesLines, ...footerLines].join('\n');
  };

  const handleCopySummary = async () => {
    const text = generatePlaintextSummary();
    await copyToClipboard(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div
      id="email-recap-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-recap-modal-title"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden transition-all max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/50 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="email-recap-modal-title"
                className="text-sm font-bold text-zinc-900 dark:text-zinc-100"
              >
                Email Summary of Identified Issues
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Send an executive summary of vulnerabilities, risks, and leaks found in this audit
              </p>
            </div>
          </div>

          <button
            id="email-recap-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {isSuccess ? (
            /* Success State */
            <div className="py-6 space-y-5 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Issues Summary Sent Successfully
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  An executive summary of the <strong className="text-zinc-900 dark:text-zinc-200">{totalFindings} issues identified</strong> has been dispatched to{' '}
                  <strong className="font-mono text-zinc-900 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                    {lastSentEmail}
                  </strong>
                  .
                </p>
              </div>

              {/* Summary Overview Card */}
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-left space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <span>Delivered Report Overview</span>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied to Clipboard</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Summary Text</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                      Store
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200 truncate block">
                      {storeName}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                      Risk Index
                    </span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 block">
                      {riskScore}/100 Risk
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                      Issues Identified
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-200 block">
                      {severityBreakdown.CRITICAL} Critical, {severityBreakdown.HIGH} High
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSuccess(false)}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Send to Another Email
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors cursor-pointer shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Form / Issues Preview State */
            <form onSubmit={handleSend} className="space-y-4">
              {/* Recipient Email Input Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="recap-recipient-email"
                    className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
                  >
                    <span>Recipient Email Address</span>
                    <span className="text-rose-500">*</span>
                  </label>

                  {/* Account Link Indicator */}
                  {account?.email && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="w-3 h-3" />
                      <span>Account Linked</span>
                    </div>
                  )}
                </div>

                {/* If user account is linked and not in explicit edit mode */}
                {account?.email && !isEditingEmail ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          {account.email}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          Resolved from user account • Ready to receive issues summary
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingEmail(true);
                        setTimeout(() => emailInputRef.current?.focus(), 50);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Change</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="recap-recipient-email"
                      ref={emailInputRef}
                      type="email"
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      placeholder="e.g., merchant-ops@store.com"
                      className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-950 border text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none transition-colors ${
                        validationError
                          ? 'border-rose-400 dark:border-rose-600 focus:ring-1 focus:ring-rose-400'
                          : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20'
                      }`}
                    />
                  </div>
                )}

                {validationError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{validationError}</span>
                  </p>
                )}
              </div>

              {/* Identified Issues Overview Section */}
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-3">
                {/* Header with Severity Breakdown */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/80 dark:border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Summary of Identified Issues ({totalFindings} total)
                    </span>
                  </div>

                  {/* Severity Count Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {severityBreakdown.CRITICAL > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        {severityBreakdown.CRITICAL} Critical
                      </span>
                    )}
                    {severityBreakdown.HIGH > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {severityBreakdown.HIGH} High
                      </span>
                    )}
                    {severityBreakdown.MEDIUM > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                        {severityBreakdown.MEDIUM} Medium
                      </span>
                    )}
                    {severityBreakdown.LOW > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {severityBreakdown.LOW} Low
                      </span>
                    )}
                  </div>
                </div>

                {/* Key Risk Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-medium">
                      Store Risk Score
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {riskScore}/100
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                          riskScore >= 70
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : riskScore >= 35
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {riskScore >= 70 ? 'Critical' : riskScore >= 35 ? 'Elevated' : 'Low Risk'}
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-medium">
                      $0 Cart Exploit Risk
                    </span>
                    <span
                      className={`font-bold text-xs mt-0.5 block ${
                        zeroDollarVulnerable
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {zeroDollarVulnerable ? 'Vulnerable (Leak)' : 'Protected'}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-medium">
                      Max Stackable Discount
                    </span>
                    <span className="font-bold text-xs mt-0.5 text-zinc-900 dark:text-zinc-100 block">
                      {maxDiscountPct > 0 ? `${maxDiscountPct}% Erosion` : 'None Stacked'}
                    </span>
                  </div>
                </div>

                {/* Severity Filter Pills */}
                <div className="flex items-center gap-1.5 pt-1 text-[11px] overflow-x-auto">
                  <span className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider shrink-0">
                    Filter Issues:
                  </span>
                  {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
                    const count =
                      sev === 'ALL'
                        ? totalFindings
                        : severityBreakdown[sev as SeverityLevel] || 0;
                    if (sev !== 'ALL' && count === 0) return null;

                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSelectedSeverityFilter(sev)}
                        className={`px-2 py-0.5 rounded-md font-medium text-[10px] transition-colors cursor-pointer shrink-0 ${
                          selectedSeverityFilter === sev
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                            : 'bg-zinc-200/70 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {sev} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Scrollable List of Identified Issues */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {filteredIssues.map((issue, idx) => (
                    <div
                      key={issue.id || idx}
                      className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border shrink-0 ${getSeverityBadge(
                              issue.severity
                            )}`}
                          >
                            {issue.severity}
                          </span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {issue.title}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">
                          {formatDomainLabel(issue.domain)}
                        </span>
                      </div>

                      {/* Financial Impact Callout */}
                      {issue.financialImpact && (
                        <div className="text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 px-2 py-1 rounded-lg flex items-start gap-1.5">
                          <Flame className="w-3 h-3 shrink-0 mt-0.5 text-rose-500" />
                          <span>{issue.financialImpact}</span>
                        </div>
                      )}

                      {/* Remediation Guidance */}
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        <strong className="text-zinc-700 dark:text-zinc-300 font-medium">
                          Fix Recommendation:
                        </strong>{' '}
                        {issue.remediationStep}
                      </p>
                    </div>
                  ))}

                  {filteredIssues.length === 0 && (
                    <div className="text-center py-6 text-zinc-500 text-xs">
                      No issues match the selected severity filter.
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Custom Auditor Notes */}
              <div className="space-y-1">
                <label
                  htmlFor="recap-custom-notes"
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between"
                >
                  <span>Auditor Comments / Stakeholder Action Plan</span>
                  <span className="text-[11px] font-normal text-zinc-400">Optional</span>
                </label>
                <textarea
                  id="recap-custom-notes"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g., Immediate priority: disable unrestricted stacking on 25% VIP codes before the weekend promotional launch..."
                  className="w-full p-2.5 rounded-xl text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Copy formatted plaintext report of issues identified"
                >
                  {copiedSummary ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied Summary</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Summary Text</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    id="email-recap-cancel-btn"
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    id="email-recap-send-btn"
                    type="submit"
                    disabled={isSending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatching Summary...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Issues Summary</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
