/**
 * Ready-to-execute Shopify Admin GraphQL queries for store owners / architects
 * to extract exact raw JSON data from Shopify GraphiQL or Admin API.
 */

export const SHOPIFY_ADMIN_GRAPHQL_QUERY = `# =========================================================================
# Shopify Revenue Assurance Auditor - Master Data Ingestion Query
# Run this query in Shopify GraphiQL App or Admin API (API version 2024-10 or later)
# =========================================================================

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
                  price {
                    amount
                    currencyCode
                  }
                  minOrderSubtotal {
                    amount
                  }
                  maxOrderSubtotal {
                    amount
                  }
                }
                weightBasedRates {
                  id
                  name
                  price {
                    amount
                    currencyCode
                  }
                  minOrderWeight {
                    value
                    unit
                  }
                  maxOrderWeight {
                    value
                    unit
                  }
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

  # 3. Fulfillment Locations & Product Inventory Mapping
  locations(first: 25) {
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

  # 4. Discounts & Combinations
  discountNodes(first: 50) {
    edges {
      node {
        id
        discount {
          __typename
          ... on DiscountCodeBasic {
            title
            status
            asyncUsageCount
            usageLimit
            appliesOncePerCustomer
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
            customerGets {
              value {
                ... on DiscountPercentage {
                  percentage
                }
                ... on DiscountAmount {
                  amount {
                    amount
                    currencyCode
                  }
                }
              }
            }
            minimumRequirement {
              ... on DiscountMinimumSubtotal {
                greaterThanOrEqualToSubtotal {
                  amount
                  currencyCode
                }
              }
              ... on DiscountMinimumQuantity {
                greaterThanOrEqualToQuantity {
                  quantity
                }
              }
            }
          }
          ... on DiscountAutomaticBasic {
            title
            status
            asyncUsageCount
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
            customerGets {
              value {
                ... on DiscountPercentage {
                  percentage
                }
                ... on DiscountAmount {
                  amount {
                    amount
                    currencyCode
                  }
                }
              }
            }
            minimumRequirement {
              ... on DiscountMinimumSubtotal {
                greaterThanOrEqualToSubtotal {
                  amount
                  currencyCode
                }
              }
            }
          }
          ... on DiscountCodeFreeShipping {
            title
            status
            usageLimit
            appliesOncePerCustomer
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
            minimumRequirement {
              ... on DiscountMinimumSubtotal {
                greaterThanOrEqualToSubtotal {
                  amount
                  currencyCode
                }
              }
            }
          }
          ... on DiscountCodeBxgy {
            title
            status
            asyncUsageCount
            usageLimit
            appliesOncePerCustomer
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
            customerGets {
              value {
                ... on DiscountPercentage {
                  percentage
                }
                ... on DiscountAmount {
                  amount {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
          ... on DiscountAutomaticBxgy {
            title
            status
            asyncUsageCount
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
            customerGets {
              value {
                ... on DiscountPercentage {
                  percentage
                }
                ... on DiscountAmount {
                  amount {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
          ... on DiscountCodeApp {
            title
            status
            asyncUsageCount
            appliesOncePerCustomer
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
          }
          ... on DiscountAutomaticApp {
            title
            status
            asyncUsageCount
            combinesWith {
              orderDiscounts
              productDiscounts
              shippingDiscounts
            }
          }
        }
      }
    }
  }

  # 5. Tracking & Script Bloat (Audits Web Pixels and flags deprecated scriptTags)
  webPixels(first: 20) {
    edges {
      node {
        id
        status
        settings
      }
    }
  }

  # Deprecated in modern Shopify (turned off in favor of Web Pixels / Checkout UI Extensions)
  scriptTags(first: 30) {
    edges {
      node {
        id
        src
        event
        displayScope
        createdAt
        updatedAt
      }
    }
  }
}
`;
