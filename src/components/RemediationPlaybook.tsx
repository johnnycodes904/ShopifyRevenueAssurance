import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink, ShieldCheck, Wrench } from 'lucide-react';
import { AuditFinding } from '../types';

interface RemediationPlaybookProps {
  findings: AuditFinding[];
}

export const RemediationPlaybook: React.FC<RemediationPlaybookProps> = ({ findings }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const actionableFindings = findings.filter(
    (f) => f.graphql_mutation_snippet || f.remediation_steps.length > 0
  );

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllMutations = () => {
    const allMutations = actionableFindings
      .filter((f) => f.graphql_mutation_snippet)
      .map((f) => `# --- Fix for ${f.id}: ${f.title} ---\n${f.graphql_mutation_snippet}`)
      .join('\n\n');

    navigator.clipboard.writeText(allMutations);
    setCopiedId('all-mutations');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <span>Operational Remediation Playbook</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Executable GraphQL mutations and Shopify Admin navigation paths to resolve all{' '}
            {actionableFindings.length} detected risks.
          </p>
        </div>

        <button
          id="copy-all-mutations-btn"
          onClick={handleCopyAllMutations}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shrink-0 cursor-pointer"
        >
          {copiedId === 'all-mutations' ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
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

      <div className="space-y-3">
        {actionableFindings.map((finding) => (
          <div
            key={finding.id}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs space-y-3 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold mr-2 border border-zinc-200 dark:border-zinc-700">
                  {finding.id}
                </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{finding.title}</span>
              </div>
              {finding.admin_navigation_path && (
                <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 self-start sm:self-auto">
                  Path: {finding.admin_navigation_path}
                </span>
              )}
            </div>

            {/* Steps */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                Admin Navigation Action:
              </span>
              <ul className="list-disc list-inside text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                {finding.remediation_steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>

            {/* Mutation */}
            {finding.graphql_mutation_snippet && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 font-mono text-[11px] relative">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[10px] pb-1 mb-1.5 border-b border-zinc-800">
                  <span>GraphQL Fix</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        finding.graphql_mutation_snippet!,
                        `playbook-${finding.id}`
                      )
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
        ))}
      </div>
    </div>
  );
};
