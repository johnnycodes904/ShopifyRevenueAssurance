# Shopify Revenue Assurance Auditor

> **Auditor Identity**: Senior Shopify Architect & Revenue Assurance Auditor (v2.4)  
> **API Target**: Shopify Admin GraphQL API (version `2024-10` and later)  
> **Runtime**: React 19 + TypeScript + Express + Vite + Tailwind CSS  

---

## Table of Contents
1. [Overview & Executive Summary](#overview--executive-summary)
2. [Prompt Schemas & Data Contracts](#prompt-schemas--data-contracts)
   - [Auditor Persona & Operational Directives](#auditor-persona--operational-directives)
   - [Master Data Ingestion GraphQL Query](#master-data-ingestion-graphql-query)
   - [Raw Ingestion Payload Schemas](#raw-ingestion-payload-schemas)
   - [Structured JSON Audit Report Schema](#structured-json-audit-report-schema)
   - [Communication & Email Recap Schemas](#communication--email-recap-schemas)
3. [Integration Architectures](#integration-architectures)
   - [System Architecture Diagram](#system-architecture-diagram)
   - [Zero-Credential / Direct Ingestion Security Model](#zero-credential--direct-ingestion-security-model)
   - [Full-Stack Microservices & Proxy Architecture](#full-stack-microservices--proxy-architecture)
   - [Extensible User Account & Recipient Service Layer](#extensible-user-account--recipient-service-layer)
   - [Anti-Spam Rate-Limiting & Telemetry-Free Logging](#anti-spam-rate-limiting--telemetry-free-logging)
4. [Deterministic JSON Validation Logic](#deterministic-json-validation-logic)
   - [Why Deterministic Logic Over LLM Hallucination?](#why-deterministic-logic-over-llm-hallucination)
   - [Entity Extraction & Relay Connection Normalization](#entity-extraction--relay-connection-normalization)
   - [Domain 1: Delivery & Shipping Rate Boundaries](#domain-1-delivery--shipping-rate-boundaries)
   - [Domain 2: Discount Stacking Matrix & Worst-Case Margin Engine](#domain-2-discount-stacking-matrix--worst-case-margin-engine)
   - [Domain 3: Tracking Pixel Collisions & Orphaned Script Detection](#domain-3-tracking-pixel-collisions--orphaned-script-detection)
   - [Deterministic Risk Scoring & Health Classification Formula](#deterministic-risk-scoring--health-classification-formula)
5. [Benchmark Test Suite & Payloads](#benchmark-test-suite--payloads)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Getting Started & Local Development](#getting-started--local-development)

---

## 1. Overview & Executive Summary

The **Shopify Revenue Assurance Auditor** is an enterprise-grade auditing platform designed for Shopify Plus merchants, systems architects, and e-commerce agencies. It ingests raw Shopify Admin GraphQL payloads to detect silent revenue leaks, conversion blockers, and attribution distortions before high-traffic events (e.g., Black Friday / Cyber Monday).

### Core Problem Solved
- **Dead-Zone Shipping Gaps**: Minute weight gaps (e.g. 5.0 lb to 5.1 lb) or subtotal gaps between shipping tiers that cause 100% checkout drops with generic *"Shipping not available"* errors.
- **Runaway Discount Stacking**: Combinations of automatic promotions, VIP coupon codes, and free shipping subsidies that compound to produce **$0.00 checkout exploits** or severe negative contribution margins.
- **Tracking Pixel Collisions**: Simultaneous execution of modern Shopify Customer Events Web Pixels and legacy inline liquid tracking scripts (`fbq`, `gtag`), causing 200% conversion over-reporting and skewed algorithmic ad bidding.
- **Orphaned Script Bloat**: Lingering third-party scripts from uninstalled apps hosted on deprecated CDNs that drag down mobile page speed and Core Web Vitals.

---

## 2. Prompt Schemas & Data Contracts

### Auditor Persona & Operational Directives
When interacting with LLM reasoning agents or generating structured audit analysis, the auditor operates under the following persona specification:

```yaml
Auditor Identity: "Senior Shopify Architect & Revenue Assurance Auditor v2.4"
Role: "Principal Systems Architect analyzing Shopify Admin GraphQL responses"
Standards: "Shopify Checkout Extensibility, 2024-10 Admin API, Unit Economics & Margin Safety"
Evaluation Mode: "Strictly Deterministic Mathematical Verification"
Output Requirement: "Valid JSON schema conforming to AuditReport interface"
```

---

### Master Data Ingestion GraphQL Query
Merchants and auditors execute this query within the **Shopify GraphiQL App** or via their CI/CD deployment pipeline. It extracts all configuration nodes required for the audit:

```graphql
query StoreRevenueAssuranceAudit {
  shop {
    name
    myshopifyDomain
    primaryDomain {
      host
      url
    }
  }

  # 1. Delivery & Shipping Profiles
  deliveryProfiles(first: 20) {
    edges {
      node {
        id
        name
        default
        profileLocationGroups {
          locationGroup {
            id
          }
          locations(first: 20) {
            edges {
              node {
                id
                name
                isActive
                fulfillsOnlineOrders
              }
            }
          }
          shippingZones: zones(first: 30) {
            edges {
              node {
                id
                name
                countries {
                  code
                  name
                }
                priceBasedRates {
                  id
                  name
                  price { amount currencyCode }
                  minOrderSubtotal { amount }
                  maxOrderSubtotal { amount }
                }
                weightBasedRates {
                  id
                  name
                  price { amount currencyCode }
                  minOrderWeight { value unit }
                  maxOrderWeight { value unit }
                }
              }
            }
          }
        }
      }
    }
  }

  # 2. International Markets
  markets(first: 25) {
    edges {
      node {
        id
        name
        enabled
        regions(first: 50) {
          edges {
            node {
              name
              code
            }
          }
        }
      }
    }
  }

  # 3. Fulfillment Locations
  locations(first: 20) {
    edges {
      node {
        id
        name
        isActive
        shipsInventory
        fulfillsOnlineOrders
      }
    }
  }

  # 4. Catalog Products & Inventory Levels
  products(first: 50) {
    edges {
      node {
        id
        title
        status
        variants(first: 10) {
          edges {
            node {
              id
              title
              inventoryItem {
                inventoryLevels(first: 10) {
                  edges {
                    node {
                      location {
                        id
                        name
                      }
                      quantities(names: ["available"]) {
                        name
                        quantity
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  # 5. Discounts & Stacking Combinations
  discountNodes(first: 100) {
    edges {
      node {
        id
        discount {
          __typename
          ... on DiscountCodeBasic {
            title
            status
            appliesOncePerCustomer
            usageLimit
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
            customerGets {
              value {
                ... on DiscountPercentage { percentage }
                ... on DiscountAmount { amount { amount currencyCode } }
              }
            }
            minimumRequirement {
              ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount } }
              ... on DiscountMinimumQuantity { greaterThanOrEqualToQuantity { quantity } }
            }
          }
          ... on DiscountAutomaticBasic {
            title
            status
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
            customerGets {
              value {
                ... on DiscountPercentage { percentage }
                ... on DiscountAmount { amount { amount currencyCode } }
              }
            }
            minimumRequirement {
              ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount } }
            }
          }
          ... on DiscountCodeFreeShipping {
            title
            status
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
            minimumRequirement {
              ... on DiscountMinimumSubtotal { greaterThanOrEqualToSubtotal { amount } }
            }
          }
        }
      }
    }
  }

  # 6. Customer Events Web Pixels
  webPixels(first: 20) {
    edges {
      node {
        id
        status
        settings
      }
    }
  }

  # 7. Legacy Script Tags
  scriptTags(first: 50) {
    edges {
      node {
        id
        src
        event
        displayScope
        created_at
        updated_at
      }
    }
  }
}
```

---

### Raw Ingestion Payload Schemas
The audit ingestion engine accepts both nested GraphQL wrappers and flattened JSON representations:

```typescript
export interface ShopifyRawPayload {
  shop?: {
    name?: string;
    myshopifyDomain?: string;
    primaryDomain?: { url: string; host: string };
  };
  data?: {
    shop?: { name?: string; myshopifyDomain?: string };
    deliveryProfiles?: { edges?: Array<{ node: ShopifyDeliveryProfile }> } | ShopifyDeliveryProfile[];
    markets?: { edges?: Array<{ node: ShopifyMarket }> } | ShopifyMarket[];
    locations?: { edges?: Array<{ node: ShopifyLocation }> } | ShopifyLocation[];
    products?: { edges?: Array<{ node: ShopifyProduct }> } | ShopifyProduct[];
    discountNodes?: { edges?: Array<{ node: ShopifyDiscountNode }> } | ShopifyDiscountNode[];
    webPixels?: { edges?: Array<{ node: ShopifyWebPixel }> } | ShopifyWebPixel[];
    scriptTags?: { edges?: Array<{ node: ShopifyScriptTag }> } | ShopifyScriptTag[];
    themeInlineScripts?: ShopifyThemeInlineScript[];
  };
  // Or direct top-level keys
  deliveryProfiles?: ShopifyDeliveryProfile[];
  markets?: ShopifyMarket[];
  locations?: ShopifyLocation[];
  products?: ShopifyProduct[];
  discountNodes?: ShopifyDiscountNode[];
  webPixels?: ShopifyWebPixel[];
  scriptTags?: ShopifyScriptTag[];
  themeInlineScripts?: ShopifyThemeInlineScript[];
  [key: string]: unknown;
}
```

---

### Structured JSON Audit Report Schema
The output contract generated by `runShopifyRevenueAudit(input)` guarantees strict type conformity:

```typescript
export interface AuditReport {
  audit_metadata: {
    store_name?: string;
    store_domain?: string;
    audit_timestamp: string;               // ISO 8601
    auditor_identity: string;              // "Senior Shopify Architect & Revenue Assurance Auditor v2.4"
    total_findings: number;
    risk_score: number;                    // 0 to 100
    overall_health_status: 'CRITICAL_RISK' | 'HIGH_RISK' | 'ELEVATED' | 'HEALTHY';
    severity_breakdown: {
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
    };
    domain_breakdown: {
      delivery_and_shipping: number;
      discounts_and_promotions: number;
      tracking_and_scripts: number;
    };
  };
  worst_case_margin_exposure: WorstCaseMarginExposure;
  findings: AuditFinding[];
  inspected_nodes_summary: {
    delivery_profiles_count: number;
    shipping_zones_count: number;
    markets_count: number;
    locations_count: number;
    products_evaluated_count: number;
    discount_nodes_count: number;
    web_pixels_count: number;
    script_tags_count: number;
    inline_theme_scripts_count: number;
  };
}

export interface AuditFinding {
  id: string;                              // e.g. "AUDIT-SHIP-WEIGHT-GAP-DOMESTIC-US-0"
  domain: 'delivery_and_shipping' | 'discounts_and_promotions' | 'tracking_and_scripts';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  affected_nodes: AffectedNode[];
  financial_impact: string;
  remediation_steps: string[];
  graphql_mutation_snippet?: string;      // Production GraphQL mutation to apply fix
  admin_navigation_path?: string;         // Breadcrumb path inside Shopify Admin UI
}
```

---

### Communication & Email Recap Schemas
Payload dispatched to `POST /api/send-recap` to archive and transmit executive findings:

```typescript
export interface RecapPayload {
  recipientEmail: string;                 // Required, sanitized email regex validated
  storeName?: string;
  storeDomain?: string;
  auditTimestamp: string;
  riskScore: number;
  overallHealthStatus?: string;
  severityBreakdown?: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  totalIssuesCount: number;
  zeroDollarCartVulnerable?: boolean;
  maxStackableDiscountPct?: number;
  issues: IdentifiedIssueSummaryItem[];
  summaryNotes?: string;
  source: 'manual_input' | 'user_account';
}

export interface IdentifiedIssueSummaryItem {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  domain: string;
  financialImpact: string;
  description: string;
  remediationStep?: string;
}
```

---

## 3. Integration Architectures

### System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                            CLIENT BROWSER (React SPA)                             |
|                                                                                   |
|  +---------------------+   +-----------------------+   +-----------------------+  |
|  |   GraphiQL Query    |   |  Benchmark Case JSON  |   |   Local .json File    |  |
|  |     Modal Ingest    |   |    Payload Selector   |   |   Drag-and-Drop / PASTE   |  |
|  +----------+----------+   +-----------+-----------+   +-----------+-----------+  |
|             |                          |                           |              |
|             +--------------------------+---------------------------+              |
|                                        |                                          |
|                                        v                                          |
|                   +----------------------------------------+                      |
|                   |   Deterministic Audit Engine Core      |                      |
|                   |  - Relay Connection Normalizer         |                      |
|                   |  - Interval & Boundary Math (Shipping) |                      |
|                   |  - Margin & Stacking Simulator         |                      |
|                   |  - Web Pixel & Regex Collision Scanner |                      |
|                   +--------------------+-------------------+                      |
|                                        |                                          |
|           +----------------------------+----------------------------+             |
|           |                            |                            |             |
|           v                            v                            v             |
|   +---------------+            +---------------+            +---------------+     |
|   | Findings List |            | Margin Sim UI |            | Playbook &    |     |
|   | & Domain Chip |            | & $0.00 Cart  |            | GraphQL Fix   |     |
|   | Filtering     |            | Breakdown     |            | Mutations     |     |
|   +---------------+            +---------------+            +---------------+     |
|           |                                                         |             |
+-----------|---------------------------------------------------------|-------------+
            |                                                         |
            | HTTP POST /api/send-recap (RecapPayload)                |
            v                                                         v
+-----------------------------------------------------------------------------------+
|                        FULL-STACK NODE / EXPRESS BACKEND                          |
|                                                                                   |
|   +--------------------------+     +--------------------------+                   |
|   |   POST /api/send-recap   |     |   POST /api/feedback     |                   |
|   |   - RFC 5322 validation  |     |   - IP Cooldown Tracker  |                   |
|   |   - Audit Log Archival   |     |   - 5-Min Anti-Spam Rate |                   |
|   |   - Plaintext Formatting |     |   - In-memory ring buffer|                   |
|   +--------------------------+     +--------------------------+                   |
|                                                                                   |
|   +--------------------------+     +--------------------------+                   |
|   |   GET /api/recaps        |     |   GET /api/health        |                   |
|   |   - Historical Deliveries|     |   - Liveness Probe       |                   |
|   +--------------------------+     +--------------------------+                   |
|                                                                                   |
|   Mounted Middleware:                                                             |
|   - Dev: Vite Dev Server Middleware (`createViteServer`)                          |
|   - Prod: Static Dist Server (`dist/index.html` fallback)                         |
+-----------------------------------------------------------------------------------+
```

---

### Zero-Credential / Direct Ingestion Security Model
Unlike legacy SaaS tools that demand permanent Admin API access tokens with `read_shipping`, `read_discounts`, and `read_script_tags` scopes:
1. **No Tokens in the Browser**: The application never prompts for or stores merchant API access tokens or client secrets.
2. **Zero Blast Radius**: Data is ingested via copy-pasting JSON from Shopify GraphiQL or uploading exported `.json` payloads.
3. **Stateless Compliance**: Payloads are processed client-side in browser memory without sending merchant catalog or discount configurations to external databases.
4. **Remediation via Self-Executed Mutations**: Instead of executing write actions automatically, the app provides exact GraphQL mutation snippets and deep Admin navigation links for authorized human operators to review and apply.

---

### Full-Stack Microservices & Proxy Architecture
- **Express Backend (`server.ts`)**:
  - Serves as the single runtime entry point.
  - Mounts Vite in middleware mode during local development (`NODE_ENV !== 'production'`) and serves static artifacts in production.
  - Exposes dedicated endpoints for recap dispatching, audit history, and bug reporting.
- **Client IP Extraction**:
  - Resolves client IP across reverse proxies via `x-forwarded-for`, `x-real-ip`, and fallback socket addresses (`extractClientIp`).
- **In-Memory Retention**:
  - Maintains ring buffers of the last 100 recap deliveries and 200 feedback submissions with automated memory cleanup intervals.

---

### Extensible User Account & Recipient Service Layer
Located at `src/services/userAccount.ts`, this module isolates identity management from UI rendering:

```typescript
export interface UserAccount {
  id: string;
  email: string;
  name?: string;
  storeDomain?: string;
  role?: 'merchant_owner' | 'developer' | 'auditor' | 'guest';
  isAuthenticated: boolean;
  linkedAt?: string;
}
```

- **Pluggable Architecture**: Implements `EmailRecipientResolver` with an initial `DefaultEmailRecipientProvider` using localStorage hydration.
- **Future Ready**: Built with explicit hooks to attach **Shopify App Bridge Session Tokens**, **Google OAuth**, or **Firebase Authentication** without rewriting UI components.

---

### Anti-Spam Rate-Limiting & Telemetry-Free Logging
- **IP Cooldown Window**: Enforces a strict 5-minute cooldown (`RATE_LIMIT_WINDOW_MS = 300,000ms`) per client IP on `/api/feedback`.
- **Pre-Flight Inquiries**: The client polls `GET /api/feedback/status` to determine whether the user is on cooldown and displays remaining seconds.
- **Telemetry-Free Guarantee**: No external third-party analytics (Google Analytics, Segment, Datadog) or tracking beacons are embedded, maintaining privacy and clean evaluation environments.

---

## 4. Deterministic JSON Validation Logic

### Why Deterministic Logic Over LLM Hallucination?
Large Language Models (LLMs) are probabilistic and often suffer from:
1. **Boundary Hallucination**: Overlooking subtle interval float differences (e.g., mistaking `5.00` and `5.01` for contiguous).
2. **Arithmetic Inconsistency**: Failing to accurately calculate compounding percentages across multiple discount tiers and cart sizes.
3. **Non-Reproducibility**: Generating variable findings across identical test runs, which fails enterprise audit compliance standards.

Our deterministic engine executes **pure mathematical algorithms and exact schema boundary inspections**, ensuring 100% reproducible, audit-grade verification.

---

### Entity Extraction & Relay Connection Normalization
Shopify Admin GraphQL returns paginated Relay connections (`{ edges: [{ node: { ... } }] }`). Our engine normalizes both nested connections and flat arrays via `extractList<T>`:

```typescript
function extractList<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === 'object' && raw !== null) {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.edges)) {
      return record.edges.map((e: any) => e?.node ?? e);
    }
    if (Array.isArray(record.nodes)) {
      return record.nodes as T[];
    }
  }
  return [];
}
```

---

### Domain 1: Delivery & Shipping Rate Boundaries

```
Weight Tier Gap Logic:
Sorted Tiers: [ (0.0 to 5.0 lb) , (5.1 to 10.0 lb) ]
                           ^^^^^   ^^^^^
                           Max_i   Min_{i+1}
                           Gap = 5.1 - 5.0 = 0.1 lb  ==>  [CRITICAL FINDING]
```

1. **Weight Tier Dead-Zone Gaps**:
   - Collects all `weightBasedRates` per shipping zone.
   - Sorts tiers ascending by `minOrderWeight.value`.
   - Compares tier $i$ (`currentMax`) with tier $i+1$ (`nextMin`).
   - If `nextMin > currentMax` by $> 0.001$, flags a **CRITICAL** finding (`AUDIT-SHIP-WEIGHT-GAP-*`).
2. **Price Tier Subtotal Gaps**:
   - Collects all `priceBasedRates` per zone.
   - Sorts tiers ascending by `minOrderSubtotal.amount`.
   - If `nextMin > currentMax` by $> $0.01$, flags a **CRITICAL** finding (`AUDIT-SHIP-PRICE-GAP-*`).
3. **Missing Upper-Bound Rates (High AOV Dead-Ends)**:
   - Evaluates the highest price tier in a zone.
   - If `highestTier.maxOrderSubtotal.amount` is set and $> 0$ with no subsequent uncapped rate, flags a **CRITICAL** finding (`AUDIT-SHIP-UNBOUNDED-UPPER-*`). High-spending VIP shoppers will be blocked at checkout.
4. **Market vs. Shipping Zone Coverage Gap**:
   - Compares all country codes configured in active `ShopifyMarket` entities against a `Set` of countries mapped to active shipping zones.
   - Any active market country lacking shipping rates is flagged as a **CRITICAL** international conversion leak (`AUDIT-SHIP-MARKET-NO-RATES-*`).
5. **Unserviced Fulfillment Locations**:
   - Cross-references catalog variant inventory levels against active fulfillment locations.
   - Flags products stocked exclusively at locations omitted from delivery profile location groups (`AUDIT-SHIP-UNSERVICED-LOCATION-PRODUCTS`).

---

### Domain 2: Discount Stacking Matrix & Worst-Case Margin Engine

```
Stacking Vulnerability Formula:
CombinesWith(Product: true) + CombinesWith(Order: true) + CombinesWith(Shipping: true)
+ MinimumRequirement(Subtotal == 0 && Qty == 0)
==> [CRITICAL: Unrestricted Stacking]
```

1. **Unrestricted Multi-Category Stacking**:
   - Checks active discount nodes for `combinesWith` permissions across `productDiscounts`, `orderDiscounts`, and `shippingDiscounts`.
   - If all three are `true` and `minimumRequirement` is null/zero, flags **CRITICAL** unrestricted stacking (`AUDIT-DISC-UNRESTRICTED-STACKING-*`).
2. **Uncapped Exposure on High-Value Discounts**:
   - Identifies active percentage discounts $> 30\%$ or fixed amounts $\ge \$50$.
   - Flags an alert if `usageLimit === null` and `appliesOncePerCustomer === false` (`AUDIT-DISC-UNCAPPED-EXPOSURE-*`), protecting against Honey / coupon scraper leaks.
3. **Worst-Case Margin Simulation Engine (`marginCalculator.ts`)**:
   - Evaluates standard customer basket sizes: `[$25.00, $50.00, $75.00, $100.00, $150.00, $250.00]`.
   - Applies active automatic discounts, stackable code discounts, and merchant-absorbed carrier shipping costs ($15 standard baseline).
   - Computes:
     $$\text{Net Revenue} = \text{Basket Size} - \text{Product Discounts} - \text{Order Discounts}$$
     $$\text{Margin Erosion \%} = \frac{\text{Total Discounts} + \text{Merchant Absorbed Shipping}}{\text{Gross Revenue}} \times 100$$
   - **$0.00 Order Exploit Alert**: If $\text{Net Revenue} \le \$0.00$, triggers an emergency **CRITICAL** exploit finding (`AUDIT-DISC-WORST-CASE-ZERO-DOLLAR`).
   - **High Erosion Alert**: If max stackable discount exceeds $50\%$, triggers a **HIGH** severity finding (`AUDIT-DISC-HIGH-COMBINED-EROSION`).

---

### Domain 3: Tracking Pixel Collisions & Orphaned Script Detection

```
Pixel Collision Matrix:
Active Web Pixel: [ Meta Pixel Extension (Target: 'meta', ID: 9912) ]
Inline Liquid:    [ fbq('track', 'Purchase', ...) in theme.liquid   ]
==> [HIGH: Duplicate Meta Pixel Tracking Collision - 200% ROAS Distortion]
```

1. **Customer Events Web Pixel vs. Inline Theme Collision**:
   - Inspects `webPixels` for active status and identifies target platforms (`META_PIXEL`, `GA4`, `TIKTOK`).
   - Scans `themeInlineScripts` and `scriptTags` using regex patterns for conversion calls:
     - Meta: `/fbq\(['"]track['"],\s*['"]Purchase['"]\)/i` and `/InitiateCheckout/i`
     - GA4: `/gtag\(['"]event['"],\s*['"]purchase['"]/i` and `/begin_checkout/i`
   - If both the Web Pixel extension and an inline script track the same event, flags a **HIGH** severity finding (`AUDIT-TRACK-DUPLICATE-PIXEL-*`).
2. **Deprecated CDN / Orphaned Script Tags**:
   - Inspects `scriptTags.src` against a signature database of defunct third-party services:
     - Privy Legacy: `/cdn\.privy\.com\/legacy/i`
     - Yotpo Deprecated: `/yotpo.*deprecated|staticw2\.yotpo\.com\/.*\/bad/i`
     - Uninstalled App Cloudfront: `/cloudfront\.net\/(uninstalled|dead|legacy-app)/i`
     - Hotjar Defunct: `/static\.hotjar\.com\/c\/hotjar-deprecated/i`
     - jQuery v1.x: `/ajax\.googleapis\.com\/ajax\/libs\/jquery\/1\./i`
     - Bold Commerce v1 API: `/boldapps\.net\/.*\/v1/i`
   - Flags orphaned scripts (`AUDIT-TRACK-DEPRECATED-CDN-*`) that block DOM parsing and increase Largest Contentful Paint (LCP).
3. **Legacy ScriptTag API Deprecation**:
   - Flags scripts using `displayScope: 'ALL'` for migration to Shopify Checkout UI Extensions (`AUDIT-TRACK-LEGACY-SCRIPTAG-API-*`).

---

### Deterministic Risk Scoring & Health Classification Formula

The Store Risk Index is computed via a weighted multi-variable formula bounded between 0 and 100:

$$\text{Raw Score} = (\text{CRITICAL} \times 35) + (\text{HIGH} \times 18) + (\text{MEDIUM} \times 8) + (\text{LOW} \times 2)$$

$$\text{Risk Score} = \min(100, \max(0, \text{Raw Score}))$$

#### Health Classification Tiers
| Health Status | Trigger Conditions | Merchant Action |
| :--- | :--- | :--- |
| **`CRITICAL_RISK`** | $\text{CRITICAL} > 0$ OR $\text{Risk Score} \ge 75$ | Immediate deployment freeze. Remediate $0 cart or shipping gaps before launching ad campaigns. |
| **`HIGH_RISK`** | $\text{HIGH} > 0$ OR $\text{Risk Score} \ge 50$ | High margin leakage or ad attribution double-counting. Schedule remediation within 24 hours. |
| **`ELEVATED`** | $\text{MEDIUM} > 0$ OR $\text{Risk Score} \ge 25$ | Technical debt, orphaned scripts, or minor conversion friction. |
| **`HEALTHY`** | All severities $= 0$ AND $\text{Risk Score} < 25$ | Store configurations comply with Shopify architecture standards. |

---

## 5. Benchmark Test Suite & Payloads

The repository bundles 4 production benchmark scenarios under `src/data/benchmarkPayloads.ts` for automated testing and sandbox validation:

1. **Enterprise Apparel (`enterprise-multi-domain-audit`)**:
   - **Profile**: High-volume lifestyle brand.
   - **Issues Tested**: Weight gap (5.0–5.1 lb), price tier cap ($150), unmapped EU market countries, unrestricted 3-way discount stacking ($0 cart risk), uncapped 40% VIP code, Meta/GA4 pixel collisions, and deprecated Privy CDN script.
2. **DTC Cosmetics & Skincare (`dtc-cosmetics-margin-leak`)**:
   - **Profile**: High-AOV beauty merchant.
   - **Issues Tested**: Tier gap between $50 and $75, unmapped APAC countries, unserviced distribution warehouse, and 50% influencer code without usage caps.
3. **Global Electronics (`global-electronics-market-gaps`)**:
   - **Profile**: Multi-market electronics retailer.
   - **Issues Tested**: Weight gap in heavy freight (25–30 lb), unmapped Latin America markets, orphaned Yotpo/Cloudfront scripts, and Google Analytics 4 dual firing.
4. **Clean Baseline Merchant (`clean-baseline-store`)**:
   - **Profile**: Perfectly architected Shopify store.
   - **Issues Tested**: Zero critical, high, or medium issues. Validates the `HEALTHY` health status baseline.

---

## 6. API Endpoints Reference

### `GET /api/health`
Health check and liveness probe.
- **Response**: `{ "status": "ok", "timestamp": "2026-09-29T11:15:00.000Z" }`

### `POST /api/send-recap`
Dispatches an email summary of identified issues and saves an audit record.
- **Payload**: `RecapPayload` (see [Communication Schemas](#communication--email-recap-schemas))
- **Response**:
  ```json
  {
    "success": true,
    "id": "recap_1789926444206_wmgbf",
    "sentTo": "merchant@company.com",
    "sentAt": "2026-09-29T11:15:00.000Z",
    "message": "Audit issues identified summary email successfully sent to merchant@company.com.",
    "summary": {
      "storeLabel": "Apex Performance Athletics (apex-demo.myshopify.com)",
      "totalIssuesCount": 5,
      "severityBreakdown": { "CRITICAL": 2, "HIGH": 2, "MEDIUM": 1, "LOW": 0 },
      "riskScore": 85,
      "zeroDollarCartVulnerable": true,
      "maxStackableDiscountPct": 75
    }
  }
  ```

### `GET /api/recaps`
Retrieves recent recap dispatch logs for auditing and compliance tracking.
- **Response**: `{ "totalSent": 1, "recaps": [ ... ] }`

### `POST /api/feedback`
Submits user feedback or bug report with IP-based rate limiting (1 per 5 minutes).
- **Payload**:
  ```json
  {
    "text": "Found a new combination pattern in 2024-10 discounts API.",
    "category": "bug",
    "userEmail": "engineer@agency.com",
    "storeDomain": "client.myshopify.com"
  }
  ```
- **Response**:
  - `200 OK`: Feedback submitted and logged.
  - `429 Too Many Requests`: Anti-spam cooldown active with `retryAfterSeconds`.

### `GET /api/feedback/status`
Checks if the client IP is currently on anti-spam cooldown.
- **Response**: `{ "onCooldown": false, "remainingSeconds": 0, "clientIp": "127.0.0.1" }`

---

## 7. Getting Started & Local Development

### Prerequisites
- Node.js `18.x` or later (or Bun / PNPM)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation
```bash
# Clone the repository
git clone https://github.com/your-org/shopify-revenue-assurance-auditor.git
cd shopify-revenue-assurance-auditor

# Install dependencies
npm install
```

### Running Locally
```bash
# Start full-stack Express server with Vite middleware on port 3000
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Verification & Linting
```bash
# Run TypeScript compilation check
npm run lint

# Build production bundle
npm run build
```

---

## License
MIT License. Built for Shopify Architects, Developers, and Revenue Assurance Teams.
