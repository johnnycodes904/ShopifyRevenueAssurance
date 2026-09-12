import {
  ShopifyDiscountNode,
  WorstCaseMarginExposure,
  WorstCaseScenario,
} from '../types';

/**
 * Calculates worst-case combined margin exposure if auto-discounts and coupon codes can stack.
 */
export function calculateWorstCaseMarginExposure(
  discounts: ShopifyDiscountNode[]
): WorstCaseMarginExposure {
  const activeDiscounts = discounts.filter(
    (d) => d.discount?.status === 'ACTIVE'
  );

  let maxStackablePercentage = 0;
  let maxFixedDiscount = 0;
  let hasUnrestrictedStacking = false;
  let shippingSubsidyRisk = false;
  let zeroDollarCartVulnerable = false;

  let activeAutoDiscounts = 0;
  let activeCodeDiscounts = 0;

  interface ParsedDiscount {
    id: string;
    title: string;
    isAuto: boolean;
    type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
    category: 'PRODUCT' | 'ORDER' | 'SHIPPING';
    value: number; // percentage (e.g. 0.2) or fixed amount
    combinesWith: {
      orderDiscounts: boolean;
      productDiscounts: boolean;
      shippingDiscounts: boolean;
    };
    hasMinReq: boolean;
    minSubtotal: number;
    usageLimit: number | null;
  }

  const parsed: ParsedDiscount[] = [];

  for (const node of activeDiscounts) {
    const disc = node.discount;
    if (!disc) continue;

    const isAuto =
      disc.isAutomatic ??
      disc.__typename?.includes('Automatic') ??
      false;
    if (isAuto) activeAutoDiscounts++;
    else activeCodeDiscounts++;

    const combines = disc.combinesWith || {
      orderDiscounts: false,
      productDiscounts: false,
      shippingDiscounts: false,
    };

    const minSubtotal = Number(
      disc.minimumRequirement?.greaterThanOrEqualToSubtotal?.amount || 0
    );
    const hasMinReq =
      minSubtotal > 0 ||
      (disc.minimumRequirement?.greaterThanOrEqualToQuantity?.quantity ?? 0) > 0;

    let type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING' = 'PERCENTAGE';
    let category: 'PRODUCT' | 'ORDER' | 'SHIPPING' = 'PRODUCT';
    let val = 0;

    if (
      disc.__typename?.includes('FreeShipping') ||
      disc.title.toLowerCase().includes('free shipping')
    ) {
      type = 'FREE_SHIPPING';
      category = 'SHIPPING';
      val = 15; // standard benchmark merchant shipping cost absorbed
      if (combines.productDiscounts || combines.orderDiscounts) {
        shippingSubsidyRisk = true;
      }
    } else if (disc.customerGets?.value?.percentage !== undefined) {
      type = 'PERCENTAGE';
      val = Number(disc.customerGets.value.percentage);
      category = disc.__typename?.includes('Order') || disc.combinesWith?.productDiscounts ? 'ORDER' : 'PRODUCT';
    } else if (
      disc.customerGets?.value?.discountAmount?.amount !== undefined ||
      disc.customerGets?.value?.amount?.amount !== undefined
    ) {
      type = 'FIXED';
      val = Number(
        disc.customerGets.value.discountAmount?.amount ||
          disc.customerGets.value.amount?.amount ||
          0
      );
      category = disc.__typename?.includes('Order') ? 'ORDER' : 'PRODUCT';
    }

    parsed.push({
      id: node.id,
      title: disc.title,
      isAuto,
      type,
      category,
      value: val,
      combinesWith: combines,
      hasMinReq,
      minSubtotal,
      usageLimit: disc.usageLimit ?? null,
    });
  }

  // Check if combines allows product + order + shipping without min requirement
  for (const p of parsed) {
    if (
      p.combinesWith.productDiscounts &&
      p.combinesWith.orderDiscounts &&
      p.combinesWith.shippingDiscounts &&
      !p.hasMinReq
    ) {
      hasUnrestrictedStacking = true;
    }
  }

  // Find worst-case stackable discounts:
  // Shopify allows stacking when at least one discount enables combination with the other.
  // We identify:
  // 1. Automatic product / order discounts that combine
  // 2. Coupon codes that combine
  // 3. Free shipping promotions
  const benchmarkBaskets = [50, 100, 200, 500];
  const scenarios: WorstCaseScenario[] = [];

  for (const basket of benchmarkBaskets) {
    let applicableAutoDiscounts: ParsedDiscount[] = [];
    let applicableCodeDiscounts: ParsedDiscount[] = [];

    for (const d of parsed) {
      if (d.hasMinReq && basket < d.minSubtotal) continue;
      if (d.isAuto) {
        applicableAutoDiscounts.push(d);
      } else {
        applicableCodeDiscounts.push(d);
      }
    }

    // Evaluate stackable combos
    // Auto discounts apply automatically if eligible
    let currentSubtotal = basket;
    let productDiscountTotal = 0;
    let orderDiscountTotal = 0;
    let shippingDiscountTotal = 0;
    const appliedTitles: string[] = [];

    // Apply best auto discount(s) that allow combination
    for (const auto of applicableAutoDiscounts) {
      if (auto.type === 'PERCENTAGE') {
        const discAmt = currentSubtotal * auto.value;
        productDiscountTotal += discAmt;
        currentSubtotal = Math.max(0, currentSubtotal - discAmt);
        appliedTitles.push(`[Auto] ${auto.title} (-${Math.round(auto.value * 100)}%)`);
      } else if (auto.type === 'FIXED') {
        const discAmt = Math.min(currentSubtotal, auto.value);
        orderDiscountTotal += discAmt;
        currentSubtotal = Math.max(0, currentSubtotal - discAmt);
        appliedTitles.push(`[Auto] ${auto.title} (-$${auto.value})`);
      } else if (auto.type === 'FREE_SHIPPING') {
        shippingDiscountTotal += auto.value;
        appliedTitles.push(`[Auto] ${auto.title} (Free Shipping)`);
      }
    }

    // Now apply stackable coupon codes that can combine
    for (const code of applicableCodeDiscounts) {
      // Check if this code can stack with applied discounts
      const canStack =
        code.combinesWith.orderDiscounts ||
        code.combinesWith.productDiscounts ||
        appliedTitles.length === 0;

      if (canStack) {
        if (code.type === 'PERCENTAGE') {
          const discAmt = currentSubtotal * code.value;
          orderDiscountTotal += discAmt;
          currentSubtotal = Math.max(0, currentSubtotal - discAmt);
          appliedTitles.push(`[Code] ${code.title} (-${Math.round(code.value * 100)}%)`);
        } else if (code.type === 'FIXED') {
          const discAmt = Math.min(currentSubtotal, code.value);
          orderDiscountTotal += discAmt;
          currentSubtotal = Math.max(0, currentSubtotal - discAmt);
          appliedTitles.push(`[Code] ${code.title} (-$${code.value})`);
        } else if (code.type === 'FREE_SHIPPING' && shippingDiscountTotal === 0) {
          shippingDiscountTotal += code.value;
          appliedTitles.push(`[Code] ${code.title} (Free Shipping)`);
        }
      }
    }

    const netRevenue = Math.max(0, currentSubtotal);
    const totalDeduction = productDiscountTotal + orderDiscountTotal;
    const marginErosionPct = basket > 0 ? (totalDeduction / basket) * 100 : 0;
    const isZeroDollar = netRevenue <= 0.01;

    if (isZeroDollar) {
      zeroDollarCartVulnerable = true;
    }

    scenarios.push({
      basket_size: basket,
      applied_discounts: appliedTitles,
      gross_revenue: basket,
      product_discount_total: Math.round(productDiscountTotal * 100) / 100,
      order_discount_total: Math.round(orderDiscountTotal * 100) / 100,
      shipping_discount_total: Math.round(shippingDiscountTotal * 100) / 100,
      net_revenue: Math.round(netRevenue * 100) / 100,
      margin_erosion_pct: Math.min(100, Math.round(marginErosionPct * 10) / 10),
      merchant_absorbed_shipping: shippingDiscountTotal,
      is_zero_dollar_cart: isZeroDollar,
    });
  }

  // Determine maximum stackable % across all scenarios
  for (const s of scenarios) {
    if (s.margin_erosion_pct > maxStackablePercentage) {
      maxStackablePercentage = s.margin_erosion_pct;
    }
  }

  // Find max fixed discount
  for (const p of parsed) {
    if (p.type === 'FIXED' && p.value > maxFixedDiscount) {
      maxFixedDiscount = p.value;
    }
  }

  const summary = zeroDollarCartVulnerable
    ? `CRITICAL MARGIN BREACH: Simultaneous stacking between active automatic discounts and coupon codes reduces customer checkout total to $0.00 while forcing the merchant to absorb fulfillment shipping.`
    : maxStackablePercentage > 50
    ? `HIGH MARGIN LEAKAGE: Combined promotions allow compounding discount erosion up to ${maxStackablePercentage.toFixed(
        1
      )}% of order value without adequate minimum subtotal constraints.`
    : `Active promotions exhibit standard guardrails. Maximum simulated discount stacking tops out at ${maxStackablePercentage.toFixed(
        1
      )}%.`;

  return {
    max_stackable_discount_pct: Math.round(maxStackablePercentage * 10) / 10,
    max_fixed_discount_amount: maxFixedDiscount,
    has_unrestricted_stacking: hasUnrestrictedStacking,
    shipping_subsidy_risk: shippingSubsidyRisk,
    zero_dollar_cart_vulnerable: zeroDollarCartVulnerable,
    active_auto_discounts_count: activeAutoDiscounts,
    active_code_discounts_count: activeCodeDiscounts,
    worst_case_scenarios: scenarios,
    summary,
  };
}
