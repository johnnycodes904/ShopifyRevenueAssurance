import React, { useState } from 'react';
import { X, Copy, Check, Terminal, ExternalLink } from 'lucide-react';
import { SHOPIFY_ADMIN_GRAPHQL_QUERY } from '../data/graphqlQueries';
import { copyToClipboard } from '../utils/browser';

interface GraphQLQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GraphQLQueryModal({
  isOpen,
  onClose,
}: GraphQLQueryModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await copyToClipboard(SHOPIFY_ADMIN_GRAPHQL_QUERY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Shopify Admin GraphQL Audit Query
              </h3>
              <p className="text-xs text-zinc-400">
                Run this master query inside the official Shopify GraphiQL App or Admin API
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg text-zinc-950 bg-emerald-400 hover:bg-emerald-300 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Query</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="px-5 py-3 bg-zinc-950/60 border-b border-zinc-800 text-xs text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>
            1. Paste in <strong className="text-zinc-200">Shopify GraphiQL App</strong> (API version <code>2024-10</code> or newer).
            2. Run query and copy raw response JSON. 3. Paste into the Auditor ingest field.
          </span>
          <a
            href="https://shopify.dev/docs/apps/tools/graphiql-admin-api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-emerald-400 hover:underline shrink-0"
          >
            <span>Shopify GraphiQL Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Code Content */}
        <div className="p-4 overflow-y-auto font-mono text-xs text-zinc-300 bg-zinc-950 leading-relaxed max-h-[60vh]">
          <pre>{SHOPIFY_ADMIN_GRAPHQL_QUERY}</pre>
        </div>
      </div>
    </div>
  );
};
