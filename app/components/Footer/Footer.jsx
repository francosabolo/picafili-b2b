import {NavLink} from '@remix-run/react';
import {useRootLoaderData} from '~/lib/root-data.js';
import styles from './styles.module.scss';
import {Text} from '../Text/Text';
import logoWhite from '~/assets/pb2x-white.png';
import {BrandMark} from '~/components/Header/Header.jsx';
import {FooterInfo} from './FooterInfo.jsx';
import {useTranslation} from '~/i18n/index.jsx';

/**
 * @param {FooterQuery & {shop: HeaderQuery['shop']}}
 */
export function Footer({menu, shop}) {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.footerWrapper}`}>
        {/* La bajada sale de Shopify (shop.description). Antes esto era un
            array con el mail de Picafili escrito a mano dentro del componente:
            el caso exacto que AGENTS.md llama bug de plantilla. El contacto
            ahora vive en SALES_CONTACT y se muestra en su propia columna. */}
        <FooterDescription
          className={styles.footerDescription}
          content={shop?.description ? [shop.description] : []}
        ></FooterDescription>
        <FooterInfo />
        {menu && shop?.primaryDomain?.url && (
          <FooterMenuList
            menu={menu}
            primaryDomainUrl={shop.primaryDomain.url}
          />
        )}
      </div>
      <div className={`${styles.footerFooter} `}>
        <div className={`${styles.sign} `}>
          <a
            href="https://powerb2x.com"
            target="_blank"
            rel="noreferrer noopener"
          >
            <span>empowered by</span>
            <img src={logoWhite} alt="PowerB2x Logo" />
          </a>
        </div>
      </div>
    </footer>
  );
}

/**
 * @param {{
 *   menu: FooterQuery['menu'];
 *   primaryDomainUrl: HeaderQuery['shop']['primaryDomain']['url'];
 * }}
 */
function FooterDescription({className, content}) {
  const {publicStoreDomain} = useRootLoaderData();

  return (
    <div className={className}>
      <NavLink
        prefetch="intent"
        to={`https://${publicStoreDomain}`}
        className={styles.logo}
      >
        <BrandMark />
      </NavLink>
      <div className={styles.descriptionContainer}>
        {content.map((item, index) => {
          return (
            <Text
              className={styles.descriptionParagraph}
              id={styles[`descriptionParagraph--${index}`]}
              key={`descriptionParagraph--${index}`}
            >
              {item}
            </Text>
          );
        })}
      </div>
    </div>
  );
}

function SubMenuList({list, ListName, publicDomain, primaryDomain, id}) {
  return (
    <div className={`${styles.footerMenuWrapper} `} id={id}>
      <Text className={styles.title}>{ListName}</Text>
      <nav className="footerMenu submenu" role="navigation">
        {list.map((item, i) => {
          if (!item.url) return null;

          // if the url is internal, we strip the domain
          const url =
            item.url.includes('myshopify.com') ||
            item.url.includes(publicDomain) ||
            item.url.includes(primaryDomain)
              ? new URL(item.url).pathname
              : item.url;
          const isExternal = !url.startsWith('/');

          return (
            <div className={styles.footerMenuItem} key={'submenuItem--' + i}>
              {isExternal ? (
                <a
                  href={url}
                  key={'item--' + i}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {item.title}
                </a>
              ) : (
                <NavLink end key={'item--' + i} prefetch="intent" to={url}>
                  {item.title}
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

function FooterMenuList({menu, primaryDomainUrl}) {
  const {publicStoreDomain} = useRootLoaderData();
  const {t} = useTranslation();

  const items = (menu || FALLBACK_FOOTER_MENU).items.filter((item) => item.url);

  // Los items SUELTOS del menu de Shopify van juntos en una columna, no uno por
  // columna. Antes cada uno era su propia columna del flex: con las politicas
  // de la tienda (privacidad, reembolso, terminos, marcas...) eran seis
  // columnas de una linea cada una, y sumadas a las de informacion se pasaban
  // del ancho de la pantalla — el pie se cortaba a la derecha.
  const groups = items.filter((item) => item.items?.length > 0);
  const loose = items.filter((item) => !item.items?.length);

  return (
    <>
      {groups.map((item, i) => (
        <SubMenuList
          ListName={item.title}
          list={item.items}
          publicDomain={publicStoreDomain}
          primaryDomain={primaryDomainUrl}
          key={'submenu--' + i}
        ></SubMenuList>
      ))}
      {loose.length > 0 && (
        <SubMenuList
          ListName={t('footer.links.title')}
          list={loose}
          publicDomain={publicStoreDomain}
          primaryDomain={primaryDomainUrl}
        ></SubMenuList>
      )}
    </>
  );
}

const FALLBACK_FOOTER_MENU = {
  id: 'gid://shopify/Menu/199655620664',
  items: [
    {
      id: 'gid://shopify/MenuItem/461633060920',
      resourceId: 'gid://shopify/ShopPolicy/23358046264',
      tags: [],
      title: 'Privacy Policy',
      type: 'SHOP_POLICY',
      url: '/policies/privacy-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633093688',
      resourceId: 'gid://shopify/ShopPolicy/23358013496',
      tags: [],
      title: 'Refund Policy',
      type: 'SHOP_POLICY',
      url: '/policies/refund-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633126456',
      resourceId: 'gid://shopify/ShopPolicy/23358111800',
      tags: [],
      title: 'Shipping Policy',
      type: 'SHOP_POLICY',
      url: '/policies/shipping-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633159224',
      resourceId: 'gid://shopify/ShopPolicy/23358079032',
      tags: [],
      title: 'Terms of Service',
      type: 'SHOP_POLICY',
      url: '/policies/terms-of-service',
      items: [],
    },
  ],
};

/**
 * @param {{
 *   isActive: boolean;
 *   isPending: boolean;
 * }}
 */
function activeLinkStyle({isActive, isPending}) {
  return {
    textDecoration: isActive ? 'underline' : undefined,
    color: isPending ? 'grey' : 'var(--color-grey-dark)',
  };
}

/** @typedef {import('../../../storefrontapi.generated.js').FooterQuery} FooterQuery */
/** @typedef {import('../../../storefrontapi.generated.js').HeaderQuery} HeaderQuery */
