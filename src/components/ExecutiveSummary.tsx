import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Truck,
  Percent,
  Activity,
  Flame,
} from 'lucide-react';
import { AuditReport } from '../types';

interface ExecutiveSummaryProps {
  report: AuditReport;
  onSelectDomainFilter: (domain: string) => void;
  onSelectSeverityFilter: (severity: string) => void;
}

export function ExecutiveSummary({
  report,
  onSelectDomainFilter,
  onSelectSeverityFilter,
}: ExecutiveSummaryProps) {
  const { audit_metadata, worst_case_margin_exposure, inspected_nodes_summary } = report;
  const { severity_breakdown, domain_breakdown, risk_score, overall_health_status } =
    audit_metadata;

  const getStatusBadge = () => {
    switch (overall_health_status) {
      case 'CRITICAL_RISK':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-900',
          dot: 'bg-rose-500',
          label: 'CRITICAL MARGIN & CHECKOUT RISK',
        };
      case 'HIGH_RISK':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-900',
          dot: 'bg-amber-500',
          label: 'HIGH REVENUE LEAKAGE RISK',
        };
      case 'ELEVATED':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-900',
          dot: 'bg-blue-500',
          label: 'ELEVATED CONFIGURATION ANOMALIES',
        };
      default:
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900',
          dot: 'bg-emerald-500',
          label: 'HEALTHY STORE CONFIGURATION',
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="space-y-4">
      {/* Top Banner & Risk Score Gauge */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 lg:p-6 shadow-xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.bg}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusBadge.dot} animate-pulse`} />
                {statusBadge.label}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                Audited at {new Date(audit_metadata.audit_timestamp).toLocaleTimeString()}
              </span>
            </div>

            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Audit Executive Summary
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
              Analyzed <strong className="text-zinc-900 dark:text-zinc-200">{inspected_nodes_summary.delivery_profiles_count}</strong> shipping profiles (
              <span className="text-zinc-900 dark:text-zinc-200">{inspected_nodes_summary.shipping_zones_count}</span> zones),{' '}
              <strong className="text-zinc-900 dark:text-zinc-200">{inspected_nodes_summary.markets_count}</strong> international markets,{' '}
              <strong className="text-zinc-900 dark:text-zinc-200">{inspected_nodes_summary.discount_nodes_count}</strong> discount nodes, and{' '}
              <strong className="text-zinc-900 dark:text-zinc-200">
                {inspected_nodes_summary.web_pixels_count + inspected_nodes_summary.script_tags_count}
              </strong>{' '}
              tracking tags.
            </p>
          </div>

          {/* Risk Score Dial */}
          <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl p-4 self-start lg:self-auto shrink-0">
            <div className="text-right">
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Store Risk Index
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-300">
                {risk_score >= 70 ? 'Immediate Action Required' : risk_score >= 35 ? 'Moderate Vulnerabilities' : 'Low Revenue Exposure'}
              </div>
            </div>
            <div
              className={`w-14 h-14 rounded-full flex flex-col items-center justify-center font-mono font-bold text-lg border-4 ${
                risk_score >= 70
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                  : risk_score >= 35
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <span>{risk_score}</span>
              <span className="text-[9px] font-normal -mt-1 text-zinc-600 dark:text-zinc-400">/ 100</span>
            </div>
          </div>
        </div>

        {/* Severity Count Filter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => onSelectSeverityFilter('CRITICAL')}
            className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 hover:bg-rose-100/70 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-left transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <div className="text-[11px] font-semibold text-rose-900 dark:text-rose-200 uppercase">Critical</div>
                <div className="text-[10px] text-rose-700 dark:text-rose-400 hidden sm:block">Checkout Blockers</div>
              </div>
            </div>
            <span className="font-mono font-bold text-xl text-rose-800 dark:text-rose-200">
              {severity_breakdown.CRITICAL}
            </span>
          </button>

          <button
            onClick={() => onSelectSeverityFilter('HIGH')}
            className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-left transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <div className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 uppercase">High</div>
                <div className="text-[10px] text-amber-700 dark:text-amber-400 hidden sm:block">Margin Leakage</div>
              </div>
            </div>
            <span className="font-mono font-bold text-xl text-amber-800 dark:text-amber-200">
              {severity_breakdown.HIGH}
            </span>
          </button>

          <button
            onClick={() => onSelectSeverityFilter('MEDIUM')}
            className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 hover:bg-blue-100/70 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 text-left transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <div className="text-[11px] font-semibold text-blue-900 dark:text-blue-200 uppercase">Medium</div>
                <div className="text-[10px] text-blue-700 dark:text-blue-400 hidden sm:block">Theme Bloat</div>
              </div>
            </div>
            <span className="font-mono font-bold text-xl text-blue-800 dark:text-blue-200">
              {severity_breakdown.MEDIUM}
            </span>
          </button>

          <button
            onClick={() => onSelectSeverityFilter('LOW')}
            className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-left transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
              <div>
                <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-200 uppercase">Low</div>
                <div className="text-[10px] text-zinc-600 dark:text-zinc-400 hidden sm:block">Housekeeping</div>
              </div>
            </div>
            <span className="font-mono font-bold text-xl text-zinc-800 dark:text-zinc-200">
              {severity_breakdown.LOW}
            </span>
          </button>
        </div>
      </div>

      {/* Domain Breakdown Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Domain 1: Shipping */}
        <div
          onClick={() => onSelectDomainFilter('delivery_and_shipping')}
          className="cursor-pointer bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl p-4 transition-all hover:shadow-xs group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Delivery & Shipping
                </h3>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Tier Gaps & Market Rates</span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                domain_breakdown.delivery_and_shipping > 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {domain_breakdown.delivery_and_shipping} Issues
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
            Checks weight/price interval dead-zones, market countries missing rates, and unfulfilled
            locations.
          </p>
        </div>

        {/* Domain 2: Discounts */}
        <div
          onClick={() => onSelectDomainFilter('discounts_and_promotions')}
          className="cursor-pointer bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl p-4 transition-all hover:shadow-xs group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Discounts & Stacking
                </h3>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Margin Exposure & Caps</span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                domain_breakdown.discounts_and_promotions > 0
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {domain_breakdown.discounts_and_promotions} Issues
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
            Stacking vulnerability: Max calculated erosion is{' '}
            <strong className="text-zinc-900 dark:text-zinc-200">
              {worst_case_margin_exposure.max_stackable_discount_pct}%
            </strong>
            {worst_case_margin_exposure.zero_dollar_cart_vulnerable && (
              <span className="text-rose-600 dark:text-rose-400 font-semibold ml-1">($0.00 cart vulnerable)</span>
            )}
            .
          </p>
        </div>

        {/* Domain 3: Tracking & Scripts */}
        <div
          onClick={() => onSelectDomainFilter('tracking_and_scripts')}
          className="cursor-pointer bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl p-4 transition-all hover:shadow-xs group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Tracking & Script Bloat
                </h3>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Pixel Collision & CDNs</span>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                domain_breakdown.tracking_and_scripts > 0
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {domain_breakdown.tracking_and_scripts} Issues
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
            Audits Web Pixel vs inline snippet collision (duplicate purchase events) and orphaned
            app ScriptTags.
          </p>
        </div>
      </div>

      {/* Critical Margin Highlight Alert if Applicable */}
      {worst_case_margin_exposure.zero_dollar_cart_vulnerable && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 rounded-xl p-3.5 flex items-start gap-3">
          <Flame className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
            <strong className="font-semibold block text-rose-950 dark:text-rose-100">
              Critical Revenue Assurance Alert: Zero-Dollar Cart Exploit
            </strong>
            Automatic sitewide discounts combine unrestricted with active coupon codes, allowing
            customers to reduce checkout cart subtotals to $0.00 without minimum spend requirements.
          </div>
        </div>
      )}
    </div>
  );
};
