import {json} from '@shopify/remix-oxygen';
import {canSeePricesOnServer, gatePrices} from '~/lib/price-gating.server.js';
import {getBuyerVariables} from '~/lib/b2b.server.js';
import {Link, useLoaderData} from '@remix-run/react';
import {Image} from '@shopify/hydrogen';
import {PageWidthContainer} from '~/components/PageWidthContainer/PageWidthContainer.jsx';
import {ProductItem} from '~/components/ProductItem/ProductItem.jsx';
import {PRODUCT_ITEM_FRAGMENT} from '~/data/fragments';
import {useAccountState} from '~/context/AccountStateContext.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {HOME_CATEGORIES_COUNT, HOME_PRODUCTS_COUNT} from '~/lib/const.js';
import {seoMeta, storeJsonLd} from '~/lib/seo.js';
import styles from '~/styles/pages/Home.module.scss';
import {allProductMetafields} from '~/data/metafields.js';

/**
 * Home del portal mayorista.
 *
 * Escrita como plantilla: nada del contenido es de una tienda en particular.
 * El nombre y la descripción de la tienda salen de Shopify; las categorías son
 * las colecciones de la tienda; los textos fijos viven en i18n. Apuntar el
 * `.env` a otra tienda debería alcanzar para que esta página funcione.
 *
 * @type {MetaFunction}
 */
export const meta = ({matches, location}) => {
  const shop = matches?.[0]?.data?.header?.shop;
  const origin = matches?.[0]?.data?.origin;

  return seoMeta({
    matches,
    location,
    title: 'page-title.b2b',
    // La entidad de la tienda se declara UNA vez, acá. Repetirla en cada ruta
    // le da a un buscador N organizaciones distintas en vez de una.
    jsonLd: storeJsonLd(shop, origin),
  });
};

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({request, context}) {
  const {storefront} = context;
  // Los precios se filtran ACA, no en el componente: ver price-gating.server.js
  const canSeePrices = canSeePricesOnServer(request, context.b2b);

  const [{collections, shop}, {products}] = await Promise.all([
    storefront.query(HOME_COLLECTIONS_QUERY, {
      cache: storefront.CacheLong(),
      variables: {first: HOME_CATEGORIES_COUNT},
    }),
    storefront.query(HOME_PRODUCTS_QUERY, {
      // Sin caché desde que la query lleva buyer: los precios que devuelve son
      // los del catálogo de ESTA company location. Una entrada compartida de
      // caché acá es la lista de precios de un cliente servida a otro.
      // El listado de categorías de arriba sí se sigue cacheando: no lleva
      // precios y es igual para todos.
      cache: storefront.CacheNone(),
      variables: {
        first: HOME_PRODUCTS_COUNT,
        metafieldIdentifiers: allProductMetafields,
        ...getBuyerVariables(context),
      },
    }),
  ]);

  return json({
    shop,
    collections: collections?.nodes ?? [],
    products: gatePrices(products?.nodes ?? [], canSeePrices),
  });
}

export default function Home() {
  const {shop, collections, products} = useLoaderData();
  const {canSeePrices, company} = useAccountState();
  const {t} = useTranslation();

  // El H1 es la promesa del portal mayorista, no la descripción de la marca:
  // usar el slogan de Shopify acá daba un titular de tienda al público que
  // además repetía la bajada. El nombre de la tienda va en el badge, y la
  // descripción —que sí describe el catálogo— queda como bajada.
  const lead = shop?.description || t('home.lead');
  const badge = shop?.name
    ? `${shop.name} · ${t('home.badge')}`
    : t('home.badge');

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <PageWidthContainer>
          <span className={styles.heroBadge}>{badge}</span>
          <h1 className={styles.heroTitle}>{t('home.headline')}</h1>
          <p className={styles.heroLead}>{lead}</p>

          <div className={styles.heroActions}>
            <Link to="/collections/all" className={styles.heroPrimary}>
              {t('home.cta-catalog')}
            </Link>
            {canSeePrices ? (
              <Link to="/compra-rapida" className={styles.heroSecondary}>
                {t('home.cta-quick-order')}
              </Link>
            ) : (
              <Link to="/pages/contact" className={styles.heroSecondary}>
                {t('home.cta-signup')}
              </Link>
            )}
          </div>

          <p className={styles.heroMeta}>
            {company
              ? `${t('home.buying-as')} ${company}`
              : t('home.registered-only')}
          </p>
        </PageWidthContainer>
      </section>

      <PageWidthContainer>
        {collections.length > 0 && (
          <section className={styles.section}>
            <header className={styles.sectionHead}>
              <div>
                <h2>{t('home.categories-title')}</h2>
                <p>{t('home.categories-lead')}</p>
              </div>
              <Link to="/collections" className={styles.sectionLink}>
                {t('home.see-all')}
              </Link>
            </header>

            <div className={styles.categories}>
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  to={`/collections/${collection.handle}`}
                  className={styles.category}
                >
                  {collection.image?.url ? (
                    <Image
                      data={collection.image}
                      aspectRatio="4/3"
                      sizes="(min-width: 45em) 260px, 45vw"
                      loading="lazy"
                    />
                  ) : (
                    <span className={styles.categoryPlaceholder} />
                  )}
                  <span className={styles.categoryName}>
                    {collection.title}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {products.length > 0 && (
          <section className={styles.section}>
            <header className={styles.sectionHead}>
              <div>
                <h2>{t('home.featured-title')}</h2>
                <p>
                  {canSeePrices
                    ? t('home.featured-lead-approved')
                    : t('home.featured-lead-guest')}
                </p>
              </div>
              <Link to="/collections/all" className={styles.sectionLink}>
                {t('home.see-all')}
              </Link>
            </header>

            <div className="products-grid">
              {products.map((product, index) => (
                <ProductItem
                  key={product.id}
                  product={product}
                  loading={index < 4 ? 'eager' : 'lazy'}
                />
              ))}
            </div>
          </section>
        )}
      </PageWidthContainer>
    </div>
  );
}

const HOME_COLLECTIONS_QUERY = `#graphql
  query HomeCollections($first: Int!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    shop {
      name
      description
    }
    collections(first: $first, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        handle
        title
        image {
          url
          altText
          width
          height
        }
      }
    }
  }
`;

const HOME_PRODUCTS_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query HomeProducts($first: Int!, $metafieldIdentifiers: [HasMetafieldsIdentifier!]!, $country: CountryCode, $language: LanguageCode, $buyer: BuyerInput)
  @inContext(country: $country, language: $language, buyer: $buyer) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        ...ProductItem
      }
    }
  }
`;

/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
