import { jsPDF } from 'jspdf';

/**
 * Generates and downloads a beautifully styled, high-quality executive PDF overview
 * of the Shopify Revenue Assurance & Architecture Audit Engine.
 */
export function generateApplicationOverviewPdf(currentDateString = 'September 2026'): void {
  // A4 portrait: 210 x 297 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const leftMargin = 16;
  const rightMargin = 16;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 178 mm
  let y = 16;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 18;
      drawPageHeader();
    }
  };

  const drawPageHeader = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 140, 150);
    doc.text('Shopify Revenue Assurance & Architecture Audit Engine — Application Overview', leftMargin, 11);
    doc.text(`Generated: ${currentDateString}`, pageWidth - rightMargin, 11, { align: 'right' });
    doc.setDrawColor(225, 230, 235);
    doc.setLineWidth(0.3);
    doc.line(leftMargin, 13, pageWidth - rightMargin, 13);
  };

  // --- Cover Header Section (Slate Dark Card) ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(leftMargin, y, contentWidth, 32, 2.5, 2.5, 'F');

  // Badge inside header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(leftMargin + 6, y + 5, 52, 5.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(99, 102, 241); // indigo-400
  doc.text('SHOPIFY REVENUE ASSURANCE', leftMargin + 8.5, y + 8.8);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Architecture Audit Engine — Platform Overview', leftMargin + 6, y + 18.5);

  // Subtitle / Specs
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    'Executive feature brief: diagnostic ingestion, margin simulation, issue summaries & GraphQL remediation.',
    leftMargin + 6,
    y + 24.5
  );

  y += 38;

  // --- Executive Summary Box ---
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.roundedRect(leftMargin, y, contentWidth, 23, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Executive Summary', leftMargin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const summaryText =
    'The Shopify Revenue Assurance Audit Engine is a specialized diagnostic suite built to uncover silent margin erosion, zero-dollar cart vulnerabilities, unrestricted coupon stacking, and tracking pixel latency. It equips merchants, agencies, and auditors with instant risk assessment, interactive gross margin modeling, and executable GraphQL mutation playbooks.';
  const splitSummary = doc.splitTextToSize(summaryText, contentWidth - 10);
  doc.text(splitSummary, leftMargin + 5, y + 11.5);

  y += 28;

  // --- Feature Modules Definition ---
  const features = [
    {
      num: '01',
      title: 'Core Diagnostic Ingestion & Multi-Domain Evaluation',
      tag: 'INGESTION & BENCHMARKS',
      accentColor: [79, 70, 229], // indigo-600
      bullets: [
        'Direct Shopify Admin API & GraphQL configuration ingestion (discount nodes, delivery rules, web pixels).',
        'Pre-configured benchmark cases (e.g. Apex Performance Athletics, BFCM stacking, tracking latency).',
        'Discounts & Promotions Audit: CombinesWith flag inspection, runaway percentages, missing thresholds.',
        'Delivery & Shipping Audit: Post-discount subtotal free freight triggers, zero-dollar checkout loopholes.',
        'Tracking & Script Pixels: Redundant tags, unconsented scripts, and checkout friction detection.',
      ],
    },
    {
      num: '02',
      title: 'Executive Risk Score & Margin Simulator',
      tag: 'ANALYTICS & SIMULATION',
      accentColor: [225, 29, 72], // rose-600
      bullets: [
        'Store Risk Index (0–100 Dial): Weighted risk assessment (Critical, High, Moderate, Low Risk).',
        'Worst-Case Margin Exposure Calculator: Identifies maximum possible stackable discounts & $0 cart exploits.',
        'Interactive Order Margin Simulator: Sandbox modeling order subtotals, COGS, shipping expenses, and stacked coupon codes with real-time gross/net profit visualization.',
      ],
    },
    {
      num: '03',
      title: 'Detailed Audit Findings & Raw JSON Export',
      tag: 'INSPECTION & EXPORT',
      accentColor: [217, 119, 6], // amber-600
      bullets: [
        'Interactive filtering by severity (Critical, High, Medium, Low) and operational domain.',
        'Financial exposure statements detailing dollar impact and margin leakage mechanisms.',
        'Direct Shopify Admin navigation click-paths (e.g. Discounts > Automatic > Combination Rules).',
        'Full JSON audit report viewer with syntax formatting, copy to clipboard, and local file download.',
      ],
    },
    {
      num: '04',
      title: 'Operational Remediation Playbook & Status Tracker',
      tag: 'GRAPHQL AUTOMATION',
      accentColor: [16, 185, 129], // emerald-600
      bullets: [
        'Production-ready GraphQL Admin API mutation snippets ready for GraphiQL and custom apps.',
        'Interactive issue status tracker: Flag findings as Open, In Progress, or Resolved with custom auditor notes.',
        'Bulk script export: "Copy All Mutations" button aggregates executable remediation steps into one script.',
      ],
    },
    {
      num: '05',
      title: 'Email Issues Summary & Extensible Account Service',
      tag: 'EXECUTIVE REPORTING',
      accentColor: [13, 148, 136], // teal-600
      bullets: [
        'Executive Issues Recap: Highlights Store Risk Index, $0 cart exploit exposure, and severity distributions.',
        'Itemized vulnerability overview with fix recommendations and custom auditor commentary.',
        'Extensible recipient architecture: Decoupled for future Shopify App Bridge / OAuth / Firebase tokens.',
        'Dedicated backend API (/api/send-recap) with transmission logging and archive audit log (/api/recaps).',
      ],
    },
    {
      num: '06',
      title: 'Developer Experience, Security & Usability',
      tag: 'INFRASTRUCTURE',
      accentColor: [100, 116, 139], // slate-500
      bullets: [
        'GraphQL Query Helper Modal: Built-in master query for extracting full store metadata via Shopify API.',
        'Auditor Feedback Modal with backend rate-limiting (1 submission per 5 mins per IP) and countdown timer.',
        'Dark, Light, and System theme synchronization with responsive, single-screen dashboard layout.',
      ],
    },
  ];

  // Render Features
  features.forEach((feat) => {
    // Height calculation
    const headerHeight = 9;
    const bulletLineHeight = 4.4;
    const blockHeight = headerHeight + feat.bullets.length * bulletLineHeight + 4;

    checkPageBreak(blockHeight);

    // Feature card container
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(leftMargin, y, contentWidth, blockHeight, 1.5, 1.5, 'FD');

    // Accent line on left
    const [r, g, b] = feat.accentColor;
    doc.setFillColor(r, g, b);
    doc.roundedRect(leftMargin, y, 2.5, blockHeight, 1, 1, 'F');

    // Number & Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${feat.num}. ${feat.title}`, leftMargin + 5.5, y + 6);

    // Tag Pill
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(r, g, b);
    doc.text(feat.tag, pageWidth - rightMargin - 3, y + 6, { align: 'right' });

    // Bullets
    let bulletY = y + 10.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    feat.bullets.forEach((bullet) => {
      doc.setFillColor(r, g, b);
      doc.circle(leftMargin + 6.5, bulletY - 1, 0.6, 'F');
      const wrapped = doc.splitTextToSize(bullet, contentWidth - 14);
      doc.text(wrapped, leftMargin + 9.5, bulletY);
      bulletY += bulletLineHeight;
    });

    y += blockHeight + 3.5;
  });

  // Check room for footer card
  checkPageBreak(22);

  // Platform Specs Footer
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftMargin, y, contentWidth, 18, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Technical Stack & Architecture Specifications', leftMargin + 5, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '• Framework: React 19 + TypeScript + Vite | Styling: Tailwind CSS | Icons: Lucide Icons\n• Backend: Express server with secure /api endpoints | API Compatibility: Shopify Admin API 2024-10+\n• Client-Side Integrity: Pure memory state engine with zero unprompted data persistence.',
    leftMargin + 5,
    y + 9.5
  );

  // Bottom pagination on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Shopify Revenue Assurance Engine • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  // Trigger download in browser
  doc.save(`Shopify-Revenue-Audit-Engine-Overview-${new Date().toISOString().split('T')[0]}.pdf`);
}
