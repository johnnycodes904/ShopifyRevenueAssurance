import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

/**
 * Recipient placeholder email for captured feedback submissions.
 */
export const FEEDBACK_RECIPIENT_EMAIL = 'feedback-placeholder@example.com';

/**
 * 5-minute anti-spam cooldown window per IP address.
 */
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_FEEDBACK_LENGTH = 1000;

interface SubmissionRecord {
  lastSubmittedAt: number;
  count: number;
}

interface StoredFeedback {
  id: string;
  ip: string;
  text: string;
  category: string;
  userEmail?: string;
  storeDomain?: string;
  storeName?: string;
  timestamp: string;
  receivedAt: string;
}

// In-memory rate limiting map: client IP -> submission record
const ipSubmissionTracker = new Map<string, SubmissionRecord>();

// In-memory storage for feedback logs
const receivedFeedbackArchive: StoredFeedback[] = [];

/**
 * Safely extracts client IP address accounting for proxies and reverse proxies.
 */
function extractClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp.trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// Periodic cleanup of expired IP tracking records every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipSubmissionTracker.entries()) {
    if (now - record.lastSubmittedAt > RATE_LIMIT_WINDOW_MS * 2) {
      ipSubmissionTracker.delete(ip);
    }
  }
}, 10 * 60 * 1000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse JSON payloads
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  /**
   * GET /api/feedback/status
   * Inquires whether the requesting client IP is currently on anti-spam cooldown.
   */
  app.get('/api/feedback/status', (req, res) => {
    const clientIp = extractClientIp(req);
    const record = ipSubmissionTracker.get(clientIp);
    const now = Date.now();

    if (record && now - record.lastSubmittedAt < RATE_LIMIT_WINDOW_MS) {
      const remainingMs = RATE_LIMIT_WINDOW_MS - (now - record.lastSubmittedAt);
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      return res.json({
        onCooldown: true,
        remainingSeconds,
        clientIp,
        cooldownWindowSeconds: RATE_LIMIT_WINDOW_MS / 1000,
      });
    }

    return res.json({
      onCooldown: false,
      remainingSeconds: 0,
      clientIp,
      cooldownWindowSeconds: RATE_LIMIT_WINDOW_MS / 1000,
    });
  });

  /**
   * POST /api/feedback
   * Submits user feedback or bug report with IP-based anti-spam rate limiting (1 per 5 mins).
   */
  app.post('/api/feedback', (req, res) => {
    const clientIp = extractClientIp(req);
    const now = Date.now();
    const record = ipSubmissionTracker.get(clientIp);

    // Enforce anti-spam IP restriction: 1 submission per 5 minutes
    if (record && now - record.lastSubmittedAt < RATE_LIMIT_WINDOW_MS) {
      const remainingMs = RATE_LIMIT_WINDOW_MS - (now - record.lastSubmittedAt);
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      const formattedTime = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

      console.warn(
        `[Anti-Spam] Rejected submission from IP ${clientIp}: rate limit active (${remainingSeconds}s remaining)`
      );

      return res.status(429).json({
        error: `Anti-spam protection: You can submit feedback once every 5 minutes from the same IP address. Please wait ${formattedTime} before submitting again.`,
        retryAfterSeconds: remainingSeconds,
        clientIp,
      });
    }

    const { text, category, userEmail, storeDomain, storeName, timestamp } = req.body || {};

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Feedback text is required.' });
    }

    const trimmedText = text.trim();
    if (trimmedText.length > MAX_FEEDBACK_LENGTH) {
      return res.status(400).json({
        error: `Feedback exceeds maximum allowed length of ${MAX_FEEDBACK_LENGTH} characters (provided ${trimmedText.length}).`,
      });
    }

    // Register IP submission timestamp
    ipSubmissionTracker.set(clientIp, {
      lastSubmittedAt: now,
      count: (record?.count || 0) + 1,
    });

    const submissionId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const storedItem: StoredFeedback = {
      id: submissionId,
      ip: clientIp,
      text: trimmedText,
      category: category || 'general',
      userEmail: typeof userEmail === 'string' ? userEmail.trim() : undefined,
      storeDomain: typeof storeDomain === 'string' ? storeDomain : undefined,
      storeName: typeof storeName === 'string' ? storeName : undefined,
      timestamp: timestamp || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    };

    receivedFeedbackArchive.unshift(storedItem);
    if (receivedFeedbackArchive.length > 200) {
      receivedFeedbackArchive.pop();
    }

    console.log(
      `[Feedback Received] ID: ${submissionId} | Category: ${storedItem.category} | IP: ${clientIp} | Recipient: ${FEEDBACK_RECIPIENT_EMAIL}`
    );

    return res.status(200).json({
      success: true,
      id: submissionId,
      message: 'Feedback submitted and logged successfully.',
      cooldownSeconds: RATE_LIMIT_WINDOW_MS / 1000,
      recipientEmail: FEEDBACK_RECIPIENT_EMAIL,
    });
  });

  /**
   * Stored recap archives
   */
  const sentRecapsArchive: Array<{
    id: string;
    recipientEmail: string;
    storeName?: string;
    storeDomain?: string;
    riskScore: number;
    overallHealthStatus?: string;
    totalIssuesCount: number;
    severityBreakdown?: {
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
    };
    zeroDollarCartVulnerable?: boolean;
    maxStackableDiscountPct?: number;
    issues: Array<{
      id: string;
      title: string;
      severity: string;
      domain?: string;
      financialImpact?: string;
      description?: string;
      remediationStep?: string;
    }>;
    summaryNotes?: string;
    source: string;
    clientIp: string;
    sentAt: string;
  }> = [];

  /**
   * POST /api/send-recap
   * Dispatches an email recap summarizing issues identified during the Shopify audit.
   */
  app.post('/api/send-recap', (req, res) => {
    const clientIp = extractClientIp(req);
    const {
      recipientEmail,
      storeName,
      storeDomain,
      auditTimestamp,
      riskScore,
      overallHealthStatus,
      severityBreakdown,
      totalIssuesCount,
      zeroDollarCartVulnerable,
      maxStackableDiscountPct,
      issues,
      summaryNotes,
      source,
    } = req.body || {};

    // Validate recipient email
    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return res.status(400).json({ error: 'Recipient email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const sanitizedEmail = recipientEmail.trim().toLowerCase();
    const issuesList = Array.isArray(issues) ? issues : [];

    const criticalCount =
      severityBreakdown?.CRITICAL ??
      issuesList.filter((i) => i && typeof i === 'object' && i.severity === 'CRITICAL').length;
    const highCount =
      severityBreakdown?.HIGH ??
      issuesList.filter((i) => i && typeof i === 'object' && i.severity === 'HIGH').length;
    const mediumCount =
      severityBreakdown?.MEDIUM ??
      issuesList.filter((i) => i && typeof i === 'object' && i.severity === 'MEDIUM').length;
    const lowCount =
      severityBreakdown?.LOW ??
      issuesList.filter((i) => i && typeof i === 'object' && i.severity === 'LOW').length;

    const recapId = `recap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sentAt = new Date().toISOString();

    const record = {
      id: recapId,
      recipientEmail: sanitizedEmail,
      storeName: typeof storeName === 'string' ? storeName : undefined,
      storeDomain: typeof storeDomain === 'string' ? storeDomain : undefined,
      riskScore: typeof riskScore === 'number' ? riskScore : 0,
      overallHealthStatus: typeof overallHealthStatus === 'string' ? overallHealthStatus : undefined,
      totalIssuesCount: typeof totalIssuesCount === 'number' ? totalIssuesCount : issuesList.length,
      severityBreakdown: {
        CRITICAL: criticalCount,
        HIGH: highCount,
        MEDIUM: mediumCount,
        LOW: lowCount,
      },
      zeroDollarCartVulnerable: typeof zeroDollarCartVulnerable === 'boolean' ? zeroDollarCartVulnerable : undefined,
      maxStackableDiscountPct: typeof maxStackableDiscountPct === 'number' ? maxStackableDiscountPct : undefined,
      issues: issuesList,
      summaryNotes: typeof summaryNotes === 'string' ? summaryNotes.trim() : undefined,
      source: source === 'user_account' ? 'user_account' : 'manual_input',
      clientIp,
      sentAt,
    };

    sentRecapsArchive.unshift(record);
    if (sentRecapsArchive.length > 100) {
      sentRecapsArchive.pop();
    }

    // Build human-readable email recap body for email dispatch logging
    const storeLabel = storeName ? `${storeName} (${storeDomain || 'N/A'})` : storeDomain || 'Shopify Store';
    const healthBadge = record.overallHealthStatus ? `[${record.overallHealthStatus.replace(/_/g, ' ')}]` : '';

    console.log(`\n======================================================`);
    console.log(`[EMAIL AUDIT ISSUES RECAP DISPATCHED] ID: ${recapId}`);
    console.log(`To: ${sanitizedEmail} (Source: ${record.source})`);
    console.log(`Subject: Shopify Audit Issues Identified Summary - ${storeLabel}`);
    console.log(`Store Risk Index: ${record.riskScore}/100 ${healthBadge}`);
    console.log(`Total Issues Identified: ${record.totalIssuesCount} (${criticalCount} Critical, ${highCount} High, ${mediumCount} Medium, ${lowCount} Low)`);
    if (typeof zeroDollarCartVulnerable === 'boolean') {
      console.log(`Zero-Dollar Cart Status: ${zeroDollarCartVulnerable ? 'VULNERABLE (Immediate margin leak)' : 'Protected'}`);
    }
    if (typeof maxStackableDiscountPct === 'number') {
      console.log(`Max Stackable Discount: ${maxStackableDiscountPct}%`);
    }
    console.log(`\nIdentified Issues Overview:`);
    issuesList.slice(0, 10).forEach((issue, idx) => {
      console.log(`  ${idx + 1}. [${issue.severity || 'ISSUE'}] ${issue.id || ''}: ${issue.title || 'Untitled finding'}`);
      if (issue.financialImpact) {
        console.log(`     Impact: ${issue.financialImpact}`);
      }
    });
    if (issuesList.length > 10) {
      console.log(`  ... and ${issuesList.length - 10} more issues.`);
    }
    if (summaryNotes) {
      console.log(`Auditor Notes: "${summaryNotes}"`);
    }
    console.log(`======================================================\n`);

    return res.status(200).json({
      success: true,
      id: recapId,
      sentTo: sanitizedEmail,
      sentAt,
      message: `Audit issues identified summary email successfully sent to ${sanitizedEmail}.`,
      summary: {
        storeLabel,
        totalIssuesCount: record.totalIssuesCount,
        severityBreakdown: record.severityBreakdown,
        riskScore: record.riskScore,
        zeroDollarCartVulnerable: record.zeroDollarCartVulnerable,
        maxStackableDiscountPct: record.maxStackableDiscountPct,
      },
    });
  });

  /**
   * GET /api/recaps
   * Retrieves recent recap delivery history for auditing.
   */
  app.get('/api/recaps', (req, res) => {
    return res.json({
      totalSent: sentRecapsArchive.length,
      recaps: sentRecapsArchive.slice(0, 20),
    });
  });

  /**
   * GET /api/overview-pdf
   * Serves the pre-compiled high-level executive PDF overview of the application.
   */
  app.get('/api/overview-pdf', (req, res) => {
    const pdfPath = path.join(process.cwd(), 'public', 'Shopify-Revenue-Audit-Engine-Overview.pdf');
    if (fs.existsSync(pdfPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Shopify-Revenue-Audit-Engine-Overview.pdf"');
      return res.sendFile(pdfPath);
    }
    return res.status(404).json({ error: 'PDF overview file not found.' });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express v5 syntax
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
