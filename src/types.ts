/**
 * Types for Shopify Admin GraphQL Ingestion & Revenue Assurance Audit Engine
 */

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type AuditDomain =
  | 'delivery_and_shipping'
  | 'discounts_and_promotions'
  | 'tracking_and_scripts';

export interface AffectedNode {
  id?: string;
  type: string;
  name?: string;
  field_path?: string;
  details?: Record<string, unknown> | unknown[];
  raw_snippet?: unknown;
}

export interface AuditFinding {
  id: string;
  domain: AuditDomain;
  severity: SeverityLevel;
  title: string;
  description: string;
  affected_nodes: AffectedNode[];
  financial_impact: string;
  remediation_steps: string[];
  graphql_mutation_snippet?: string;
  admin_navigation_path?: string;
}

export interface WorstCaseScenario {
  basket_size: number;
  applied_discounts: string[];
  gross_revenue: number;
  product_discount_total: number;
  order_discount_total: number;
  shipping_discount_total: number;
  net_revenue: number;
  margin_erosion_pct: number;
  merchant_absorbed_shipping: number;
  is_zero_dollar_cart: boolean;
}

export interface WorstCaseMarginExposure {
  max_stackable_discount_pct: number;
  max_fixed_discount_amount: number;
  has_unrestricted_stacking: boolean;
  shipping_subsidy_risk: boolean;
  zero_dollar_cart_vulnerable: boolean;
  active_auto_discounts_count: number;
  active_code_discounts_count: number;
  worst_case_scenarios: WorstCaseScenario[];
  summary: string;
}

export interface AuditReport {
  audit_metadata: {
    store_name?: string;
    store_domain?: string;
    audit_timestamp: string;
    auditor_identity: string;
    total_findings: number;
    risk_score: number; // 0 to 100
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

// Raw Shopify GraphQL Schema Interfaces
export interface ShopifyMoneyV2 {
  amount: string | number;
  currencyCode?: string;
}

export interface ShopifyWeight {
  value: number;
  unit: 'KILOGRAMS' | 'GRAMS' | 'POUNDS' | 'OUNCES' | string;
}

export interface ShopifyRateItem {
  id?: string;
  name?: string;
  title?: string;
  price?: ShopifyMoneyV2;
  minOrderSubtotal?: ShopifyMoneyV2 | null;
  maxOrderSubtotal?: ShopifyMoneyV2 | null;
  minOrderWeight?: ShopifyWeight | null;
  maxOrderWeight?: ShopifyWeight | null;
}

export interface ShopifyShippingZone {
  id?: string;
  name: string;
  countries?: Array<{
    code: string;
    name?: string;
    provinces?: Array<{ code: string; name?: string }>;
  }>;
  priceBasedRates?: ShopifyRateItem[];
  weightBasedRates?: ShopifyRateItem[];
  deliveryMethodDefinitions?: ShopifyRateItem[];
  methodDefinitions?: ShopifyRateItem[];
  rates?: ShopifyRateItem[];
}

export interface ShopifyLocationGroup {
  id?: string;
  locations?: {
    edges?: Array<{
      node: {
        id: string;
        name: string;
        isActive?: boolean;
        fulfillsOnlineOrders?: boolean;
      };
    }>;
  } | Array<{
    id: string;
    name: string;
    isActive?: boolean;
    fulfillsOnlineOrders?: boolean;
  }>;
  zones?: {
    edges?: Array<{ node: ShopifyShippingZone }>;
  } | ShopifyShippingZone[];
  shippingZones?: ShopifyShippingZone[];
}

export interface ShopifyDeliveryProfile {
  id: string;
  name: string;
  default?: boolean;
  profileLocationGroups?: ShopifyLocationGroup[];
  locationGroups?: ShopifyLocationGroup[];
  shippingZones?: ShopifyShippingZone[];
  profileItems?: {
    edges?: Array<{
      node: {
        product?: {
          id: string;
          title: string;
        };
      };
    }>;
  } | Array<{
    product?: {
      id: string;
      title: string;
    };
  }>;
}

export interface ShopifyMarketRegion {
  name: string;
  code: string;
}

export interface ShopifyMarket {
  id: string;
  name: string;
  enabled: boolean;
  primary?: boolean;
  regions?: {
    edges?: Array<{ node: ShopifyMarketRegion }>;
  } | ShopifyMarketRegion[];
  countries?: Array<{ code: string; name: string }>;
}

export interface ShopifyLocation {
  id: string;
  name: string;
  isActive: boolean;
  shipsInventory?: boolean;
  fulfillsOnlineOrders?: boolean;
}

export interface ShopifyProductVariant {
  id: string;
  title?: string;
  inventoryItem?: {
    inventoryLevels?: {
      edges?: Array<{
        node: {
          location?: {
            id: string;
            name?: string;
          };
          quantities?: Array<{ name: string; quantity: number }>;
        };
      }>;
    };
  };
}

export interface ShopifyProduct {
  id: string;
  title: string;
  status?: string;
  variants?: {
    edges?: Array<{ node: ShopifyProductVariant }>;
  } | ShopifyProductVariant[];
}

export interface ShopifyDiscountCombinesWith {
  orderDiscounts: boolean;
  productDiscounts: boolean;
  shippingDiscounts: boolean;
}

export interface ShopifyDiscountCustomerGets {
  value?: {
    percentage?: number; // e.g. 0.2 for 20%
    discountAmount?: ShopifyMoneyV2;
    amount?: ShopifyMoneyV2;
  };
  items?: unknown;
}

export interface ShopifyDiscountMinimumRequirement {
  greaterThanOrEqualToSubtotal?: ShopifyMoneyV2;
  greaterThanOrEqualToQuantity?: {
    quantity: number;
  };
}

export interface ShopifyDiscountNode {
  id: string;
  discount?: {
    __typename?: string;
    title: string;
    summary?: string;
    status: 'ACTIVE' | 'EXPIRED' | 'SCHEDULED' | string;
    isAutomatic?: boolean;
    asyncUsageCount?: number;
    usageLimit?: number | null;
    appliesOncePerCustomer?: boolean;
    combinesWith?: ShopifyDiscountCombinesWith;
    customerGets?: ShopifyDiscountCustomerGets;
    customerBuys?: unknown;
    minimumRequirement?: ShopifyDiscountMinimumRequirement | null;
    startsAt?: string;
    endsAt?: string | null;
  };
}

export interface ShopifyWebPixel {
  id: string;
  settings?: string | Record<string, unknown>;
  status?: 'ACTIVE' | 'INACTIVE' | string;
  accountID?: string;
  pixelId?: string;
  target?: string;
}

export interface ShopifyScriptTag {
  id: string;
  src: string;
  event?: 'onload' | string;
  displayScope?: 'ALL' | 'ORDER_STATUS' | 'ONLINE_STORE' | string;
  created_at?: string;
  updated_at?: string;
}

export interface ShopifyThemeInlineScript {
  id?: string;
  name?: string;
  file?: string;
  content: string;
  events?: string[];
  pixelType?: 'META' | 'GA4' | 'TIKTOK' | 'KLAVIYO' | 'OTHER';
}

export interface ShopifyRawPayload {
  shop?: {
    name?: string;
    myshopifyDomain?: string;
    primaryDomain?: { url: string; host: string };
  };
  data?: {
    shop?: {
      name?: string;
      myshopifyDomain?: string;
    };
    deliveryProfiles?: {
      edges?: Array<{ node: ShopifyDeliveryProfile }>;
    } | ShopifyDeliveryProfile[];
    markets?: {
      edges?: Array<{ node: ShopifyMarket }>;
    } | ShopifyMarket[];
    locations?: {
      edges?: Array<{ node: ShopifyLocation }>;
    } | ShopifyLocation[];
    products?: {
      edges?: Array<{ node: ShopifyProduct }>;
    } | ShopifyProduct[];
    discountNodes?: {
      edges?: Array<{ node: ShopifyDiscountNode }>;
    } | ShopifyDiscountNode[];
    webPixels?: {
      edges?: Array<{ node: ShopifyWebPixel }>;
    } | ShopifyWebPixel[];
    scriptTags?: {
      edges?: Array<{ node: ShopifyScriptTag }>;
    } | ShopifyScriptTag[];
    themeInlineScripts?: ShopifyThemeInlineScript[];
  };
  deliveryProfiles?: {
    edges?: Array<{ node: ShopifyDeliveryProfile }>;
  } | ShopifyDeliveryProfile[];
  markets?: {
    edges?: Array<{ node: ShopifyMarket }>;
  } | ShopifyMarket[];
  locations?: {
    edges?: Array<{ node: ShopifyLocation }>;
  } | ShopifyLocation[];
  products?: {
    edges?: Array<{ node: ShopifyProduct }>;
  } | ShopifyProduct[];
  discountNodes?: {
    edges?: Array<{ node: ShopifyDiscountNode }>;
  } | ShopifyDiscountNode[];
  webPixels?: {
    edges?: Array<{ node: ShopifyWebPixel }>;
  } | ShopifyWebPixel[];
  scriptTags?: {
    edges?: Array<{ node: ShopifyScriptTag }>;
  } | ShopifyScriptTag[];
  themeInlineScripts?: ShopifyThemeInlineScript[];
  [key: string]: unknown;
}

export type RemediationStatus = 'UNRESOLVED' | 'IN_PROGRESS' | 'RESOLVED';

export interface RemediationChange {
  findingId: string;
  findingTitle: string;
  severity: SeverityLevel;
  domain: AuditDomain;
  status: RemediationStatus;
  note?: string;
  updatedAt: string;
}

export interface AuditComparisonDiff {
  previousTimestamp?: string;
  previousRiskScore?: number;
  currentRiskScore: number;
  riskScoreDelta: number;
  resolvedFindingIds: string[];
  newFindingIds: string[];
  previousZeroDollarVulnerable?: boolean;
  currentZeroDollarVulnerable: boolean;
}

export interface IdentifiedIssueSummaryItem {
  id: string;
  title: string;
  severity: SeverityLevel;
  domain: AuditDomain;
  financialImpact: string;
  description: string;
  remediationStep?: string;
}

export interface RecapPayload {
  recipientEmail: string;
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
