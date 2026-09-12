import {
  AuditFinding,
  AuditReport,
  ShopifyDeliveryProfile,
  ShopifyDiscountNode,
  ShopifyLocation,
  ShopifyMarket,
  ShopifyProduct,
  ShopifyRawPayload,
  ShopifyScriptTag,
  ShopifyWebPixel,
  ShopifyThemeInlineScript,
  ShopifyShippingZone,
} from '../types';
import { calculateWorstCaseMarginExposure } from './marginCalculator';

/**
 * Normalizes input JSON to handle both raw GraphQL response wrappers
 * (e.g. { data: { ... } }, { edges: [...] }) and direct arrays.
 */
function extractList<T>(raw: any): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (raw.edges && Array.isArray(raw.edges)) {
    return raw.edges.map((e: any) => (e.node ? e.node : e));
  }
  if (raw.nodes && Array.isArray(raw.nodes)) {
    return raw.nodes;
  }
  return [];
}

export function runShopifyRevenueAudit(input: ShopifyRawPayload): AuditReport {
  const findings: AuditFinding[] = [];
  const rootData = input.data || input;

  // Extract entities
  const deliveryProfiles: ShopifyDeliveryProfile[] = extractList<ShopifyDeliveryProfile>(
    rootData.deliveryProfiles || input.deliveryProfiles
  );
  const markets: ShopifyMarket[] = extractList<ShopifyMarket>(
    rootData.markets || input.markets
  );
  const locations: ShopifyLocation[] = extractList<ShopifyLocation>(
    rootData.locations || input.locations
  );
  const products: ShopifyProduct[] = extractList<ShopifyProduct>(
    rootData.products || input.products
  );
  const discountNodes: ShopifyDiscountNode[] = extractList<ShopifyDiscountNode>(
    rootData.discountNodes || input.discountNodes
  );
  const webPixels: ShopifyWebPixel[] = extractList<ShopifyWebPixel>(
    rootData.webPixels || input.webPixels
  );
  const scriptTags: ShopifyScriptTag[] = extractList<ShopifyScriptTag>(
    rootData.scriptTags || input.scriptTags
  );
  const themeInlineScripts: ShopifyThemeInlineScript[] =
    rootData.themeInlineScripts || input.themeInlineScripts || [];

  const storeName =
    rootData.shop?.name ||
    input.shop?.name ||
    'Shopify Merchant Store';
  const storeDomain =
    rootData.shop?.myshopifyDomain ||
    input.shop?.myshopifyDomain ||
    input.shop?.primaryDomain?.host ||
    'store.myshopify.com';

  let totalZonesEvaluated = 0;

  // =========================================================================
  // DOMAIN 1: DELIVERY & SHIPPING PROFILES
  // =========================================================================

  // Helper to extract zones from delivery profile
  function getProfileZones(profile: ShopifyDeliveryProfile): ShopifyShippingZone[] {
    const directZones = extractList<ShopifyShippingZone>(profile.shippingZones);
    if (directZones.length > 0) return directZones;

    const locGroups = profile.profileLocationGroups || profile.locationGroups || [];
    const allZones: ShopifyShippingZone[] = [];
    for (const group of locGroups) {
      const gZones = extractList<ShopifyShippingZone>(group.shippingZones || group.zones);
      allZones.push(...gZones);
    }
    return allZones;
  }

  // Set of all countries that have at least one active shipping rate in ANY profile
  const countriesWithShippingRates = new Set<string>();
  const activeFulfillmentLocationIds = new Set<string>();

  for (const profile of deliveryProfiles) {
    const zones = getProfileZones(profile);
    totalZonesEvaluated += zones.length;

    // Collect locations in this profile
    const locGroups = profile.profileLocationGroups || profile.locationGroups || [];
    for (const lg of locGroups) {
      const locList = extractList<any>(lg.locations);
      for (const loc of locList) {
        if (loc.id) activeFulfillmentLocationIds.add(loc.id);
      }
    }

    for (const zone of zones) {
      const zoneCountries = zone.countries || [];
      const rates = [
        ...(zone.rates || []),
        ...(zone.priceBasedRates || []),
        ...(zone.weightBasedRates || []),
      ];

      if (rates.length > 0) {
        for (const c of zoneCountries) {
          if (c.code) countriesWithShippingRates.add(c.code.toUpperCase());
        }
      }

      // 1.1 Check weight-based tier gaps
      const weightRates = (zone.weightBasedRates || []).filter(
        (r) => r.minOrderWeight || r.maxOrderWeight
      );
      if (weightRates.length > 0) {
        // Sort by minOrderWeight
        const sortedWeight = [...weightRates].sort((a, b) => {
          const aMin = a.minOrderWeight?.value ?? 0;
          const bMin = b.minOrderWeight?.value ?? 0;
          return aMin - bMin;
        });

        for (let i = 0; i < sortedWeight.length - 1; i++) {
          const current = sortedWeight[i];
          const next = sortedWeight[i + 1];

          const currentMax = current.maxOrderWeight?.value;
          const nextMin = next.minOrderWeight?.value;

          if (
            currentMax !== undefined &&
            nextMin !== undefined &&
            nextMin > currentMax
          ) {
            const gapDiff = Math.round((nextMin - currentMax) * 1000) / 1000;
            if (gapDiff > 0.001) {
              findings.push({
                id: `AUDIT-SHIP-WEIGHT-GAP-${zone.name.replace(/\s+/g, '-').toUpperCase()}-${i}`,
                domain: 'delivery_and_shipping',
                severity: 'CRITICAL',
                title: `Weight Tier Gap in Shipping Zone "${zone.name}"`,
                description: `A dead-zone gap of ${gapDiff} ${
                  current.maxOrderWeight?.unit || 'lb'
                } exists between tier "${current.name || 'Tier ' + (i + 1)}" (max: ${currentMax}) and "${
                  next.name || 'Tier ' + (i + 2)
                }" (min: ${nextMin}). Orders with cart weights falling in this interval will be blocked at checkout with a "Shipping not available" error.`,
                affected_nodes: [
                  {
                    id: profile.id,
                    type: 'DeliveryProfile',
                    name: profile.name,
                    field_path: `deliveryProfiles[id="${profile.id}"].zones[name="${zone.name}"].weightBasedRates`,
                    details: {
                      zoneName: zone.name,
                      currentTier: current,
                      nextTier: next,
                      gapRange: `${currentMax} to ${nextMin} ${current.maxOrderWeight?.unit || 'lb'}`,
                    },
                  },
                ],
                financial_impact: `Direct cart-level checkout dropoff. Any cart weighing between ${currentMax} and ${nextMin} ${
                  current.maxOrderWeight?.unit || 'lb'
                } fails address validation, resulting in 100% bounce rate at the shipping method step.`,
                remediation_steps: [
                  `Open Shopify Admin > Settings > Shipping and delivery.`,
                  `Select profile "${profile.name}" and locate zone "${zone.name}".`,
                  `Adjust "${current.name || 'Tier ' + (i + 1)}" max weight to ${nextMin}, or set "${
                    next.name || 'Tier ' + (i + 2)
                  }" min weight to ${currentMax} to eliminate the interval gap.`,
                ],
                graphql_mutation_snippet: `mutation updateWeightTierRate {\n  deliveryProfileUpdate(\n    id: "${profile.id}",\n    profile: {\n      // ensure continuous interval boundaries without gaps\n    }\n  ) {\n    userErrors { field message }\n  }\n}`,
                admin_navigation_path: `Settings > Shipping and delivery > ${profile.name} > ${zone.name}`,
              });
            }
          }
        }
      }

      // 1.2 Check price-based tier gaps & missing upper bounds
      const priceRates = (zone.priceBasedRates || []).filter(
        (r) => r.minOrderSubtotal || r.maxOrderSubtotal
      );
      if (priceRates.length > 0) {
        const sortedPrice = [...priceRates].sort((a, b) => {
          const aMin = Number(a.minOrderSubtotal?.amount ?? 0);
          const bMin = Number(b.minOrderSubtotal?.amount ?? 0);
          return aMin - bMin;
        });

        // Check for gaps between tiers
        for (let i = 0; i < sortedPrice.length - 1; i++) {
          const current = sortedPrice[i];
          const next = sortedPrice[i + 1];

          const currentMax = Number(current.maxOrderSubtotal?.amount ?? 0);
          const nextMin = Number(next.minOrderSubtotal?.amount ?? 0);

          if (currentMax > 0 && nextMin > currentMax) {
            const gapDiff = Math.round((nextMin - currentMax) * 100) / 100;
            if (gapDiff > 0.01) {
              findings.push({
                id: `AUDIT-SHIP-PRICE-GAP-${zone.name.replace(/\s+/g, '-').toUpperCase()}-${i}`,
                domain: 'delivery_and_shipping',
                severity: 'CRITICAL',
                title: `Price Tier Subtotal Gap in Shipping Zone "${zone.name}"`,
                description: `A price-based subtotal gap of $${gapDiff} exists between "${
                  current.name || 'Tier ' + (i + 1)
                }" (caps at $${currentMax}) and "${
                  next.name || 'Tier ' + (i + 2)
                }" (starts at $${nextMin}). Carts with order values between $${currentMax} and $${nextMin} have no eligible shipping rate.`,
                affected_nodes: [
                  {
                    id: profile.id,
                    type: 'DeliveryProfile',
                    name: profile.name,
                    field_path: `deliveryProfiles[id="${profile.id}"].zones[name="${zone.name}"].priceBasedRates`,
                    details: {
                      zoneName: zone.name,
                      currentTier: current,
                      nextTier: next,
                      gap: `$${currentMax} to $${nextMin}`,
                    },
                  },
                ],
                financial_impact: `Checkout failure for customers spending in the $${currentMax} to $${nextMin} range. Causes immediate purchase abandonment.`,
                remediation_steps: [
                  `Open Shopify Admin > Settings > Shipping and delivery.`,
                  `Edit profile "${profile.name}" > zone "${zone.name}".`,
                  `Update tier rates so that the lower tier threshold matches the upper tier start value (e.g. $${currentMax} and $${currentMax}).`,
                ],
                graphql_mutation_snippet: `mutation fixPriceTierGap {\n  deliveryProfileUpdate(\n    id: "${profile.id}",\n    profile: {\n      // Align priceBasedRates boundary conditions\n    }\n  ) {\n    userErrors { field message }\n  }\n}`,
                admin_navigation_path: `Settings > Shipping and delivery > ${profile.name} > ${zone.name}`,
              });
            }
          }
        }

        // Check for missing upper bound (e.g. tier caps at $100 with no tier for >$100)
        const highestTier = sortedPrice[sortedPrice.length - 1];
        if (
          highestTier.maxOrderSubtotal?.amount &&
          Number(highestTier.maxOrderSubtotal.amount) > 0
        ) {
          const capAmount = Number(highestTier.maxOrderSubtotal.amount);
          findings.push({
            id: `AUDIT-SHIP-UNBOUNDED-UPPER-${zone.name.replace(/\s+/g, '-').toUpperCase()}`,
            domain: 'delivery_and_shipping',
            severity: 'CRITICAL',
            title: `Missing High-Value Order Rate (Cart > $${capAmount}) in "${zone.name}"`,
            description: `The highest price-based shipping tier ("${
              highestTier.name || 'Standard'
            }") caps at $${capAmount}. Any high-AOV customer spending more than $${capAmount} will receive a dead-end checkout failure.`,
            affected_nodes: [
              {
                id: profile.id,
                type: 'DeliveryProfile',
                name: profile.name,
                field_path: `deliveryProfiles[id="${profile.id}"].zones[name="${zone.name}"].priceBasedRates[last]`,
                details: {
                  highestTier,
                  capAmount,
                },
              },
            ],
            financial_impact: `High-value revenue loss. Top-tier orders (>$${capAmount}) cannot complete checkout despite having the highest merchant margin potential.`,
            remediation_steps: [
              `Navigate to Shopify Admin > Settings > Shipping and delivery > ${profile.name}.`,
              `Add a rate for orders over $${capAmount} (e.g. "Free Shipping on orders over $${capAmount}" or standard fee with no maximum price).`,
            ],
            graphql_mutation_snippet: `mutation addUncappedRate {\n  deliveryProfileUpdate(\n    id: "${profile.id}",\n    profile: {\n      // Add priceBasedRate with minOrderSubtotal: { amount: "${capAmount}" } and maxOrderSubtotal: null\n    }\n  ) {\n    userErrors { field message }\n  }\n}`,
            admin_navigation_path: `Settings > Shipping and delivery > ${profile.name} > ${zone.name}`,
          });
        }
      }
    }
  }

  // 1.3 Identify countries/zones mapped in Markets that lack associated shipping rates
  for (const market of markets) {
    if (!market.enabled) continue;

    const regions = [
      ...extractList<any>(market.regions),
      ...(market.countries || []),
    ];

    const unmappedCountries: string[] = [];

    for (const region of regions) {
      const code = (region.code || region.name || '').toUpperCase();
      if (code && !countriesWithShippingRates.has(code)) {
        unmappedCountries.push(code);
      }
    }

    if (unmappedCountries.length > 0) {
      findings.push({
        id: `AUDIT-SHIP-MARKET-NO-RATES-${market.id.replace(/[^a-zA-Z0-9]/g, '')}`,
        domain: 'delivery_and_shipping',
        severity: 'CRITICAL',
        title: `Active Market "${market.name}" Has Countries Without Shipping Rates`,
        description: `Market "${market.name}" is enabled and accepting international localized traffic, but contains ${
          unmappedCountries.length
        } countries (${unmappedCountries.slice(0, 5).join(', ')}${
          unmappedCountries.length > 5 ? '...' : ''
        }) that have NO active shipping rates in any delivery profile.`,
        affected_nodes: [
          {
            id: market.id,
            type: 'Market',
            name: market.name,
            field_path: `markets[id="${market.id}"].regions`,
            details: {
              marketId: market.id,
              enabled: market.enabled,
              uncoveredCountryCodes: unmappedCountries,
            },
          },
        ],
        financial_impact: `Wasted international ad spend and 100% conversion failure. Shoppers targeted in these countries can browse localized currencies and prices, but are blocked at checkout with "This store cannot ship to your address".`,
        remediation_steps: [
          `Navigate to Shopify Admin > Settings > Markets.`,
          `Review market "${market.name}". Cross-reference with Settings > Shipping and delivery.`,
          `Create a Shipping Zone covering countries (${unmappedCountries.join(
            ', '
          )}) or remove unserviceable countries from the active market.`,
        ],
        graphql_mutation_snippet: `mutation addMissingShippingZone {\n  deliveryProfileUpdate(\n    id: "${deliveryProfiles[0]?.id || 'gid://shopify/DeliveryProfile/123'}",\n    profile: {\n      // add zone with countries: [${unmappedCountries.map((c) => `"${c}"`).join(', ')}]\n    }\n  ) {\n    userErrors { field message }\n  }\n}`,
        admin_navigation_path: `Settings > Markets > ${market.name} / Settings > Shipping and delivery`,
      });
    }
  }

  // 1.4 Flag products mapped to fulfillment locations that do not have active shipping services
  if (products.length > 0 && locations.length > 0) {
    const inactiveOrUnservicedLocIds = new Set<string>();

    for (const loc of locations) {
      const hasShippingGroup = activeFulfillmentLocationIds.has(loc.id);
      const isOnlineActive = loc.isActive && (loc.fulfillsOnlineOrders !== false);
      if (!isOnlineActive || !hasShippingGroup) {
        inactiveOrUnservicedLocIds.add(loc.id);
      }
    }

    const affectedProductTitles: string[] = [];
    const affectedNodeList: any[] = [];

    for (const prod of products) {
      const variants = extractList<any>(prod.variants);
      let prodAffected = false;

      for (const variant of variants) {
        const invLevels = extractList<any>(
          variant.inventoryItem?.inventoryLevels
        );
        for (const level of invLevels) {
          const locId = level.location?.id;
          if (locId && inactiveOrUnservicedLocIds.has(locId)) {
            prodAffected = true;
            affectedNodeList.push({
              id: prod.id,
              type: 'Product',
              name: prod.title,
              field_path: `products[id="${prod.id}"].variants[id="${variant.id}"].inventoryItem`,
              details: {
                locationId: locId,
                locationName: level.location?.name,
              },
            });
            break;
          }
        }
        if (prodAffected) break;
      }

      if (prodAffected) {
        affectedProductTitles.push(prod.title);
      }
    }

    if (affectedProductTitles.length > 0) {
      findings.push({
        id: `AUDIT-SHIP-UNSERVICED-LOCATION-PRODUCTS`,
        domain: 'delivery_and_shipping',
        severity: 'CRITICAL',
        title: `${affectedProductTitles.length} Products Stocked at Locations Without Active Shipping Rates`,
        description: `Found ${
          affectedProductTitles.length
        } active products (e.g. ${affectedProductTitles.slice(0, 3).join(', ')}${
          affectedProductTitles.length > 3 ? '...' : ''
        }) with inventory assigned to locations that are either inactive or omitted from delivery profile shipping zones.`,
        affected_nodes: affectedNodeList.slice(0, 5),
        financial_impact: `Fulfillment deadlock and checkout rejection when orders route inventory from these locations. Customers experience unexpected "Items cannot be shipped to this address" errors.`,
        remediation_steps: [
          `Navigate to Shopify Admin > Settings > Locations. Verify location active status.`,
          `Navigate to Settings > Shipping and delivery > General shipping rates.`,
          `Ensure all stocking fulfillment locations are added under "Shipping from" with active shipping rates.`,
        ],
        graphql_mutation_snippet: `mutation linkLocationToDeliveryProfile {\n  deliveryProfileUpdate(\n    id: "${deliveryProfiles[0]?.id || 'gid://shopify/DeliveryProfile/123'}",\n    profile: {\n      // add location to profileLocationGroups with zone rates\n    }\n  ) {\n    userErrors { field message }\n  }\n}`,
        admin_navigation_path: `Settings > Shipping and delivery > Shipping from`,
      });
    }
  }

  // =========================================================================
  // DOMAIN 2: DISCOUNTS & PROMOTION STACKING
  // =========================================================================

  const marginExposure = calculateWorstCaseMarginExposure(discountNodes);

  for (const node of discountNodes) {
    const disc = node.discount;
    if (!disc || disc.status !== 'ACTIVE') continue;

    const combines = disc.combinesWith || {
      orderDiscounts: false,
      productDiscounts: false,
      shippingDiscounts: false,
    };

    const minSubtotal = Number(
      disc.minimumRequirement?.greaterThanOrEqualToSubtotal?.amount || 0
    );
    const minQty = Number(
      disc.minimumRequirement?.greaterThanOrEqualToQuantity?.quantity || 0
    );
    const hasMinimumReq = minSubtotal > 0 || minQty > 0;

    // 2.1 Active discount allows stacking across product, order, and shipping categories without min requirement
    if (
      combines.productDiscounts &&
      combines.orderDiscounts &&
      combines.shippingDiscounts &&
      !hasMinimumReq
    ) {
      findings.push({
        id: `AUDIT-DISC-UNRESTRICTED-STACKING-${node.id.replace(/[^a-zA-Z0-9]/g, '')}`,
        domain: 'discounts_and_promotions',
        severity: 'CRITICAL',
        title: `Unrestricted Multi-Category Discount Stacking on "${disc.title}"`,
        description: `Active discount node "${disc.title}" has \`combinesWith\` enabled across all three categories (Product, Order, and Shipping) with NO minimum subtotal or quantity threshold (\`minimumRequirement\` is missing or 0). Shoppers can stack this with automatic sales, coupon codes, and free shipping on arbitrarily small order amounts.`,
        affected_nodes: [
          {
            id: node.id,
            type: disc.__typename || 'DiscountNode',
            name: disc.title,
            field_path: `discountNodes[id="${node.id}"].discount.combinesWith`,
            details: {
              combinesWith: combines,
              minimumRequirement: disc.minimumRequirement,
              usageLimit: disc.usageLimit,
            },
          },
        ],
        financial_impact: `Severe margin erosion or $0 order exploits. Combined auto and coupon stacks can exceed 100% discount, forcing the merchant to ship goods for free at negative profit.`,
        remediation_steps: [
          `Navigate to Shopify Admin > Discounts > "${disc.title}".`,
          `Under "Combinations", disable stacking with Order or Product discounts, OR`,
          `Add a strict "Minimum purchase requirement" (e.g. minimum purchase amount of $75.00) to safeguard unit economics.`,
        ],
        graphql_mutation_snippet: `mutation restrictDiscountStacking {\n  discountCodeBasicUpdate(\n    id: "${node.id}",\n    basicCodeDiscount: {\n      combinesWith: {\n        orderDiscounts: false,\n        productDiscounts: false,\n        shippingDiscounts: true\n      },\n      minimumRequirement: {\n        subtotal: { greaterThanOrEqualToSubtotal: "75.00" }\n      }\n    }\n  ) {\n    userErrors { field message }\n  }\n}`,
        admin_navigation_path: `Shopify Admin > Discounts > ${disc.title} > Combinations`,
      });
    }

    // 2.2 High percentage (>30%) or high fixed value discounts lacking usage limits
    const pct = Number(disc.customerGets?.value?.percentage ?? 0);
    const fixedAmt = Number(
      disc.customerGets?.value?.discountAmount?.amount ??
        disc.customerGets?.value?.amount?.amount ??
        0
    );

    const isHighPercentage = pct > 0.30;
    const isHighFixed = fixedAmt >= 50;
    const lacksUsageLimit =
      (disc.usageLimit === null || disc.usageLimit === undefined) &&
      !disc.appliesOncePerCustomer;

    if ((isHighPercentage || isHighFixed) && lacksUsageLimit) {
      const discountLabel = isHighPercentage
        ? `${Math.round(pct * 100)}% off`
        : `$${fixedAmt} off`;

      findings.push({
        id: `AUDIT-DISC-UNCAPPED-EXPOSURE-${node.id.replace(/[^a-zA-Z0-9]/g, '')}`,
        domain: 'discounts_and_promotions',
        severity: 'HIGH',
        title: `High-Value Discount (${discountLabel}) Has No Usage Limits`,
        description: `Active promotion "${disc.title}" offers a substantial value reduction of ${discountLabel} but lacks a total usage cap (\`usageLimit\` is null) and is not restricted to one use per customer (\`appliesOncePerCustomer\` is false).`,
        affected_nodes: [
          {
            id: node.id,
            type: disc.__typename || 'DiscountNode',
            name: disc.title,
            field_path: `discountNodes[id="${node.id}"].discount.usageLimit`,
            details: {
              discountValue: discountLabel,
              usageLimit: disc.usageLimit,
              appliesOncePerCustomer: disc.appliesOncePerCustomer,
            },
          },
        ],
        financial_impact: `Runaway viral coupon leakage. If scraped by browser discount extensions (Honey, Capital One Shopping) or posted to deal forums, uncapped high-value discounts lead to rapid inventory exhaustion at near-zero gross margin.`,
        remediation_steps: [
          `Navigate to Shopify Admin > Discounts > "${disc.title}".`,
          `Under "Usage limits", check "Limit to one use per customer" AND/OR set a maximum "Limit number of times this discount can be used in total".`,
        ],
        graphql_mutation_snippet: `mutation enforceDiscountCap {\n  discountCodeBasicUpdate(\n    id: "${node.id}",\n    basicCodeDiscount: {\n      usageLimit: 500,\n      appliesOncePerCustomer: true\n    }\n  ) {\n    userErrors { field message }\n  }\n}`,
        admin_navigation_path: `Shopify Admin > Discounts > ${disc.title} > Usage limits`,
      });
    }
  }

  // 2.3 Worst-case combined margin exposure report finding if risk detected
  if (marginExposure.worst_case_scenarios.some((s) => s.is_zero_dollar_cart)) {
    findings.push({
      id: `AUDIT-DISC-WORST-CASE-ZERO-DOLLAR`,
      domain: 'discounts_and_promotions',
      severity: 'CRITICAL',
      title: `Zero-Dollar ($0.00) Order Exploit Discovered via Stacking Combinations`,
      description: marginExposure.summary,
      affected_nodes: [
        {
          type: 'DiscountStackingMatrix',
          name: 'Combinations Simulation',
          details: {
            scenarios: marginExposure.worst_case_scenarios,
            maxStackableDiscountPct: marginExposure.max_stackable_discount_pct,
          },
        },
      ],
      financial_impact: `Direct loss of physical inventory and unrecovered shipping carrier expense. Fraudulent or opportunistic checkout baskets can drain stock without generating merchant cash flow.`,
      remediation_steps: [
        `Audit all active automatic discounts against stackable discount codes.`,
        `Enforce mutual exclusivity: Ensure automatic promotional offers do NOT combine with coupon codes.`,
        `Set cart subtotal floors for all percentage codes above 20%.`,
      ],
      graphql_mutation_snippet: `# Mutation to disable auto-discount combination\nmutation deactivateStacking {\n  discountAutomaticBasicUpdate(\n    id: "gid://shopify/DiscountAutomaticBasic/...",\n    automaticBasicDiscount: {\n      combinesWith: {\n        orderDiscounts: false,\n        productDiscounts: false,\n        shippingDiscounts: false\n      }\n    }\n  ) {\n    userErrors { field message }\n  }\n}`,
      admin_navigation_path: `Shopify Admin > Discounts > Automatic Discounts`,
    });
  } else if (marginExposure.max_stackable_discount_pct > 50) {
    findings.push({
      id: `AUDIT-DISC-HIGH-COMBINED-EROSION`,
      domain: 'discounts_and_promotions',
      severity: 'HIGH',
      title: `Worst-Case Stackable Margin Erosion Reaches ${marginExposure.max_stackable_discount_pct.toFixed(
        1
      )}%`,
      description: `Mathematical analysis of active automatic and code discounts reveals that customers can combine multiple discounts to erode up to ${marginExposure.max_stackable_discount_pct.toFixed(
        1
      )}% of gross order value across standard basket sizes.`,
      affected_nodes: [
        {
          type: 'DiscountStackingMatrix',
          name: 'Margin Simulation Engine',
          details: marginExposure.worst_case_scenarios,
        },
      ],
      financial_impact: `Margin destruction across promotional campaigns. Blended contribution margin turns negative after accounting for cost of goods sold (COGS), payment processing fees (2.9%), and carrier shipping costs.`,
      remediation_steps: [
        `Navigate to Shopify Admin > Discounts.`,
        `Restrict "combinesWith" parameters on sitewide automatic discounts so they cannot combine with influencer or affiliate promo codes.`,
      ],
      admin_navigation_path: `Shopify Admin > Discounts > Automatic Discounts`,
    });
  }

  // =========================================================================
  // DOMAIN 3: TRACKING & SCRIPT BLOAT
  // =========================================================================

  // Known deprecated or problematic third-party CDN patterns
  const deprecatedCdnPatterns = [
    {
      regex: /cdn\.privy\.com\/legacy/i,
      name: 'Privy Legacy Script',
      vendor: 'Privy',
    },
    {
      regex: /yotpo.*deprecated|staticw2\.yotpo\.com\/[a-zA-Z0-9_-]+\/bad/i,
      name: 'Deprecated Yotpo Widget',
      vendor: 'Yotpo',
    },
    {
      regex: /cloudfront\.net\/(uninstalled|dead|legacy-app)/i,
      name: 'Orphaned App ScriptTag',
      vendor: 'Uninstalled Shopify App',
    },
    {
      regex: /static\.hotjar\.com\/c\/hotjar-deprecated/i,
      name: 'Defunct Hotjar Snippet',
      vendor: 'Hotjar',
    },
    {
      regex: /ajax\.googleapis\.com\/ajax\/libs\/jquery\/1\./i,
      name: 'Obsolete jQuery v1.x Injection',
      vendor: 'Legacy Theme Script',
    },
    {
      regex: /cdn\.justuno\.com\/legacy/i,
      name: 'Deprecated JustUno Tag',
      vendor: 'JustUno',
    },
    {
      regex: /boldapps\.net\/.*\/v1/i,
      name: 'Legacy Bold Apps CDN (V1 API)',
      vendor: 'Bold Commerce',
    },
  ];

  // 3.1 Duplicate Tracking Pixels (Web Pixels vs. inline / script tags)
  // Check active Web Pixels
  const activeWebPixels = webPixels.filter((wp) => wp.status !== 'INACTIVE');

  // Parse pixel targets/IDs
  const webPixelSignatures: Array<{
    id: string;
    type: string;
    accountID?: string;
    events: string[];
  }> = [];

  for (const wp of activeWebPixels) {
    const rawSettings =
      typeof wp.settings === 'string'
        ? (() => {
            try {
              return JSON.parse(wp.settings);
            } catch {
              return {};
            }
          })()
        : wp.settings || {};

    const accountId =
      wp.accountID ||
      wp.pixelId ||
      rawSettings.pixelId ||
      rawSettings.accountId ||
      rawSettings.gtmId ||
      rawSettings.measurementId;

    const target = (wp.target || '').toLowerCase();
    let pixelType = 'CUSTOM';
    if (target.includes('meta') || target.includes('facebook') || accountId?.startsWith('1') || accountId?.startsWith('2')) {
      pixelType = 'META_PIXEL';
    } else if (target.includes('ga4') || target.includes('google') || accountId?.startsWith('G-')) {
      pixelType = 'GA4';
    } else if (target.includes('tiktok') || accountId?.startsWith('C')) {
      pixelType = 'TIKTOK';
    }

    webPixelSignatures.push({
      id: wp.id,
      type: pixelType,
      accountID: accountId,
      events: ['purchase', 'begin_checkout', 'add_to_cart', 'page_view'],
    });
  }

  // Scan inline theme scripts & script tags for duplicate pixel events
  const inlineDetections: Array<{
    source: string;
    type: string;
    event: string;
    snippet: string;
  }> = [];

  for (const inline of themeInlineScripts) {
    const content = inline.content || '';
    if (/fbq\(['"]track['"],\s*['"]Purchase['"]\)/i.test(content)) {
      inlineDetections.push({
        source: inline.file || inline.name || 'theme.liquid',
        type: 'META_PIXEL',
        event: 'purchase',
        snippet: content.slice(0, 150),
      });
    }
    if (/fbq\(['"]track['"],\s*['"]InitiateCheckout['"]\)/i.test(content)) {
      inlineDetections.push({
        source: inline.file || inline.name || 'theme.liquid',
        type: 'META_PIXEL',
        event: 'begin_checkout',
        snippet: content.slice(0, 150),
      });
    }
    if (/gtag\(['"]event['"],\s*['"]purchase['"]/i.test(content)) {
      inlineDetections.push({
        source: inline.file || inline.name || 'theme.liquid',
        type: 'GA4',
        event: 'purchase',
        snippet: content.slice(0, 150),
      });
    }
    if (/gtag\(['"]event['"],\s*['"]begin_checkout['"]/i.test(content)) {
      inlineDetections.push({
        source: inline.file || inline.name || 'theme.liquid',
        type: 'GA4',
        event: 'begin_checkout',
        snippet: content.slice(0, 150),
      });
    }
  }

  // Check script tags for duplicate inline pixels
  for (const st of scriptTags) {
    const src = st.src || '';
    if (src.includes('connect.facebook.net') || src.includes('fbevents.js')) {
      inlineDetections.push({
        source: `ScriptTag[${st.id}]`,
        type: 'META_PIXEL',
        event: 'purchase',
        snippet: `<script src="${src}">`,
      });
    }
    if (src.includes('googletagmanager.com/gtag/js') || src.includes('google-analytics.com')) {
      inlineDetections.push({
        source: `ScriptTag[${st.id}]`,
        type: 'GA4',
        event: 'purchase',
        snippet: `<script src="${src}">`,
      });
    }
  }

  // Correlate Web Pixel vs. Inline detections
  for (const wp of webPixelSignatures) {
    const matches = inlineDetections.filter((d) => d.type === wp.type);
    if (matches.length > 0) {
      const distinctEvents = Array.from(new Set(matches.map((m) => m.event)));
      const platformName = wp.type === 'META_PIXEL' ? 'Meta Pixel' : wp.type === 'GA4' ? 'Google Analytics 4' : wp.type;

      findings.push({
        id: `AUDIT-TRACK-DUPLICATE-PIXEL-${wp.type}`,
        domain: 'tracking_and_scripts',
        severity: 'HIGH',
        title: `Duplicate ${platformName} Tracking Collision (Web Pixel + Inline Theme Script)`,
        description: `Both a modern Shopify Customer Events Web Pixel extension (ID: ${
          wp.id
        }) and legacy theme scripts/tags (${matches
          .map((m) => m.source)
          .join(', ')}) are firing identical conversion events (${distinctEvents.join(
          ', '
        )}).`,
        affected_nodes: [
          {
            id: wp.id,
            type: 'WebPixel',
            name: `${platformName} Extension`,
            field_path: `webPixels[id="${wp.id}"]`,
            details: {
              webPixelId: wp.id,
              accountId: wp.accountID,
              collidingSources: matches,
            },
          },
        ],
        financial_impact: `Severe ad attribution distortion. Double-counting purchase events in Meta Ads Manager / Google Ads inflates reported ROAS by up to 200%. This tricks automated bidding algorithms into over-allocating ad spend on non-incremented conversions.`,
        remediation_steps: [
          `Navigate to Shopify Admin > Online Store > Themes > Edit code.`,
          `Inspect ${matches.map((m) => m.source).join(', ')} and remove hardcoded ${platformName} snippet blocks and event handlers.`,
          `Keep the single authoritative Shopify Customer Events Web Pixel under Settings > Customer events.`,
        ],
        graphql_mutation_snippet: `# Mutation to verify and query Web Pixel health\nquery verifyWebPixel {\n  webPixel(id: "${wp.id}") {\n    id\n    status\n    settings\n  }\n}`,
        admin_navigation_path: `Settings > Customer events / Online Store > Themes > Edit code`,
      });
    }
  }

  // 3.2 Flag external script tags loaded from deprecated or uninstalled third-party app CDNs
  for (const st of scriptTags) {
    const src = st.src || '';
    for (const pattern of deprecatedCdnPatterns) {
      if (pattern.regex.test(src)) {
        findings.push({
          id: `AUDIT-TRACK-DEPRECATED-CDN-${st.id.replace(/[^a-zA-Z0-9]/g, '')}`,
          domain: 'tracking_and_scripts',
          severity: 'MEDIUM',
          title: `Deprecated / Uninstalled App Script Tag Detected: ${pattern.name}`,
          description: `ScriptTag ID ${st.id} loads remote JavaScript from a deprecated or uninstalled third-party vendor CDN ("${src}"). The originating app is no longer active, but this orphaned script continues to execute on store page loads.`,
          affected_nodes: [
            {
              id: st.id,
              type: 'ScriptTag',
              name: pattern.name,
              field_path: `scriptTags[id="${st.id}"].src`,
              details: {
                scriptTagId: st.id,
                src,
                event: st.event,
                displayScope: st.displayScope,
                vendor: pattern.vendor,
              },
            },
          ],
          financial_impact: `Site speed degradation and supply chain risk. Orphaned scripts block the DOM parsing thread, increasing Largest Contentful Paint (LCP) by 400-900ms, hurting mobile conversion rate and SEO core web vitals.`,
          remediation_steps: [
            `Delete the orphaned ScriptTag using Shopify Admin REST or GraphQL mutation.`,
            `Alternatively, check third-party app integrations in Shopify Admin > Apps and sales channels to purge lingering assets.`,
          ],
          graphql_mutation_snippet: `mutation deleteOrphanedScriptTag {\n  scriptTagDelete(id: "${st.id}") {\n    deletedScriptTagId\n    userErrors {\n      field\n      message\n    }\n  }\n}`,
          admin_navigation_path: `Shopify GraphiQL / Shopify Admin > Apps`,
        });
        break;
      }
    }
  }

  // Also check if any script tag uses deprecated 'ALL' scope with high latency
  for (const st of scriptTags) {
    if (
      st.displayScope === 'ALL' &&
      !findings.some((f) => f.affected_nodes.some((n) => n.id === st.id))
    ) {
      // Flag as low informational cleanup if non-modern script tag is in play
      findings.push({
        id: `AUDIT-TRACK-LEGACY-SCRIPTAG-API-${st.id.replace(/[^a-zA-Z0-9]/g, '')}`,
        domain: 'tracking_and_scripts',
        severity: 'LOW',
        title: `Legacy ScriptTag API Usage (${st.src.split('?')[0].split('/').pop() || 'script'})`,
        description: `Store utilizes legacy Shopify ScriptTag API (ID: ${st.id}) instead of modern Theme App Extensions or Web Pixels. Shopify has deprecated ScriptTags in checkout and strongly recommends Theme App Blocks.`,
        affected_nodes: [
          {
            id: st.id,
            type: 'ScriptTag',
            field_path: `scriptTags[id="${st.id}"]`,
            details: { src: st.src, displayScope: st.displayScope },
          },
        ],
        financial_impact: `Technical debt and checkout incompatibility. Legacy ScriptTags do not render in modern Shopify Checkout Extensibility.`,
        remediation_steps: [
          `Migrate script functionality to a Shopify Theme App Extension or Checkout UI Extension.`,
        ],
        graphql_mutation_snippet: `mutation deleteLegacyScriptTag {\n  scriptTagDelete(id: "${st.id}") {\n    deletedScriptTagId\n  }\n}`,
        admin_navigation_path: `Shopify Admin > Apps`,
      });
    }
  }

  // Calculate risk score (0 - 100)
  const severityCount = {
    CRITICAL: findings.filter((f) => f.severity === 'CRITICAL').length,
    HIGH: findings.filter((f) => f.severity === 'HIGH').length,
    MEDIUM: findings.filter((f) => f.severity === 'MEDIUM').length,
    LOW: findings.filter((f) => f.severity === 'LOW').length,
  };

  const domainCount = {
    delivery_and_shipping: findings.filter(
      (f) => f.domain === 'delivery_and_shipping'
    ).length,
    discounts_and_promotions: findings.filter(
      (f) => f.domain === 'discounts_and_promotions'
    ).length,
    tracking_and_scripts: findings.filter(
      (f) => f.domain === 'tracking_and_scripts'
    ).length,
  };

  // Weighted formula
  let rawRisk =
    severityCount.CRITICAL * 35 +
    severityCount.HIGH * 18 +
    severityCount.MEDIUM * 8 +
    severityCount.LOW * 2;

  const riskScore = Math.min(100, Math.max(0, rawRisk));

  const overallHealthStatus: 'CRITICAL_RISK' | 'HIGH_RISK' | 'ELEVATED' | 'HEALTHY' =
    severityCount.CRITICAL > 0 || riskScore >= 75
      ? 'CRITICAL_RISK'
      : severityCount.HIGH > 0 || riskScore >= 50
      ? 'HIGH_RISK'
      : severityCount.MEDIUM > 0 || riskScore >= 25
      ? 'ELEVATED'
      : 'HEALTHY';

  return {
    audit_metadata: {
      store_name: storeName,
      store_domain: storeDomain,
      audit_timestamp: new Date().toISOString(),
      auditor_identity: 'Senior Shopify Architect & Revenue Assurance Auditor v2.4',
      total_findings: findings.length,
      risk_score: riskScore,
      overall_health_status: overallHealthStatus,
      severity_breakdown: severityCount,
      domain_breakdown: domainCount,
    },
    worst_case_margin_exposure: marginExposure,
    findings,
    inspected_nodes_summary: {
      delivery_profiles_count: deliveryProfiles.length,
      shipping_zones_count: totalZonesEvaluated,
      markets_count: markets.length,
      locations_count: locations.length,
      products_evaluated_count: products.length,
      discount_nodes_count: discountNodes.length,
      web_pixels_count: webPixels.length,
      script_tags_count: scriptTags.length,
      inline_theme_scripts_count: themeInlineScripts.length,
    },
  };
}
