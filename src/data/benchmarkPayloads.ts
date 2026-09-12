import { ShopifyRawPayload } from '../types';

export interface BenchmarkCase {
  id: string;
  name: string;
  badge: string;
  description: string;
  expectedIssues: string;
  payload: ShopifyRawPayload;
}

export const BENCHMARK_CASES: BenchmarkCase[] = [
  {
    id: 'enterprise-multi-domain-audit',
    name: 'Enterprise Apparel (Critical Stacking & Shipping Gaps)',
    badge: 'Multi-Domain Risks',
    description:
      'A high-volume lifestyle brand experiencing cart abandonment, negative margin coupon spikes, and ad attribution skew.',
    expectedIssues:
      'Weight gap (5.0lb - 5.1lb), price tier cap ($150), unmapped EU market countries, unrestricted 3-way discount stacking ($0 cart risk), uncapped 40% VIP code, Meta/GA4 pixel collision, and deprecated Privy CDN script.',
    payload: {
      shop: {
        name: 'Apex Apparel & Gear Co.',
        myshopifyDomain: 'apex-apparel-production.myshopify.com',
      },
      deliveryProfiles: [
        {
          id: 'gid://shopify/DeliveryProfile/882736192',
          name: 'General Shipping Profile',
          default: true,
          profileLocationGroups: [
            {
              id: 'gid://shopify/LocationGroup/101',
              locations: [
                {
                  id: 'gid://shopify/Location/901',
                  name: 'Salt Lake City Primary DC',
                  isActive: true,
                  fulfillsOnlineOrders: true,
                },
                {
                  id: 'gid://shopify/Location/902',
                  name: 'Reno Overflow Warehouse',
                  isActive: true,
                  fulfillsOnlineOrders: true,
                },
              ],
              shippingZones: [
                {
                  id: 'gid://shopify/ShippingZone/4401',
                  name: 'Domestic US (Lower 48)',
                  countries: [{ code: 'US', name: 'United States' }],
                  weightBasedRates: [
                    {
                      id: 'gid://shopify/DeliveryWeightBasedRate/1',
                      name: 'Standard Lightweight Ground',
                      price: { amount: '4.95', currencyCode: 'USD' },
                      minOrderWeight: { value: 0, unit: 'POUNDS' },
                      maxOrderWeight: { value: 5.0, unit: 'POUNDS' },
                    },
                    {
                      id: 'gid://shopify/DeliveryWeightBasedRate/2',
                      name: 'Heavy Freight Courier',
                      price: { amount: '14.50', currencyCode: 'USD' },
                      minOrderWeight: { value: 5.1, unit: 'POUNDS' }, // GAP: 5.0 to 5.1 lbs
                      maxOrderWeight: { value: 30.0, unit: 'POUNDS' },
                    },
                  ],
                  priceBasedRates: [
                    {
                      id: 'gid://shopify/DeliveryPriceBasedRate/1',
                      name: 'Economy Tier 1',
                      price: { amount: '7.99', currencyCode: 'USD' },
                      minOrderSubtotal: { amount: '0.00' },
                      maxOrderSubtotal: { amount: '75.00' },
                    },
                    {
                      id: 'gid://shopify/DeliveryPriceBasedRate/2',
                      name: 'Free Shipping Threshold',
                      price: { amount: '0.00', currencyCode: 'USD' },
                      minOrderSubtotal: { amount: '75.00' },
                      maxOrderSubtotal: { amount: '150.00' }, // GAP: High value orders > $150 have NO matching tier!
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      markets: [
        {
          id: 'gid://shopify/Market/771',
          name: 'North America Primary',
          enabled: true,
          regions: [{ name: 'United States', code: 'US' }],
        },
        {
          id: 'gid://shopify/Market/772',
          name: 'European Union Expansion',
          enabled: true,
          regions: [
            { name: 'Germany', code: 'DE' },
            { name: 'France', code: 'FR' },
            { name: 'Netherlands', code: 'NL' },
          ], // Unmapped: NO shipping rates exist for DE, FR, NL in delivery profiles!
        },
        {
          id: 'gid://shopify/Market/773',
          name: 'United Kingdom',
          enabled: true,
          regions: [{ name: 'United Kingdom', code: 'GB' }], // Unmapped: NO rates!
        },
      ],
      locations: [
        {
          id: 'gid://shopify/Location/901',
          name: 'Salt Lake City Primary DC',
          isActive: true,
          fulfillsOnlineOrders: true,
        },
        {
          id: 'gid://shopify/Location/902',
          name: 'Reno Overflow Warehouse',
          isActive: true,
          fulfillsOnlineOrders: true,
        },
        {
          id: 'gid://shopify/Location/903',
          name: 'Austin Retail Pop-Up',
          isActive: false, // Inactive and has no shipping service!
          fulfillsOnlineOrders: false,
        },
      ],
      products: [
        {
          id: 'gid://shopify/Product/10001',
          title: 'Alpine Technical Shell Jacket',
          variants: [
            {
              id: 'gid://shopify/ProductVariant/20001',
              title: 'Black / L',
              inventoryItem: {
                inventoryLevels: {
                  edges: [
                    {
                      node: {
                        location: {
                          id: 'gid://shopify/Location/903',
                          name: 'Austin Retail Pop-Up',
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
      discountNodes: [
        {
          id: 'gid://shopify/DiscountNode/3001',
          discount: {
            __typename: 'DiscountAutomaticBasic',
            title: '20% Off Sitewide Labor Day Blitz',
            status: 'ACTIVE',
            isAutomatic: true,
            combinesWith: {
              productDiscounts: true,
              orderDiscounts: true,
              shippingDiscounts: true, // UNRESTRICTED STACKING across all 3!
            },
            customerGets: {
              value: {
                percentage: 0.2,
              },
            },
            minimumRequirement: null, // NO minimum threshold!
          },
        },
        {
          id: 'gid://shopify/DiscountNode/3002',
          discount: {
            __typename: 'DiscountCodeBasic',
            title: 'VIPSECRET40',
            status: 'ACTIVE',
            isAutomatic: false,
            usageLimit: null, // UNCAPPED!
            appliesOncePerCustomer: false,
            combinesWith: {
              productDiscounts: true,
              orderDiscounts: true,
              shippingDiscounts: true,
            },
            customerGets: {
              value: {
                percentage: 0.4, // >30% high value!
              },
            },
            minimumRequirement: null,
          },
        },
        {
          id: 'gid://shopify/DiscountNode/3003',
          discount: {
            __typename: 'DiscountCodeBasic',
            title: 'WELCOME75OFF',
            status: 'ACTIVE',
            isAutomatic: false,
            usageLimit: null, // UNCAPPED $75 fixed discount!
            appliesOncePerCustomer: false,
            combinesWith: {
              productDiscounts: true,
              orderDiscounts: true,
              shippingDiscounts: true,
            },
            customerGets: {
              value: {
                discountAmount: {
                  amount: '75.00',
                  currencyCode: 'USD',
                },
              },
            },
            minimumRequirement: null, // Can drive $50 cart into $0.00!
          },
        },
      ],
      webPixels: [
        {
          id: 'gid://shopify/WebPixel/5501',
          status: 'ACTIVE',
          accountID: '298810293812039',
          target: 'meta-pixel',
          settings: JSON.stringify({
            pixelId: '298810293812039',
            autoConfig: true,
          }),
        },
        {
          id: 'gid://shopify/WebPixel/5502',
          status: 'ACTIVE',
          accountID: 'G-77XK9921',
          target: 'ga4-google-analytics',
          settings: JSON.stringify({
            measurementId: 'G-77XK9921',
          }),
        },
      ],
      scriptTags: [
        {
          id: 'gid://shopify/ScriptTag/9901',
          src: 'https://cdn.privy.com/legacy/widget-v1.js',
          event: 'onload',
          displayScope: 'ALL',
        },
        {
          id: 'gid://shopify/ScriptTag/9902',
          src: 'https://connect.facebook.net/en_US/fbevents.js', // Legacy duplicate Meta Pixel!
          event: 'onload',
          displayScope: 'ALL',
        },
      ],
      themeInlineScripts: [
        {
          file: 'snippets/meta-tracking.liquid',
          name: 'Meta Pixel Inline Snippet',
          content: `
<!-- Legacy Inline Pixel -->
fbq('init', '298810293812039');
fbq('track', 'PageView');
fbq('track', 'Purchase', { value: {{ total_price | money_without_currency }}, currency: 'USD' });
          `,
        },
        {
          file: 'layout/theme.liquid',
          name: 'GA4 Inline Tag',
          content: `
<!-- Hardcoded Google Tag -->
gtag('event', 'purchase', { transaction_id: '{{ order.id }}', value: {{ order.total_net_amount }} });
gtag('event', 'begin_checkout', { items: [] });
          `,
        },
      ],
    },
  },
  {
    id: 'shipping-tier-gaps-and-dead-end-markets',
    name: 'Shipping Breakdown (Weight Gap & Missing International Rates)',
    badge: 'Checkout Blockers',
    description:
      'A store experiencing acute shipping method drop-offs due to interval gaps between tiers and active international markets missing shipping zones.',
    expectedIssues:
      'Weight gap in Domestic Zone (10.0kg to 10.5kg), price gap between Economy and Priority ($50.00 to $55.00), and Australia/New Zealand markets with zero rates.',
    payload: {
      shop: {
        name: 'Nordic Hardware Direct',
        myshopifyDomain: 'nordic-tools-live.myshopify.com',
      },
      deliveryProfiles: [
        {
          id: 'gid://shopify/DeliveryProfile/44129',
          name: 'Heavy Industrial Tools Profile',
          default: true,
          profileLocationGroups: [
            {
              id: 'gid://shopify/LocationGroup/202',
              locations: [
                {
                  id: 'gid://shopify/Location/881',
                  name: 'Stockholm Hub',
                  isActive: true,
                  fulfillsOnlineOrders: true,
                },
              ],
              shippingZones: [
                {
                  id: 'gid://shopify/ShippingZone/901',
                  name: 'Nordic Domestic',
                  countries: [{ code: 'SE', name: 'Sweden' }, { code: 'NO', name: 'Norway' }],
                  weightBasedRates: [
                    {
                      id: 'gid://shopify/DeliveryWeightBasedRate/11',
                      name: 'Standard Parcel Box',
                      price: { amount: '9.00', currencyCode: 'EUR' },
                      minOrderWeight: { value: 0, unit: 'KILOGRAMS' },
                      maxOrderWeight: { value: 10.0, unit: 'KILOGRAMS' },
                    },
                    {
                      id: 'gid://shopify/DeliveryWeightBasedRate/12',
                      name: 'Heavy Pallet Freight',
                      price: { amount: '45.00', currencyCode: 'EUR' },
                      minOrderWeight: { value: 10.5, unit: 'KILOGRAMS' }, // GAP: 10.0kg to 10.5kg
                      maxOrderWeight: { value: 100.0, unit: 'KILOGRAMS' },
                    },
                  ],
                  priceBasedRates: [
                    {
                      id: 'gid://shopify/DeliveryPriceBasedRate/21',
                      name: 'Standard Rate',
                      price: { amount: '12.00', currencyCode: 'EUR' },
                      minOrderSubtotal: { amount: '0.00' },
                      maxOrderSubtotal: { amount: '50.00' },
                    },
                    {
                      id: 'gid://shopify/DeliveryPriceBasedRate/22',
                      name: 'Priority Free Shipping',
                      price: { amount: '0.00', currencyCode: 'EUR' },
                      minOrderSubtotal: { amount: '55.00' }, // GAP: $50.01 to $54.99 has no rate!
                      maxOrderSubtotal: null,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      markets: [
        {
          id: 'gid://shopify/Market/601',
          name: 'Nordics Core',
          enabled: true,
          regions: [{ name: 'Sweden', code: 'SE' }, { name: 'Norway', code: 'NO' }],
        },
        {
          id: 'gid://shopify/Market/602',
          name: 'Oceania Market (Australia & New Zealand)',
          enabled: true,
          regions: [{ name: 'Australia', code: 'AU' }, { name: 'New Zealand', code: 'NZ' }], // Dead end!
        },
      ],
      locations: [
        {
          id: 'gid://shopify/Location/881',
          name: 'Stockholm Hub',
          isActive: true,
          fulfillsOnlineOrders: true,
        },
      ],
      products: [],
      discountNodes: [],
      webPixels: [],
      scriptTags: [],
    },
  },
  {
    id: 'discount-stacking-margin-leakage',
    name: 'Discount Stacking & $0 Cart Exploit',
    badge: 'Margin Risk',
    description:
      'Store with overlapping automatic sitewide sales and influencer discount codes configured with unrestricted combination rules.',
    expectedIssues:
      'Unrestricted stacking across product, order, and shipping without minimum subtotal; uncapped 50% code; $0.00 cart exploit simulation.',
    payload: {
      shop: {
        name: 'Luxe Beauty Labs',
        myshopifyDomain: 'luxe-beauty-direct.myshopify.com',
      },
      deliveryProfiles: [
        {
          id: 'gid://shopify/DeliveryProfile/991',
          name: 'Default Profile',
          shippingZones: [
            {
              id: 'gid://shopify/ShippingZone/111',
              name: 'United States',
              countries: [{ code: 'US', name: 'United States' }],
              priceBasedRates: [
                {
                  id: 'gid://shopify/DeliveryPriceBasedRate/99',
                  name: 'Standard Ground',
                  price: { amount: '8.00', currencyCode: 'USD' },
                  minOrderSubtotal: { amount: '0.00' },
                  maxOrderSubtotal: null,
                },
              ],
            },
          ],
        },
      ],
      markets: [
        {
          id: 'gid://shopify/Market/11',
          name: 'United States',
          enabled: true,
          regions: [{ name: 'United States', code: 'US' }],
        },
      ],
      locations: [
        {
          id: 'gid://shopify/Location/1',
          name: 'Primary Fulfillment Center',
          isActive: true,
          fulfillsOnlineOrders: true,
        },
      ],
      products: [],
      discountNodes: [
        {
          id: 'gid://shopify/DiscountNode/7711',
          discount: {
            __typename: 'DiscountAutomaticBasic',
            title: 'FLASH25 Sitewide Auto Discount',
            status: 'ACTIVE',
            isAutomatic: true,
            combinesWith: {
              productDiscounts: true,
              orderDiscounts: true,
              shippingDiscounts: true,
            },
            customerGets: {
              value: {
                percentage: 0.25,
              },
            },
            minimumRequirement: null,
          },
        },
        {
          id: 'gid://shopify/DiscountNode/7712',
          discount: {
            __typename: 'DiscountCodeBasic',
            title: 'CREATOR50',
            status: 'ACTIVE',
            isAutomatic: false,
            usageLimit: null,
            appliesOncePerCustomer: false,
            combinesWith: {
              productDiscounts: true,
              orderDiscounts: true,
              shippingDiscounts: true,
            },
            customerGets: {
              value: {
                percentage: 0.5, // 50% discount!
              },
            },
            minimumRequirement: null,
          },
        },
        {
          id: 'gid://shopify/DiscountNode/7713',
          discount: {
            __typename: 'DiscountCodeFreeShipping',
            title: 'FREESHIPME',
            status: 'ACTIVE',
            isAutomatic: false,
            combinesWith: {
              productDiscounts: true,
              orderDiscounts: true,
              shippingDiscounts: true,
            },
            minimumRequirement: null,
          },
        },
      ],
      webPixels: [],
      scriptTags: [],
    },
  },
  {
    id: 'clean-hardened-store',
    name: 'Hardened Production Baseline (Zero Critical Issues)',
    badge: 'Clean Baseline',
    description:
      'A properly architected Shopify Plus store with continuous shipping intervals, protected discount boundaries, single authoritative Web Pixels, and zero legacy bloat.',
    expectedIssues: 'Zero critical or high findings. Clean revenue assurance.',
    payload: {
      shop: {
        name: 'Zenith Peak Performance',
        myshopifyDomain: 'zenith-performance.myshopify.com',
      },
      deliveryProfiles: [
        {
          id: 'gid://shopify/DeliveryProfile/1',
          name: 'General Profile',
          profileLocationGroups: [
            {
              id: 'gid://shopify/LocationGroup/1',
              locations: [
                {
                  id: 'gid://shopify/Location/10',
                  name: 'HQ Fulfillment Center',
                  isActive: true,
                  fulfillsOnlineOrders: true,
                },
              ],
              shippingZones: [
                {
                  id: 'gid://shopify/ShippingZone/1',
                  name: 'Domestic US',
                  countries: [{ code: 'US', name: 'United States' }],
                  priceBasedRates: [
                    {
                      id: 'gid://shopify/DeliveryPriceBasedRate/1',
                      name: 'Standard Flat Rate',
                      price: { amount: '6.95', currencyCode: 'USD' },
                      minOrderSubtotal: { amount: '0.00' },
                      maxOrderSubtotal: { amount: '75.00' },
                    },
                    {
                      id: 'gid://shopify/DeliveryPriceBasedRate/2',
                      name: 'Free Shipping Threshold',
                      price: { amount: '0.00', currencyCode: 'USD' },
                      minOrderSubtotal: { amount: '75.00' },
                      maxOrderSubtotal: null, // Properly uncapped!
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      markets: [
        {
          id: 'gid://shopify/Market/1',
          name: 'United States',
          enabled: true,
          regions: [{ name: 'United States', code: 'US' }],
        },
      ],
      locations: [
        {
          id: 'gid://shopify/Location/10',
          name: 'HQ Fulfillment Center',
          isActive: true,
          fulfillsOnlineOrders: true,
        },
      ],
      products: [],
      discountNodes: [
        {
          id: 'gid://shopify/DiscountNode/10',
          discount: {
            __typename: 'DiscountCodeBasic',
            title: 'WELCOME15',
            status: 'ACTIVE',
            isAutomatic: false,
            usageLimit: 1000,
            appliesOncePerCustomer: true,
            combinesWith: {
              productDiscounts: false,
              orderDiscounts: false,
              shippingDiscounts: true, // Only stacks with shipping
            },
            customerGets: {
              value: {
                percentage: 0.15,
              },
            },
            minimumRequirement: {
              greaterThanOrEqualToSubtotal: {
                amount: '50.00',
                currencyCode: 'USD',
              },
            },
          },
        },
      ],
      webPixels: [
        {
          id: 'gid://shopify/WebPixel/1',
          status: 'ACTIVE',
          accountID: 'META-99281726',
          target: 'meta-pixel',
          settings: JSON.stringify({ pixelId: '99281726' }),
        },
      ],
      scriptTags: [],
      themeInlineScripts: [],
    },
  },
];
