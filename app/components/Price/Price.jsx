import {useLocale} from '~/i18n/index.jsx';
import {STORE_CURRENCY} from '~/lib/const.js';

/**
 * Formateador de importes según el idioma activo del storefront.
 *
 * Existe aparte del componente porque varios textos llevan el precio DENTRO de
 * la oración ("te faltan $X", "cada unidad te sale $Y"): con `<Price>` había
 * que partir la frase en pedazos alrededor del componente, y una frase partida
 * no se puede traducir — el orden de las palabras cambia por idioma. Con el
 * formateador el precio entra como interpolación y la frase queda entera.
 *
 * @returns {(data?: {amount?: string|number, currencyCode?: string},
 *   opts?: {withoutTrailingZeros?: boolean}) => string|null}
 */
export function useFormatPrice() {
  const i18n = useLocale();

  return function formatPrice(data, {withoutTrailingZeros = false} = {}) {
    const amount = Number(data?.amount);

    if (!data || Number.isNaN(amount)) return null;

    const currency = data.currencyCode || i18n?.currency || STORE_CURRENCY;
    const hasCents = Math.round(amount * 100) % 100 !== 0;
    const fractionDigits = withoutTrailingZeros && !hasCents ? 0 : 2;

    // `es` + país de la tienda: el idioma decide los separadores y el país el
    // formato regional. Intl ignora la región que no conoce, así que un locale
    // mal armado degrada al idioma en vez de romper.
    const locale = `${(i18n?.language || 'es').toLowerCase()}-${
      i18n?.country || 'AR'
    }`;

    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);

    // Intl mete un espacio duro entre código y número; se normaliza para que
    // el wrapping no parta el importe en dos líneas de forma rara.
    return formatted.replace(/ /g, ' ');
  };
}

/**
 * Precio formateado según el idioma activo del storefront.
 *
 * Reemplaza al `<Money>` de Hydrogen, que sin `ShopifyProvider` cae al locale
 * por defecto y formateaba "ARS 638,400" — separadores al revés para una
 * tienda argentina. Se mantiene el código de moneda visible (`ARS 638.400`)
 * en vez del símbolo: en B2B la ambigüedad de moneda cuesta plata.
 *
 * @param {{data?: {amount?: string|number, currencyCode?: string},
 *   className?: string, withoutTrailingZeros?: boolean, as?: string}}
 */
export function Price({
  data,
  className,
  withoutTrailingZeros = false,
  as: Tag = 'span',
}) {
  const formatPrice = useFormatPrice();
  const formatted = formatPrice(data, {withoutTrailingZeros});

  if (formatted === null) return null;

  return <Tag className={className}>{formatted}</Tag>;
}
