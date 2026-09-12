import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  FileCode2,
  Terminal,
  Download,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { AuditReport } from '../types';
import { ThemeMode } from '../hooks/useTheme';

interface HeaderProps {
  report: AuditReport | null;
  onOpenQueryModal: () => void;
  onDownloadReport: () => void;
  onReset: () => void;
  theme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  report,
  onOpenQueryModal,
  onDownloadReport,
  onReset,
  theme,
  onSetTheme,
}) => {
  const isCritical = report?.audit_metadata.overall_health_status === 'CRITICAL_RISK';
  const isHigh = report?.audit_metadata.overall_health_status === 'HIGH_RISK';
  const isHealthy = report?.audit_metadata.overall_health_status === 'HEALTHY';

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              isCritical
                ? 'bg-rose-500 text-white'
                : isHigh
                ? 'bg-amber-500 text-white'
                : isHealthy
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100'
            }`}
          >
            {isCritical ? (
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            ) : isHealthy ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <FileCode2 className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Shopify Revenue Assurance Auditor
              </h1>
              <span className="text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                GraphQL v2024-10
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-md">
              {report?.audit_metadata.store_name
                ? `${report.audit_metadata.store_name} (${report.audit_metadata.store_domain})`
                : 'Store Audit Engine & GraphQL Ingestion'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Theme Selector Pill */}
          <div
            id="theme-selector-group"
            className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700"
            role="group"
            aria-label="Theme mode selector"
          >
            <button
              id="theme-light-btn"
              type="button"
              title="Light theme"
              onClick={() => onSetTheme('light')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'bg-white dark:bg-zinc-700 text-amber-600 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              id="theme-system-btn"
              type="button"
              title="System theme"
              onClick={() => onSetTheme('system')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                theme === 'system'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              id="theme-dark-btn"
              type="button"
              title="Dark theme"
              onClick={() => onSetTheme('dark')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            id="header-query-guide-btn"
            onClick={onOpenQueryModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-700 bg-zinc-100 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
            <span>Admin GraphQL Query</span>
          </button>

          {report && (
            <>
              <button
                id="header-download-report-btn"
                onClick={onDownloadReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON Report</span>
              </button>

              <button
                id="header-reset-btn"
                onClick={onReset}
                title="Reset input and findings"
                className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

