import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Activity,
  Truck,
  Percent,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { AuditFinding, AuditDomain, SeverityLevel } from '../types';

interface FindingsListProps {
  findings: AuditFinding[];
  activeDomain: string;
  activeSeverity: string;
  onSetDomain: (domain: string) => void;
  onSetSeverity: (severity: string) => void;
}

export const FindingsList: React.FC<FindingsListProps> = ({
  findings,
  activeDomain,
  activeSeverity,
  onSetDomain,
  onSetSeverity,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedFindings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter findings
  const filteredFindings = findings.filter((finding) => {
    if (activeDomain !== 'ALL' && finding.domain !== activeDomain) return false;
    if (activeSeverity !== 'ALL' && finding.severity !== activeSeverity) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = finding.title.toLowerCase().includes(q);
      const matchDesc = finding.description.toLowerCase().includes(q);
      const matchId = finding.id.toLowerCase().includes(q);
      const matchNodes = finding.affected_nodes.some(
        (n) =>
          n.name?.toLowerCase().includes(q) ||
          n.id?.toLowerCase().includes(q) ||
          n.field_path?.toLowerCase().includes(q)
      );
      if (!matchTitle && !matchDesc && !matchId && !matchNodes) return false;
    }

    return true;
  });

  const handleSelectDomain = (domain: string) => {
    onSetDomain(domain);
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          icon: <AlertOctagon className="w-3.5 h-3.5" />,
          badge: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-900',
          dot: 'bg-rose-600',
          label: 'CRITICAL',
        };
      case 'HIGH':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          badge: 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-900',
          dot: 'bg-amber-600',
          label: 'HIGH',
        };
      case 'MEDIUM':
        return {
          icon: <Info className="w-3.5 h-3.5" />,
          badge: 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-900',
          dot: 'bg-blue-600',
          label: 'MEDIUM',
        };
      default:
        return {
          icon: <Activity className="w-3.5 h-3.5" />,
          badge: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
          dot: 'bg-zinc-500',
          label: 'LOW',
        };
    }
  };

  const getDomainIcon = (domain: AuditDomain) => {
    switch (domain) {
      case 'delivery_and_shipping':
        return <Truck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'discounts_and_promotions':
        return <Percent className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'tracking_and_scripts':
        return <Activity className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
    }
  };

  const getDomainLabel = (domain: AuditDomain) => {
    switch (domain) {
      case 'delivery_and_shipping':
        return 'Delivery & Shipping';
      case 'discounts_and_promotions':
        return 'Discounts & Stacking';
      case 'tracking_and_scripts':
        return 'Tracking & Scripts';
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search & Filter Tabs */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs transition-colors">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="findings-search-input"
            type="text"
            placeholder="Search findings, IDs, GraphQL fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          {/* Domain Dropdown */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg text-xs">
            <button
              onClick={() => handleSelectDomain('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeDomain === 'ALL'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              All Domains
            </button>
            <button
              onClick={() => handleSelectDomain('delivery_and_shipping')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeDomain === 'delivery_and_shipping'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Shipping
            </button>
            <button
              onClick={() => handleSelectDomain('discounts_and_promotions')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeDomain === 'discounts_and_promotions'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Discounts
            </button>
            <button
              onClick={() => handleSelectDomain('tracking_and_scripts')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                activeDomain === 'tracking_and_scripts'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Tracking
            </button>
          </div>

          {/* Severity Filter */}
          <select
            id="findings-severity-select"
            value={activeSeverity}
            onChange={(e) => onSetSeverity(e.target.value)}
            className="text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-medium text-zinc-700 dark:text-zinc-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>
        </div>
      </div>

      {/* Findings Counter */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
        <span>
          Showing <strong className="text-zinc-800 dark:text-zinc-200">{filteredFindings.length}</strong> of{' '}
          <strong className="text-zinc-800 dark:text-zinc-200">{findings.length}</strong> identified risks
        </span>
        {(activeDomain !== 'ALL' || activeSeverity !== 'ALL' || searchQuery) && (
          <button
            onClick={() => {
              onSetDomain('ALL');
              onSetSeverity('ALL');
              setSearchQuery('');
            }}
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium underline cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Findings Cards List */}
      {filteredFindings.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center space-y-2 transition-colors">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No matching issues found</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            {searchQuery || activeDomain !== 'ALL' || activeSeverity !== 'ALL'
              ? 'Try adjusting your filters or search term.'
              : 'The audited Shopify configuration satisfies all evaluation criteria with no detected margin risks or dead-end rates.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFindings.map((finding) => {
            const badge = getSeverityBadge(finding.severity);
            const isExpanded = expandedFindings[finding.id] ?? true;

            return (
              <div
                key={finding.id}
                id={`finding-card-${finding.id}`}
                className={`bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden transition-all shadow-xs ${
                  finding.severity === 'CRITICAL'
                    ? 'border-rose-200 dark:border-rose-900/60 hover:border-rose-300 dark:hover:border-rose-800'
                    : finding.severity === 'HIGH'
                    ? 'border-amber-200 dark:border-amber-900/60 hover:border-amber-300 dark:hover:border-amber-800'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* Finding Header */}
                <div
                  onClick={() => toggleExpand(finding.id)}
                  className="p-4 cursor-pointer hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.badge}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                        {getDomainIcon(finding.domain)}
                        {getDomainLabel(finding.domain)}
                      </span>

                      <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                        {finding.id}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {finding.title}
                    </h3>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {finding.description}
                    </p>
                  </div>

                  <button
                    className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 shrink-0 cursor-pointer"
                    aria-label="Toggle details"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 space-y-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40">
                    {/* Financial Impact Box */}
                    <div
                      className={`p-3 rounded-lg text-xs leading-relaxed border ${
                        finding.severity === 'CRITICAL'
                          ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200'
                          : finding.severity === 'HIGH'
                          ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200'
                          : 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-950 dark:text-blue-200'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5 mb-1 uppercase tracking-wide text-[10px]">
                        <span>Direct Financial Risk Assessment</span>
                      </div>
                      <p>{finding.financial_impact}</p>
                    </div>

                    {/* Affected GraphQL Nodes */}
                    {finding.affected_nodes.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                          <span>Affected GraphQL Nodes & Schema Paths</span>
                        </div>
                        <div className="space-y-1.5">
                          {finding.affected_nodes.map((node, i) => (
                            <div
                              key={i}
                              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 font-mono text-[11px] space-y-1 shadow-xs"
                            >
                              <div className="flex items-center justify-between text-zinc-800 dark:text-zinc-200">
                                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                  {node.type}: {node.name || node.id || 'Node'}
                                </span>
                                {node.id && (
                                  <span className="text-[10px] text-zinc-600 dark:text-zinc-400 truncate max-w-xs">
                                    {node.id}
                                  </span>
                                )}
                              </div>
                              {node.field_path && (
                                <div className="text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/60 break-all">
                                  Path: {node.field_path}
                                </div>
                              )}
                              {node.details && (
                                <pre className="text-[10px] text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
                                  {JSON.stringify(node.details, null, 2)}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Remediation Steps & GraphQL Mutation */}
                    <div className="space-y-2 pt-1 border-t border-zinc-200/80 dark:border-zinc-800">
                      <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                        <span>Precise Operational Remediation</span>
                        {finding.admin_navigation_path && (
                          <span className="text-[10px] font-normal font-sans text-zinc-600 dark:text-zinc-300 bg-zinc-200/70 dark:bg-zinc-800 px-2 py-0.5 rounded">
                            Nav: {finding.admin_navigation_path}
                          </span>
                        )}
                      </div>

                      <ol className="list-decimal list-inside space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                        {finding.remediation_steps.map((step, idx) => (
                          <li key={idx} className="leading-relaxed">
                            <span className="text-zinc-800 dark:text-zinc-200">{step}</span>
                          </li>
                        ))}
                      </ol>

                      {/* GraphQL Mutation Snippet */}
                      {finding.graphql_mutation_snippet && (
                        <div className="mt-2 bg-zinc-900 dark:bg-zinc-950 border border-transparent dark:border-zinc-800 rounded-lg p-3 text-zinc-100 text-[11px] font-mono relative group">
                          <div className="flex items-center justify-between text-zinc-400 pb-1.5 mb-1.5 border-b border-zinc-800 text-[10px]">
                            <span>Admin GraphQL Mutation Fix</span>
                            <button
                              onClick={() =>
                                handleCopy(
                                  finding.graphql_mutation_snippet!,
                                  `mutation-${finding.id}`
                                )
                              }
                              className="flex items-center gap-1 text-zinc-300 hover:text-white px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
                            >
                              {copiedId === `mutation-${finding.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Mutation</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="overflow-x-auto text-[10.5px] leading-relaxed text-zinc-200">
                            {finding.graphql_mutation_snippet}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
