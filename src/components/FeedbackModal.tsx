import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  MessageSquarePlus,
  Bug,
  Lightbulb,
  HelpCircle,
  CheckCircle2,
  Copy,
  Check,
  Mail,
  AlertCircle,
  Clock,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { copyToClipboard } from '../utils/browser';

/**
 * Placeholder email address for feedback submission.
 * This matches the backend recipient configuration.
 */
export const FEEDBACK_RECIPIENT_EMAIL = 'feedback-placeholder@example.com';

const MAX_CHARACTERS = 1000;
const FEEDBACK_COOLDOWN_STORAGE_KEY = 'shopify_auditor_feedback_cooldown_until';

export type FeedbackCategory = 'bug' | 'margin_issue' | 'feature' | 'general';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeDomain?: string;
  storeName?: string;
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }
  return `${secs}s`;
}

export function FeedbackModal({
  isOpen,
  onClose,
  storeDomain,
  storeName,
}: FeedbackModalProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [userEmail, setUserEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    text: string;
    category: FeedbackCategory;
    timestamp: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Anti-spam rate limiting state (1 per 5 mins per IP)
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [detectedIp, setDetectedIp] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Function to sync cooldown from localStorage and check backend IP status
  const checkCooldownStatus = async () => {
    // 1. Check local storage cache first for instant UI response
    try {
      const storedUntil = localStorage.getItem(FEEDBACK_COOLDOWN_STORAGE_KEY);
      if (storedUntil) {
        const remaining = Math.ceil((parseInt(storedUntil, 10) - Date.now()) / 1000);
        if (remaining > 0) {
          setCooldownSeconds(remaining);
        } else {
          localStorage.removeItem(FEEDBACK_COOLDOWN_STORAGE_KEY);
          setCooldownSeconds(0);
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    // 2. Query backend to verify server-side IP cooldown
    try {
      const res = await fetch('/api/feedback/status');
      if (res.ok) {
        const data = await res.json();
        if (data.clientIp) {
          setDetectedIp(data.clientIp);
        }
        if (data.onCooldown && data.remainingSeconds > 0) {
          setCooldownSeconds(data.remainingSeconds);
          const until = Date.now() + data.remainingSeconds * 1000;
          try {
            localStorage.setItem(FEEDBACK_COOLDOWN_STORAGE_KEY, until.toString());
          } catch {
            // Ignore
          }
        }
      }
    } catch {
      // If backend is momentarily unreachable, rely on local cooldown state
    }
  };

  // Reset or query status on open
  useEffect(() => {
    if (isOpen) {
      setIsSubmitted(false);
      setValidationError(null);
      setRateLimitError(null);
      checkCooldownStatus();
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 60);
    }
  }, [isOpen]);

  // Handle countdown interval
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const interval = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          try {
            localStorage.removeItem(FEEDBACK_COOLDOWN_STORAGE_KEY);
          } catch {
            // Ignore
          }
          setRateLimitError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const charactersRemaining = MAX_CHARACTERS - feedbackText.length;
  const isApproachingLimit = charactersRemaining <= 100;
  const isAtLimit = charactersRemaining <= 0;
  const isCoolingDown = cooldownSeconds > 0;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= MAX_CHARACTERS) {
      setFeedbackText(text);
      if (validationError && text.trim().length > 0) {
        setValidationError(null);
      }
    }
  };

  const handleCancel = () => {
    setFeedbackText('');
    setValidationError(null);
    setRateLimitError(null);
    setIsSubmitted(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCoolingDown) {
      setRateLimitError(
        `Anti-spam limit active: You can submit once every 5 minutes from this IP. Please wait ${formatCountdown(
          cooldownSeconds
        )}.`
      );
      return;
    }

    const trimmed = feedbackText.trim();
    if (!trimmed) {
      setValidationError('Please enter your feedback or describe the bug before submitting.');
      textareaRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);
    setRateLimitError(null);

    const categoryLabels: Record<FeedbackCategory, string> = {
      bug: 'Bug Report',
      margin_issue: 'Margin / Calculation Issue',
      feature: 'Feature Suggestion',
      general: 'General Feedback',
    };

    const categoryLabel = categoryLabels[category];
    const timestamp = new Date().toISOString();

    try {
      // Submit to backend with IP-based anti-spam rate limiting
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: trimmed,
          category,
          userEmail: userEmail.trim() || undefined,
          storeDomain,
          storeName,
          timestamp,
        }),
      });

      const result = await response.json();

      if (response.status === 429) {
        // Rate limit exceeded (anti-spam trigger)
        const retrySec = result.retryAfterSeconds || 300;
        setCooldownSeconds(retrySec);
        setRateLimitError(
          result.error ||
            `Anti-spam protection: feedback can only be submitted once every 5 minutes from the same IP address. Please wait ${formatCountdown(
              retrySec
            )}.`
        );
        try {
          localStorage.setItem(
            FEEDBACK_COOLDOWN_STORAGE_KEY,
            (Date.now() + retrySec * 1000).toString()
          );
        } catch {
          // Ignore
        }
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || `Server error (${response.status})`);
      }

      // Successful submission
      const cooldownSec = result.cooldownSeconds || 300;
      setCooldownSeconds(cooldownSec);
      try {
        localStorage.setItem(
          FEEDBACK_COOLDOWN_STORAGE_KEY,
          (Date.now() + cooldownSec * 1000).toString()
        );
      } catch {
        // Ignore
      }

      // Optional mailto dispatch fallback
      try {
        const emailSubject = `[Auditor Feedback - ${categoryLabel}] ${trimmed
          .slice(0, 50)
          .replace(/[\r\n]+/g, ' ')}${trimmed.length > 50 ? '...' : ''}`;

        const contextStore = storeDomain
          ? `${storeName || 'Store'} (${storeDomain})`
          : 'Not loaded / Pre-audit stage';

        const emailBody = `Shopify Revenue Assurance Auditor Feedback
======================================================
Feedback Type: ${categoryLabel}
Submitted At:  ${timestamp}
Store Context: ${contextStore}
Sender Email:  ${userEmail.trim() || 'Not specified'}

User Feedback (Max 1000 characters):
------------------------------------------------------
${trimmed}

------------------------------------------------------
Client Environment:
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
======================================================`;

        const mailtoUrl = `mailto:${FEEDBACK_RECIPIENT_EMAIL}?subject=${encodeURIComponent(
          emailSubject
        )}&body=${encodeURIComponent(emailBody)}`;

        const link = document.createElement('a');
        link.href = mailtoUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        // Mailto popups can be blocked; feedback was already securely captured by backend API
      }

      setSubmittedData({
        text: trimmed,
        category,
        timestamp,
      });
      setIsSubmitted(true);
    } catch (err: unknown) {
      console.error('Submission error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to submit feedback. Please try again.';
      setValidationError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySubmitted = async () => {
    if (!submittedData) return;
    await copyToClipboard(submittedData.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetForm = () => {
    setFeedbackText('');
    setValidationError(null);
    setRateLimitError(null);
    setIsSubmitted(false);
    setSubmittedData(null);
  };

  return (
    <div
      id="feedback-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shrink-0">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="feedback-modal-title"
                className="text-sm font-bold text-zinc-900 dark:text-zinc-100"
              >
                Send Feedback & Report Bugs
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <span>Shopify Revenue Assurance Auditor</span>
                {detectedIp && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                      IP: {detectedIp}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            id="feedback-modal-close-btn"
            type="button"
            onClick={handleCancel}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSubmitted ? (
          /* Submission Success State */
          <div className="p-6 space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Feedback Captured & Dispatched
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Your message was logged and sent to{' '}
                <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                  {FEEDBACK_RECIPIENT_EMAIL}
                </span>
                . Anti-spam protection has been activated for this IP for the next 5 minutes.
              </p>
            </div>

            {/* Anti-spam cooldown indicator */}
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg py-2 px-3">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                Anti-spam cooldown active: Next submission allowed in{' '}
                <strong className="font-mono">{formatCountdown(cooldownSeconds)}</strong>
              </span>
            </div>

            {/* Captured Content Preview */}
            <div className="text-left bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                <span>
                  {submittedData?.category.toUpperCase()} • {submittedData?.text.length} chars
                </span>
                <button
                  type="button"
                  onClick={handleCopySubmitted}
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-zinc-800 dark:text-zinc-200 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                {submittedData?.text}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleResetForm}
                disabled={isCoolingDown}
                title={isCoolingDown ? 'Cooldown in progress' : undefined}
                className="px-3.5 py-2 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCoolingDown ? `Cooldown (${formatCountdown(cooldownSeconds)})` : 'Send Another Note'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form Entry State */
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Anti-spam Cooldown Banner (if IP is currently rate-limited) */}
            {isCoolingDown && (
              <div
                id="feedback-cooldown-banner"
                className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-200"
              >
                <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-0.5 text-xs">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span>Anti-Spam Rate Limit Active</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.2 bg-amber-100 dark:bg-amber-900/60 rounded text-amber-900 dark:text-amber-200">
                      {formatCountdown(cooldownSeconds)} remaining
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                    Submissions are limited to <strong>once every 5 minutes per IP</strong> to prevent spam. You can still compose your note, but the submit button will unlock when the timer expires.
                  </p>
                </div>
              </div>
            )}

            {/* Rate Limit Error Alert (if triggered on submit) */}
            {rateLimitError && !isCoolingDown && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{rateLimitError}</span>
              </div>
            )}

            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCategory('bug')}
                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors cursor-pointer ${
                    category === 'bug'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 shadow-2xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Bug className="w-3.5 h-3.5" />
                  <span>Bug Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('margin_issue')}
                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors cursor-pointer ${
                    category === 'margin_issue'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 shadow-2xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Audit Math</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('feature')}
                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors cursor-pointer ${
                    category === 'feature'
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 shadow-2xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Feature</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('general')}
                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors cursor-pointer ${
                    category === 'general'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>General</span>
                </button>
              </div>
            </div>

            {/* Free-form Text Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="feedback-textarea"
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"
                >
                  <span>Feedback or Description</span>
                  <span className="text-rose-500 text-xs">*</span>
                </label>
                <div
                  id="feedback-char-counter"
                  className={`text-[11px] font-mono transition-colors ${
                    isAtLimit
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : isApproachingLimit
                      ? 'text-amber-600 dark:text-amber-400 font-semibold'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {feedbackText.length} / {MAX_CHARACTERS} characters
                </div>
              </div>

              <textarea
                id="feedback-textarea"
                ref={textareaRef}
                value={feedbackText}
                onChange={handleTextChange}
                maxLength={MAX_CHARACTERS}
                rows={5}
                placeholder="Describe the issue, false positive finding, or idea you'd like to share..."
                className={`w-full p-3 rounded-xl text-xs font-normal bg-white dark:bg-zinc-950 border focus:outline-none transition-colors resize-y leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 ${
                  validationError
                    ? 'border-rose-400 dark:border-rose-700 focus:ring-1 focus:ring-rose-400'
                    : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20'
                }`}
              />

              {validationError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{validationError}</span>
                </p>
              )}
            </div>

            {/* Optional Sender Email */}
            <div className="space-y-1">
              <label
                htmlFor="feedback-user-email"
                className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between"
              >
                <span>Your Email Address</span>
                <span className="text-[11px] font-normal text-zinc-400">Optional for follow-up</span>
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="feedback-user-email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="merchant@example.com"
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600"
                />
              </div>
            </div>

            {/* Notice banner with Anti-Spam badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>
                  Target recipient:{' '}
                  <code className="font-mono text-zinc-700 dark:text-zinc-300">
                    {FEEDBACK_RECIPIENT_EMAIL}
                  </code>
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3" />
                <span>IP Rate Limit: 1 / 5 min</span>
              </div>
            </div>

            {/* Actions: Cancel and Submit */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                id="feedback-cancel-btn"
                type="button"
                onClick={handleCancel}
                className="px-3.5 py-2 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                id="feedback-submit-btn"
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={feedbackText.trim().length === 0 || isCoolingDown || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : isCoolingDown ? (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Wait {formatCountdown(cooldownSeconds)}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
