import {getLocaleDictionary} from '~/i18n/useTranslationsDictionary.jsx';
import {STORE_LANGUAGES} from '~/lib/const.js';
import {pageTitle} from '~/lib/utils.js';

/**
 * SEO de la plantilla: descripción, canonical, alternas por idioma, tarjetas
 * sociales y datos estructurados, todo desde un solo lugar.
 *
 * Vive acá y no en cada ruta por la misma razón que `pageTitle`: son diez
 * rutas y el patrón es fácil de saltear. Lo que se salteaba antes de esto era
 * TODO — el sitio no tenía una sola `description`, ni un canonical, ni un
 * hreflang, ni un JSON-LD.
 *
 * Nada de acá sale de un literal: el nombre, la bajada y el logo son de la
 * tienda (`shop`), y los textos de página vienen del diccionario. Una tienda
 * nueva apunta el `.env` y hereda su propio SEO.
 */

const DEFAULT_LANGUAGE = STORE_LANGUAGES[0].toLowerCase();

const LOCALE_SEGMENTS = new Set(
  STORE_LANGUAGES.map((language) => language.toLowerCase()),
);

/**
 * Path sin el prefijo de idioma. `/en/products/x` y `/products/x` son la misma
 * página en dos idiomas, y las alternas se arman desde esta forma neutra.
 *
 * @param {string} pathname
 * @returns {string}
 */
export function stripLocaleSegment(pathname) {
  const [, first, ...rest] = pathname.split('/');

  if (!LOCALE_SEGMENTS.has(String(first).toLowerCase())) {
    return pathname;
  }

  return `/${rest.join('/')}`.replace(/\/$/, '') || '/';
}

/**
 * URL absoluta de un path en un idioma.
 *
 * El idioma por defecto va **sin** prefijo: es la forma que la app usa en sus
 * propios links (medido: el header linkea `/collections/all`, no
 * `/es/collections/all`). Las dos formas responden 200, así que sin canonical
 * cada página existe duplicada para un buscador.
 *
 * @param {string} origin
 * @param {string} pathname — ya sin prefijo de idioma
 * @param {string} language — en minúscula
 * @returns {string}
 */
export function localizedUrl(origin, pathname, language) {
  const clean = pathname === '/' ? '' : pathname;

  return language === DEFAULT_LANGUAGE
    ? `${origin}${clean || '/'}`
    : `${origin}/${language}${clean}`;
}

/**
 * Arma el array de `meta` de una ruta.
 *
 * Devuelve descriptores de Remix, incluidos los `<link>` (`tagName: 'link'`),
 * que es la única forma de emitir canonical y hreflang desde `meta`.
 *
 * @param {object} options
 * @param {any} options.matches — el `matches` que Remix pasa a `meta`
 * @param {{pathname: string}} options.location
 * @param {string|null} [options.title] — clave de i18n o texto ya resuelto
 * @param {string|null} [options.rawTitle] — título completo, sin envolver
 * @param {string|null} [options.description]
 * @param {string|null} [options.image] — URL absoluta
 * @param {'website'|'product'|'article'} [options.type]
 * @param {object|object[]|null} [options.jsonLd]
 * @returns {Array<object>}
 */
export function seoMeta({
  matches,
  location,
  title = null,
  rawTitle = null,
  description = null,
  image = null,
  type = 'website',
  jsonLd = null,
  noIndex = false,
}) {
  const root = matches?.[0]?.data;
  const shop = root?.header?.shop;
  const origin = root?.origin ?? '';

  // `rawTitle` es el título que el comercio escribió en el admin de Shopify:
  // ya viene completo y con la marca adentro. Pasarlo por `pageTitle` daba
  // "Picafili | Manta … — Picamimito | Picafili", con el nombre dos veces.
  const resolvedTitle = rawTitle
    ? String(rawTitle)
    : pageTitle(matches, title ?? shop?.name ?? '');

  // Sin descripción propia se cae a la bajada de la tienda. Una descripción
  // genérica repetida es peor que ninguna en teoría, pero acá el fallback es
  // el texto real del negocio, no relleno.
  //
  // La descripción admite una CLAVE de i18n igual que el título: una página
  // estática la tiene en el diccionario, un producto la trae de Shopify.
  const resolvedDescription = truncate(
    fromDictionary(root, description) || shop?.description || '',
  );

  const neutralPath = stripLocaleSegment(location?.pathname ?? '/');
  const canonical = localizedUrl(origin, neutralPath, currentLanguage(root));
  const socialImage = image || shop?.brand?.logo?.image?.url || null;

  const tags = [
    {title: resolvedTitle},
    {property: 'og:title', content: resolvedTitle},
    {property: 'og:type', content: type},
    {
      name: 'twitter:card',
      content: socialImage ? 'summary_large_image' : 'summary',
    },
    {name: 'twitter:title', content: resolvedTitle},
  ];

  if (resolvedDescription) {
    tags.push(
      {name: 'description', content: resolvedDescription},
      {property: 'og:description', content: resolvedDescription},
      {name: 'twitter:description', content: resolvedDescription},
    );
  }

  if (shop?.name) {
    tags.push({property: 'og:site_name', content: shop.name});
  }

  if (socialImage) {
    tags.push(
      {property: 'og:image', content: socialImage},
      {name: 'twitter:image', content: socialImage},
    );
  }

  if (origin) {
    tags.push({property: 'og:url', content: canonical});
    tags.push({tagName: 'link', rel: 'canonical', href: canonical});

    for (const language of LOCALE_SEGMENTS) {
      tags.push({
        tagName: 'link',
        rel: 'alternate',
        hrefLang: language,
        href: localizedUrl(origin, neutralPath, language),
      });
    }

    tags.push({
      tagName: 'link',
      rel: 'alternate',
      hrefLang: 'x-default',
      href: localizedUrl(origin, neutralPath, DEFAULT_LANGUAGE),
    });
  }

  // Páginas que no tienen por qué existir para un buscador: la sala de espera
  // de una cuenta, cualquier pantalla que solo se ve con sesión. Es por página
  // y no global porque `robots.txt` ya cubre el sitio entero cuando el portal
  // está cerrado — esto sigue valiendo si mañana se abre el catálogo.
  if (noIndex) {
    tags.push({name: 'robots', content: 'noindex, nofollow'});
  }

  for (const entry of [jsonLd].flat()) {
    if (entry) {
      tags.push({'script:ld+json': entry});
    }
  }

  return tags;
}

/**
 * Datos estructurados de la tienda. Van en la home y no en cada página: si
 * cada ruta declarara su propia Organization, un buscador ve N entidades
 * distintas en vez de una.
 *
 * @param {any} shop
 * @param {string} origin
 */
export function storeJsonLd(shop, origin) {
  if (!shop?.name || !origin) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: shop.name,
    url: origin,
    ...(shop.description ? {description: shop.description} : {}),
    ...(shop.brand?.logo?.image?.url ? {logo: shop.brand.logo.image.url} : {}),
  };
}

/**
 * Datos estructurados de un producto.
 *
 * **`offers` solo si el visitante puede ver precios.** Un JSON-LD es texto
 * plano en el HTML: publicar ahí el precio mayorista lo publica para
 * cualquiera —buscadores incluidos— y saltea el gate de
 * `canSeePricesOnServer` por la puerta de atrás. Sin precio visible el
 * producto igual se describe (nombre, imagen, marca, SKU); lo que no viaja es
 * la plata.
 *
 * @param {object} options
 * @param {any} options.product
 * @param {string} options.url
 * @param {boolean} options.canSeePrices
 * @param {string} [options.brandName]
 */
export function productJsonLd({product, url, canSeePrices, brandName}) {
  if (!product?.title) return null;

  const price = product?.priceRange?.minVariantPrice;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    url,
    ...(product.description
      ? {description: truncate(product.description)}
      : {}),
    ...(product.featuredImage?.url ? {image: product.featuredImage.url} : {}),
    ...(product.vendor || brandName
      ? {brand: {'@type': 'Brand', name: product.vendor || brandName}}
      : {}),
    ...(canSeePrices && price?.amount
      ? {
          offers: {
            '@type': 'Offer',
            url,
            price: price.amount,
            priceCurrency: price.currencyCode,
            availability: product.availableForSale
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        }
      : {}),
  };
}

/**
 * Miga de pan estructurada. Es lo que hace que un resultado muestre la ruta de
 * categorías en vez de la URL cruda.
 *
 * @param {Array<{name: string, url: string}>} items
 */
export function breadcrumbJsonLd(items) {
  const usable = (items ?? []).filter((item) => item?.name && item?.url);
  if (!usable.length) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: usable.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Resuelve una clave de diccionario (`login.panel-body`) al idioma activo.
 *
 * Un texto que no tenga forma de clave vuelve tal cual: así la misma función
 * sirve para una página estática y para la descripción que viene de Shopify.
 * Sin esto, una clave sin resolver se publicaba como `<meta
 * name="description" content="login.panel-body">`.
 *
 * @param {any} root
 * @param {string|null} value
 * @returns {string}
 */
function fromDictionary(root, value) {
  if (typeof value !== 'string' || !value) return '';
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(value) || value.includes(' ')) {
    return value;
  }

  const dictionary = getLocaleDictionary(currentLanguage(root));
  const resolved = value
    .split('.')
    .reduce((node, key) => (node ? node[key] : undefined), dictionary);

  return typeof resolved === 'string' ? resolved : value;
}

/**
 * Idioma activo en minúscula, con el de la tienda como piso.
 *
 * @param {any} root
 */
function currentLanguage(root) {
  return String(root?.i18n?.language ?? DEFAULT_LANGUAGE).toLowerCase();
}

/**
 * Recorta a lo que un buscador muestra, cortando en la última palabra entera.
 * Las descripciones de producto de Shopify vienen del editor y pueden ser
 * larguísimas.
 *
 * @param {string} text
 * @param {number} [max]
 */
function truncate(text, max = 160) {
  const clean = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).trim()}…`;
}
