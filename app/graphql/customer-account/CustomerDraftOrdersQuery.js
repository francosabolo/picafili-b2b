// https://shopify.dev/docs/api/customer/2024-07/objects/DraftOrder
export const DRAFT_ORDER_ITEM_FRAGMENT = `#graphql
fragment DraftOrderItem on DraftOrder {
    totalPrice {
        amount
        currencyCode
    }
    status
    id
    name
    createdAt
    shippingAddress {   
      firstName
    }
  }
`;

export const CUSTOMER_DRAFT_ORDERS_FRAGMENT = `#graphql
  fragment CustomerDraftOrders on Customer {
    draftOrders(
      sortKey: UPDATED_AT,
      reverse: true,
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...DraftOrderItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        endCursor
        startCursor
      }
    }
  }
  ${DRAFT_ORDER_ITEM_FRAGMENT}
`;

// https://shopify.dev/docs/api/customer/latest/queries/customer
export const CUSTOMER_DRAFT_ORDERS_QUERY = `#graphql
  ${CUSTOMER_DRAFT_ORDERS_FRAGMENT}
  query CustomerDraftOrders(
    $endCursor: String
    $first: Int
    $last: Int
    $startCursor: String
  ) {
    customer {
      ...CustomerDraftOrders
    }
  }
`;
