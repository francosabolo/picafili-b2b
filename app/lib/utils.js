import {getLocaleDictionary} from '~/i18n/useTranslationsDictionary.jsx';
import {useLocation} from '@remix-run/react';
import typographicBase from 'typographic-base/index';
import {useRootLoaderData} from '~/lib/root-data';
import {locales} from '~/data/locales.js';

/**
 * @param {string} [string]
 * @param {string} [prefix]
 */
export function missingClass(string, prefix) {
  if (!string) {
    return true;
  }

  const regex = new RegExp(` ?${prefix}`, 'g');
  return string.match(regex) === null;
}

/**
 * @param {string | React.ReactNode} [input]
 */
export function formatText(input) {
  if (!input) {
    return;
  }

  if (typeof input !== 'string') {
    return input;
  }

  return typographicBase(input, {locale: 'en-us'}).replace(
    /\s([^\s<]+)\s*$/g,
    '\u00A0$1',
  );
}

/**
 * @param {string} text
 */
export function getExcerpt(text) {
  const regex = /<p.*>(.*?)<\/p>/;
  const match = regex.exec(text);
  return match?.length ? match[0] : text;
}

/**
 * @param {string} date
 */
export function isNewArrival(date, daysOld = 30) {
  return (
    new Date(date).valueOf() >
    new Date().setDate(new Date().getDate() - daysOld).valueOf()
  );
}

/**
 * @param {MoneyV2} price
 * @param {MoneyV2} compareAtPrice
 */
/**
 * ¿El precio de comparación es realmente un precio anterior más alto?
 *
 * Comparaba los `amount` como STRINGS: "9000.0" > "10000.0" da true en orden
 * lexicográfico, así que un producto que subió de 9.000 a 10.000 se anunciaba
 * como oferta. Ahora compara números.
 *
 * Además hace falta el chequeo en sí: hoy hay productos en el catálogo con
 * `compareAtPrice` MENOR que el precio (Shopify no lo impide). Sin este guard
 * la ficha tacha un precio más barato y simula un descuento que es un aumento.
 *
 * @param {{amount?: string|number}} [price]
 * @param {{amount?: string|number}} [compareAtPrice]
 */
export function isDiscounted(price, compareAtPrice) {
  const current = Number(price?.amount);
  const previous = Number(compareAtPrice?.amount);

  if (Number.isNaN(current) || Number.isNaN(previous)) return false;

  return previous > current;
}

/**
 * @param {{
 *     customPrefixes: Record<string, string>;
 *     pathname?: string;
 *     type?: string;
 *   }}
 */
function resolveToFromType(
  {customPrefixes, pathname, type} = {
    customPrefixes: {},
  },
) {
  if (!pathname || !type) return '';

  /*
      MenuItemType enum
      @see: https://shopify.dev/api/storefront/unstable/enums/MenuItemType
    */
  const defaultPrefixes = {
    BLOG: 'blogs',
    COLLECTION: 'collections',
    COLLECTIONS: 'collections',
    FRONTPAGE: 'frontpage',
    HTTP: '',
    PAGE: 'pages',
    CATALOG: 'collections/all',
    PRODUCT: 'products',
    SEARCH: 'search',
    SHOP_POLICY: 'policies',
  };

  const pathParts = pathname.split('/');
  const handle = pathParts.pop() || '';
  const routePrefix = {
    ...defaultPrefixes,
    ...customPrefixes,
  };

  switch (true) {
    // special cases
    case type === 'FRONTPAGE':
      return '/';

    case type === 'ARTICLE': {
      const blogHandle = pathParts.pop();
      return routePrefix.BLOG
        ? `/${routePrefix.BLOG}/${blogHandle}/${handle}/`
        : `/${blogHandle}/${handle}/`;
    }

    case type === 'COLLECTIONS':
      return `/${routePrefix.COLLECTIONS}`;

    case type === 'SEARCH':
      return `/${routePrefix.SEARCH}`;

    case type === 'CATALOG':
      return `/${routePrefix.CATALOG}`;

    // common cases: BLOG, PAGE, COLLECTION, PRODUCT, SHOP_POLICY, HTTP
    default:
      return routePrefix[type]
        ? `/${routePrefix[type]}/${handle}`
        : `/${handle}`;
  }
}

/*
  Parse each menu link and adding, isExternal, to and target
*/
/**
 * @param {string} primaryDomain
 * @param {Env} env
 */
function parseItem(primaryDomain, env, customPrefixes = {}) {
  return function (item) {
    if (!item?.url || !item?.type) {
      // eslint-disable-next-line no-console
      console.warn('Invalid menu item.  Must include a url and type.');
      return null;
    }

    // extract path from url because we don't need the origin on internal to attributes
    const {host, pathname} = new URL(item.url);

    const isInternalLink =
      host === new URL(primaryDomain).host || host === env.PUBLIC_STORE_DOMAIN;

    const parsedItem = isInternalLink
      ? // internal links
        {
          ...item,
          isExternal: false,
          target: '_self',
          to: resolveToFromType({type: item.type, customPrefixes, pathname}),
        }
      : // external links
        {
          ...item,
          isExternal: true,
          target: '_blank',
          to: item.url,
        };

    if ('items' in item) {
      return {
        ...parsedItem,
        items: item.items
          .map(parseItem(primaryDomain, env, customPrefixes))
          .filter(Boolean),
      };
    } else {
      return parsedItem;
    }
  };
}

/*
  Recursively adds `to` and `target` attributes to links based on their url
  and resource type.
  It optionally overwrites url paths based on item.type
*/
/**
 * @param {MenuFragment} menu
 * @param {string} primaryDomain
 * @param {Env} env
 */
export function parseMenu(menu, primaryDomain, env, customPrefixes = {}) {
  if (!menu?.items) {
    // eslint-disable-next-line no-console
    console.warn('Invalid menu passed to parseMenu');
    return null;
  }

  const parser = parseItem(primaryDomain, env, customPrefixes);

  const parsedMenu = {
    ...menu,
    items: menu.items.map(parser).filter(Boolean),
  };

  return parsedMenu;
}

export const INPUT_STYLE_CLASSES =
  'appearance-none rounded dark:bg-transparent border focus:border-primary/50 focus:ring-0 w-full py-2 px-3 text-primary/90 placeholder:text-primary/50 leading-tight focus:shadow-outline';

/**
 * @param {string | null} [isError]
 */
export const getInputStyleClasses = (isError) => {
  return `${INPUT_STYLE_CLASSES} ${
    isError ? 'border-red-500' : 'border-primary/20'
  }`;
};

/**
 * @param {FulfillmentStatus} status
 */
export function statusMessage(status) {
  const translations = {
    SUCCESS: 'Success',
    PENDING: 'Pending',
    OPEN: 'Open',
    FAILURE: 'Failure',
    ERROR: 'Error',
    CANCELLED: 'Cancelled',
  };
  try {
    return translations?.[status];
  } catch (error) {
    return status;
  }
}

export const DEFAULT_LOCALE = Object.freeze({
  ...locales['/en'],
});

export function getApproximateLocaleFromRequest(request) {
  const url = new URL(request.url);

  // Get the accept-language header
  const acceptLang = request.headers.get('accept-language');

  // Do something with accept language.
  // For example:
  if (acceptLang.includes('en-US')) {
    return {
      language: 'EN',
      country: 'US',
    };
  }

  if (acceptLang.includes('en-EN')) {
    return {
      language: 'EN',
      country: 'EN',
    };
  }

  // Use the default locale
  return {
    language: 'ES',
    country: 'ES',
  };
}

/**
 * @param {Request} request
 */
export function getLocaleFromRequest(request) {
  const url = new URL(request.url);
  const firstPathPart =
    '/' + url.pathname.substring(1).split('/')[0].toLowerCase();

  if (firstPathPart === '/en') {
    return {
      country: 'ES',
      language: 'EN',
      currency: 'EUR',
      pathPrefix: '/en',
    };
  }

  if (firstPathPart === '/es') {
    return {
      country: 'ES',
      language: 'ES',
      pathPrefix: '/es',
      currency: 'EUR',
    };
  }

  if (firstPathPart === '/fr') {
    return {
      country: 'ES',
      language: 'FR',
      currency: 'EUR',
      pathPrefix: '/fr',
    };
  }
  return {
    country: 'ES',
    language: 'EN',
    currency: 'EUR',
    pathPrefix: '/en',
    isDefault: true,
  };
}

/**
 * @param {string} path
 */
export function usePrefixPathWithLocale(path) {
  const rootData = useRootLoaderData();
  const selectedLocale = rootData?.selectedLocale ?? DEFAULT_LOCALE;

  return `${selectedLocale.pathPrefix}${
    path.startsWith('/') ? path : '/' + path
  }`;
}

export function useIsHomePath() {
  const {pathname} = useLocation();
  const rootData = useRootLoaderData();
  const selectedLocale = rootData?.selectedLocale ?? DEFAULT_LOCALE;
  const strippedPathname = pathname.replace(selectedLocale.pathPrefix, '');
  return strippedPathname === '/';
}

/**
 * @param {number} value
 * @param {I18nLocale} locale
 */
export function parseAsCurrency(value, locale) {
  return new Intl.NumberFormat(locale.language + '-' + locale.country, {
    style: 'currency',
    currency: locale.currency,
  }).format(value);
}

/**
 * Validates that a url is local
 * @returns `true` if local `false`if external domain
 * @param {string} url
 */
export function isLocalPath(url) {
  try {
    // We don't want to redirect cross domain,
    // doing so could create fishing vulnerability
    // If `new URL()` succeeds, it's a fully qualified
    // url which is cross domain. If it fails, it's just
    // a path, which will be the current domain.
    new URL(url);
  } catch (e) {
    return true;
  }

  return false;
}

/**
 * @typedef {{
 *   to: string;
 *   target: string;
 *   isExternal?: boolean;
 * }} EnhancedMenuItemProps
 */
/**
 * @typedef {ChildMenuItemFragment &
 *   EnhancedMenuItemProps} ChildEnhancedMenuItem
 */
/**
 * @typedef {(ParentMenuItemFragment &
 *   EnhancedMenuItemProps) & {
 *   items: ChildEnhancedMenuItem[];
 * }} ParentEnhancedMenuItem
 */
/**
 * @typedef {Pick<MenuFragment, 'id'> & {
 *   items: ParentEnhancedMenuItem[];
 * }} EnhancedMenu
 */

/** @typedef {import('@shopify/hydrogen/storefront-api-types').MoneyV2} MoneyV2 */
/** @typedef {import('@shopify/hydrogen/customer-account-api-types').FulfillmentStatus} FulfillmentStatus */
/** @typedef {import('storefrontapi.generated').ChildMenuItemFragment} ChildMenuItemFragment */
/** @typedef {import('storefrontapi.generated').MenuFragment} MenuFragment */
/** @typedef {import('storefrontapi.generated').ParentMenuItemFragment} ParentMenuItemFragment */
/** @typedef {import('./type').I18nLocale} I18nLocale */

/**
 * Título de página: nombre real de la tienda + sección, en el idioma activo.
 *
 * Las rutas traían el nombre pegado en el `meta` ("PowerB2X | Quotes",
 * "Picafili mayorista | Compra rápida"): en una tienda nueva las pestañas
 * anuncian la marca de otro. El nombre ya viaja en el loader del root.
 *
 * `section` puede ser una clave de i18n ("quick-order.title") o un texto tal
 * cual. Las funciones `meta` de Remix corren fuera de React y no pueden usar
 * `useTranslation`, así que el diccionario se resuelve con la función plana
 * `getLocaleDictionary` — si no, el título de la pestaña quedaba en castellano
 * para un visitante en inglés mientras la página entera se traducía.
 *
 * @param {Array<{data?: any}>} matches el `matches` que Remix pasa a `meta`
 * @param {string} section clave de i18n o texto literal
 */
export function pageTitle(matches, section) {
  const root = matches?.[0]?.data;
  const shopName = root?.header?.shop?.name;

  let label = section;

  if (typeof section === 'string' && section.includes('.')) {
    const dictionary = getLocaleDictionary(root?.i18n?.language?.toLowerCase());
    const resolved = section
      .split('.')
      .reduce((node, key) => (node ? node[key] : undefined), dictionary);
    // Sin traducción se usa el texto tal cual: una clave sin traducir es
    // mejor pestaña que una pestaña vacía.
    if (typeof resolved === 'string') label = resolved;
  }

  return shopName ? `${shopName} | ${label}` : label;
}

/**
 * Ahorro en % contra el precio de lista tachado (E2).
 *
 * Es el guiño de "zona privilegiada" con menos código: no alcanza con mostrar
 * el precio bueno, hay que decir cuánto se ahorra contra el público.
 *
 * Se calcula del dato real de Shopify, **nunca hardcodeado** — es criterio de
 * aceptación de E2. Devuelve null cuando no hay ahorro que mostrar, incluido
 * el caso de `compareAtPrice` por debajo del precio (existe en el catálogo y
 * daría un "ahorro" negativo).
 *
 * Redondea al entero: "−21,7%" en una tarjeta es ruido, no información.
 *
 * @param {{amount?: string|number}} [price]
 * @param {{amount?: string|number}} [compareAtPrice]
 * @returns {number|null}
 */
export function getSavingsPercent(price, compareAtPrice) {
  if (!isDiscounted(price, compareAtPrice)) return null;

  const current = Number(price?.amount);
  const previous = Number(compareAtPrice?.amount);
  const percent = Math.round(((previous - current) / previous) * 100);

  // Un ahorro que redondea a 0% no se anuncia: "−0%" se lee como un error.
  return percent > 0 ? percent : null;
}

/**
 * Nombre de opción de variante, listo para mostrar.
 *
 * Los nombres los escribe el comerciante en el admin y llegan como los cargó:
 * en esta tienda conviven `Color` y `rosa` para lo mismo. En el carrito eso se
 * lee como "rosa: Rosa", que parece un error del sitio.
 *
 * Se normaliza solo para PANTALLA — el dato no se toca, porque es la clave con
 * la que Shopify identifica la variante.
 *
 * @param {string} name
 */
export function formatOptionName(name) {
  const text = String(name ?? '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Fecha larga en el idioma del portal.
 *
 * Existe porque `toDateString()` devuelve "Wed Apr 23 2025" —en inglés
 * siempre, sin importar el idioma ni el país de la tienda— y estaba escrito en
 * dos pantallas distintas. Mes en palabra a propósito: 4/23 y 23/4 son la
 * misma fecha escrita para dos países, y en un historial de pedidos esa
 * ambigüedad se paga preguntando por teléfono.
 *
 * @param {string} value fecha ISO
 * @param {string} [language] `ES`, `EN`, `FR`
 */
export function formatLongDate(value, language) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  try {
    return new Intl.DateTimeFormat(language?.toLowerCase() || 'es', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch (error) {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Cuántas unidades se pueden comprar de una variante, o `null` si no hay tope
 * conocido.
 *
 * Dos fuentes, y se toma la más chica:
 *
 * - `quantityRule.maximum` — el máximo por pedido del catálogo B2B. Es un
 *   límite comercial: "de este producto, hasta 12 por pedido".
 * - `quantityAvailable` — el stock. **Hoy llega siempre `null`**: pedirlo exige
 *   el scope `unauthenticated_read_product_inventory` en el token de
 *   Storefront, y sin él Shopify responde ACCESS_DENIED y ensucia la query
 *   entera, así que el campo ni se pide (E7 del backlog). El día que el scope
 *   exista, esto empieza a funcionar sin tocar una línea.
 *
 * @param {{quantityRule?: {maximum?: number|string}, quantityAvailable?: number|null}|null} variant
 * @returns {number|null}
 */
export function getPurchaseCeiling(variant) {
  const limits = [
    Number(variant?.quantityRule?.maximum) || null,
    Number.isFinite(Number(variant?.quantityAvailable))
      ? Number(variant.quantityAvailable)
      : null,
  ].filter((value) => Number.isFinite(value) && value > 0);

  if (!limits.length) return null;

  return Math.min(...limits);
}
