// NOTE: https://shopify.dev/docs/api/customer/latest/queries/order
export const CUSTOMER_DRAFT_ORDER_QUERY = `#graphql


fragment DraftOrderAddress on CustomerAddress {
    firstName
    address1
    address2
    city
    company
    country
    id
    name
    phoneNumber
}

fragment DraftOrderLineItem on DraftOrderLineItem {
    id
    title
    quantity
    discountedUnitPrice {
        amount
        currencyCode
    }
    discountedTotal {
        amount
        currencyCode
    }
    originalUnitPrice {
        amount
        currencyCode
    }
    image {
      altText
      height
      url
      id
      width
    }
    variantTitle
  }

query draftOrder($id: ID!) {
    draftOrder(id: $id) {
        id
        name
        email
        createdAt
        status
        inReview
        invoiceUrl
        lineItems(first: 100) {
            nodes {
                ...DraftOrderLineItem
            }
        }
        lineItemsSummary {
            lineItemCount
            totalQuantityOfLineItems
        }
        phone
        currencyCode
        totalTax {
            amount
            currencyCode
        }
        billingAddress {
            ...DraftOrderAddress
        }
        shippingAddress {
            ...DraftOrderAddress
        }
        totalShippingPrice {
            amount
            currencyCode
        }
        totalPrice {
            amount
            currencyCode
        }
        totalLineItemsPrice {
            amount
            currencyCode
        }
        customer {
            id
            displayName
        }
        totalWeight
        updatedAt
        discountInformation {
            totalDiscounts {
                amount
                currencyCode
            }
        }
    }
}`;
