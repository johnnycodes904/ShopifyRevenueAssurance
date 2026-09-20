import React, { useState } from 'react';
import {
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Wrench,
  Mail,
  CheckCircle2,
  Clock,
  CircleDot,
  Edit2,
} from 'lucide-react';
import { AuditFinding, RemediationStatus } from '../types';
import { copyToClipboard } from '../utils/browser';

interface RemediationPlaybookProps {
  findings: AuditFinding[];
  remediationStatuses?: Record<string, RemediationStatus>;
  remediationNotes?: Record<string, string>;
  onUpdateStatus?: (findingId: string, status: RemediationStatus, note?: string) => void;
  onOpenEmailRecap?: () => void;
}

export function RemediationPlaybook({
  findings,
  remediationStatuses = {},
  remediationNotes = {},
  onUpdateStatus,
  onOpenEmailRecap,
}: RemediationPlaybookProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<string>('');

  const actionableFindings = findings.filter(
    (f) => f.graphql_mutation_snippet || f.remediation_steps.length > 0
  );

  const resolvedCount = Object.values(remediationStatuses).filter((s) => s === 'RESOLVED').length;
  const inProgressCount = Object.values(remediationStatuses).filter((s) => s === 'IN_PROGRESS').length;

  const handleCopy = async (text: string, id: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllMutations = async () => {
    const allMutations = actionableFindings
      .filter((f) => f.graphql_mutation_snippet)
      .map((f) => `# --- Fix for ${f.id}: ${f.title} ---\n${f.graphql_mutation_snippet}`)
      .join('\n\n');

    await copyToClipboard(allMutations);
    setCopiedId('all-mutations');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = (finding: AuditFinding, newStatus: RemediationStatus) => {
    if (onUpdateStatus) {
      const existingNote = remediationNotes[finding.id] || finding.remediation_steps[0] || 'Remediation completed';
      onUpdateStatus(finding.id, newStatus, existingNote);
    }
  };

  const handleSaveNote = (findingId: string) => {
    if (onUpdateStatus) {
      const currentStatus = remediationStatuses[findingId] || 'RESOLVED';
      onUpdateStatus(findingId, currentStatus, noteInput.trim() || undefined);
    }
    setEditingNoteId(null);
    setNoteInput('');
  };

  return (
    <div className="space-y-4">
      {/* Playbook Header & Actions */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Operational Remediation Playbook & Change Tracker</span>
            </h3>
            {resolvedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {resolvedCount} Applied
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl">
            Execute GraphQL mutations or follow Shopify Admin paths to resolve risks. Mark changes as applied and send an email recap to stakeholders.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onOpenEmailRecap && (
            <button
              id="playbook-email-recap-btn"
              type="button"
              onClick={onOpenEmailRecap}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors shrink-0 cursor-pointer shadow-xs"
              title="Email executive summary of identified issues"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Issues Summary</span>
            </button>
          )}

          <button
            id="copy-all-mutations-btn"
            type="button"
            onClick={handleCopyAllMutations}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0 cursor-pointer"
          >
            {copiedId === 'all-mutations' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>All Mutations Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All Mutations</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Actionable Findings List */}
      <div className="space-y-3">
        {actionableFindings.map((finding) => {
          const currentStatus = remediationStatuses[finding.id] || 'UNRESOLVED';
          const currentNote = remediationNotes[finding.id];

          return (
            <div
              key={finding.id}
              className={`bg-white dark:bg-zinc-900 border rounded-xl p-4 shadow-xs space-y-3 transition-colors ${
                currentStatus === 'RESOLVED'
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                  : currentStatus === 'IN_PROGRESS'
                  ? 'border-amber-200 dark:border-amber-900/60'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {/* Finding Title & Interactive Status Control */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-zinc-700">
                    {finding.id}
                  </span>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {finding.title}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase font-semibold ${
                      finding.severity === 'CRITICAL'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : finding.severity === 'HIGH'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {finding.severity}
                  </span>
                </div>

                {/* Status Toggle Buttons */}
                <div className="flex items-center gap-1 self-start sm:self-auto bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-zinc-200/80 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(finding, 'UNRESOLVED')}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                      currentStatus === 'UNRESOLVED'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shadow-2xs font-semibold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    Open
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(finding, 'IN_PROGRESS')}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                      currentStatus === 'IN_PROGRESS'
                        ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shadow-2xs font-semibold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400'
                    }`}
                  >
                    In Progress
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusChange(finding, 'RESOLVED')}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                      currentStatus === 'RESOLVED'
                        ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Resolved</span>
                  </button>
                </div>
              </div>

              {/* Navigation path & remediation notes */}
              <div className="space-y-2 text-xs">
                {finding.admin_navigation_path && (
                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
                    <span className="font-semibold text-[10px] uppercase text-zinc-400 dark:text-zinc-500">
                      Shopify Path:
                    </span>
                    <span className="font-mono text-[11px]">{finding.admin_navigation_path}</span>
                  </div>
                )}

                {/* Steps */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                    Remediation Steps:
                  </span>
                  <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-1">
                    {finding.remediation_steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>

                {/* Optional Custom Action Note */}
                {currentStatus !== 'UNRESOLVED' && (
                  <div className="pt-1">
                    {editingNoteId === finding.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          placeholder="e.g. Disabled 3-way discount combination in Shopify admin"
                          className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNote(finding.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="text-xs text-zinc-500 hover:text-zinc-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-50/80 dark:bg-zinc-950/60 p-2 rounded-lg border border-zinc-200/50 dark:border-zinc-800">
                        <span className="truncate">
                          <strong>Resolution Note:</strong>{' '}
                          {currentNote || 'Remediation completed according to Shopify guidelines.'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(finding.id);
                            setNoteInput(currentNote || '');
                          }}
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 ml-2 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit Note</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* GraphQL Mutation Snippet */}
              {finding.graphql_mutation_snippet && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 font-mono text-[11px] relative">
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[10px] pb-1 mb-1.5 border-b border-zinc-800">
                    <span>GraphQL Mutation Snippet</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(finding.graphql_mutation_snippet!, `playbook-${finding.id}`)
                      }
                      className="flex items-center gap-1 text-zinc-300 hover:text-white px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      {copiedId === `playbook-${finding.id}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="overflow-x-auto text-[10.5px] leading-relaxed text-emerald-300">
                    {finding.graphql_mutation_snippet}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
