import {PRODUCT_ITEM_FRAGMENT} from '~/data/fragments';

export const METAOBJECT_FRAGMENT = `#graphql
fragment Metaobject on Metaobject {
   handle
   id
   fields {
    key
    value
    reference {
        ... on MediaImage {
            alt
            image {
                altText
                url
            }
        }
    }
   }
}
`;

export const PRODUCT_VARIANT_FRAGMENT = `#graphql
fragment ProductVariant on ProductVariant {
    availableForSale
    quantityRule {
        minimum
        maximum
        increment
    }
    quantityPriceBreaks(first: 10) {
        nodes {
            minimumQuantity
            price {
                amount
                currencyCode
            }
        }
    }
    compareAtPrice {
        amount
        currencyCode
    }
    id
    image{
        __typename
        id
        url
        altText
        width
        height
    }
    price {
        amount
        currencyCode
    }
    product {
        title
        handle
          # Clave de categoria para los descuentos por categoria. Cual es la
          # fuente lo decide CATEGORY_KEY_SOURCE en app/lib/const.js.
          collections(first: 1) {
            nodes {
              handle
            }
          }
    }
    selectedOptions {
        name
        value
    }
    sku
    title
    unitPrice {
        amount
        currencyCode
    }
}
`;

export const PRODUCT_FRAGMENT = `#graphql
fragment Product on Product {
    productType
    id
    title
    vendor
    handle
    descriptionHtml
    tags
    description
    options {
        name
        values
    }
    images(first: 10) {
        nodes {
        id
        altText
        url
        }
    }
    metafields(identifiers: $identifiers){
      namespace
      key
      description
      value
      type
      references(first: 100) {
        nodes {
            ...Metaobject 
        }
    }
    }
    collections(first:10){
        nodes{
            handle
            title
        }
    }
    selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
        ...ProductVariant
    }
    variants(first: 1) {
        nodes {
            ...ProductVariant
        }
    }
    seo {
        description
        title
    }
}
${PRODUCT_VARIANT_FRAGMENT}
${METAOBJECT_FRAGMENT}

`;

export const PRODUCT_QUERY = `#graphql
query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
    $identifiers: [HasMetafieldsIdentifier!]!
) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
        ...Product
    }
}
${PRODUCT_FRAGMENT}
`;

export const PRODUCT_VARIANTS_FRAGMENT = `#graphql
fragment ProductVariants on Product {
    variants(first: 250) {
        nodes {
            ...ProductVariant
        }
    }
}
${PRODUCT_VARIANT_FRAGMENT}
`;

export const VARIANTS_QUERY = `#graphql
${PRODUCT_VARIANTS_FRAGMENT}
query ProductVariants(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
        ...ProductVariants
    }
}
`;

export const RECOMMENDED_PRODUCTS_QUERY = `#graphql
${PRODUCT_ITEM_FRAGMENT}
query RecommendedProducts($handle : String, $metafieldIdentifiers: [HasMetafieldsIdentifier!]!){
  productRecommendations(productHandle: $handle,intent: COMPLEMENTARY) {
    ...ProductItem
    }
  }
`;
