import {
  Await,
  NavLink,
  useLocation,
  useRouteLoaderData,
} from '@remix-run/react';
import {Suspense, useEffect, useState} from 'react';
import styles from './styles.module.scss';
import {FALLBACK_HEADER_MENU} from '~/graphql/header/menuQueries.js';
import {
  IconAccount,
  IconCaret,
  IconMenu,
  IconSearch,
} from '~/components/Icon/Icon';
import {DownloadButton} from '~/components/DownloadButton/DownloadButton.jsx';
import {PageWidthContainer} from '../PageWidthContainer/PageWidthContainer';
import Quote from '~/components/Quote/Quote.jsx';
import {AnimatedSearchBar} from '~/components/AnimatedSearchBar/AnimatedSearchBar.jsx';
import {useUser} from '~/context/UserContext.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {
  PredictiveSearchForm,
  PredictiveSearchResults,
} from '~/components/Search/Search.jsx';
import {useAccountState} from '~/context/AccountStateContext.jsx';
import {ENABLE_CART} from '~/lib/const.js';
import {IconCart} from '~/components/Icon/Icon.jsx';
/**
 * Marca del storefront: la tienda manda, el sello mayorista firma al lado.
 *
 * Nombre y logo salen de Shopify (`shop.brand.logo`), no de un literal: con
 * "picafili" escrito a mano, una tienda nueva mostraba la marca de otro en el
 * header Y en el footer. Si la tienda no tiene logo cargado en Shopify cae al
 * wordmark tipográfico con su propio nombre, que es lo que veníamos usando.
 *
 * Lee del loader del root en vez de recibir props porque lo usan dos
 * componentes que no comparten árbol de datos (Header y Footer).
 */
export function BrandMark() {
  const {t} = useTranslation();
  const root = useRouteLoaderData('root');
  const shop = root?.header?.shop;
  const logo = shop?.brand?.logo?.image?.url;

  return (
    <span className={styles.brandMark}>
      {logo ? (
        <img
          src={logo}
          alt={shop?.name ?? ''}
          className={styles.brandLogo}
          width="140"
          height="40"
        />
      ) : (
        <span className={styles.brandName}>{shop?.name}</span>
      )}
      <span className={styles.brandDivider} aria-hidden="true" />
      <span className={styles.brandB2b}>{t('general.wholesale')}</span>
    </span>
  );
}

/**
 * @param {HeaderProps}
 */
export function Header({header, cart, publicStoreDomain, user = null}) {
  const {menu} = header;
  const {i18n} = useRouteLoaderData('root');
  const selectedLocale = {prefix: i18n?.pathPrefix, isDefault: i18n?.isDefault};

  // Use the useRootLoaderData hook to get the environment variables
  return (
    <header className={styles.header}>
      <PageWidthContainer className={styles.headerWrapper}>
        <NavLink prefetch="intent" to={`/`} className={styles.logo}>
          <BrandMark />
        </NavLink>
        <HeaderMenu
          menu={menu}
          primaryDomainUrl={header?.shop?.primaryDomain.url}
          selectedLocale={selectedLocale}
        />
        <HeaderMenuMobileToggle />
        <HeaderIcons cart={cart} />
      </PageWidthContainer>
    </header>
  );
}

export function HeaderMenu({menu}) {
  const {pathname} = useLocation();
  const {canOrder} = useAccountState();
  const {t} = useTranslation();

  return (
    <>
      <nav className={styles.desktopMenu} role="navigation">
        <div className={styles.headerLinks}>
          {(menu || FALLBACK_HEADER_MENU).items.map((item) => {
            if (!item.url) return null;

            const url = item.url;

            return (
              <NavLink
                className={
                  styles.headerMenuItem + ' ' + activeStyle(url, pathname)
                }
                key={item.id}
                to={url}
                prefetch="intent"
              >
                {item.title}
              </NavLink>
            );
          })}
          {/* Compra rápida solo tiene sentido con precios habilitados */}
          {canOrder && (
            <NavLink
              className={`${styles.headerMenuItem} ${
                styles.quickOrderLink
              } ${activeStyle('/compra-rapida', pathname)}`}
              to="/compra-rapida"
              prefetch="intent"
            >
              ⚡ {t('general.quick-order')}
            </NavLink>
          )}
          {/* Listas de reposicion (E6): mismo gating que compra rapida. */}
          {canOrder && (
            <NavLink
              className={`${styles.headerMenuItem} ${activeStyle(
                '/listas',
                pathname,
              )}`}
              to="/listas"
              prefetch="intent"
            >
              {t('lists.nav')}
            </NavLink>
          )}
        </div>
      </nav>
    </>
  );
}

export function HelloRender() {
  const {getUserData} = useUser();
  const [user, setUser] = useState(null);
  const {t} = useTranslation();

  useEffect(() => {
    const userData = getUserData();
    setUser(userData);
  }, [getUserData]);

  const textToRender = user ? t('general.hello') : t('general.sign-in');

  if (!user) {
    return (
      <div className={styles.signIn}>
        <span>{textToRender}</span>
        <IconAccount
          className={styles.icon}
          width="22"
          height="24"
          viewBox="0 0 22 24"
        />
      </div>
    );
  }
  const userName = user?.firstName ? `${user?.firstName}!` : ' herlighter!';
  return (
    <span className={styles.userName}>
      {textToRender}
      <strong>{userName}</strong>
    </span>
  );
}

export function MobileAsideContent({
  menu,
  primaryDomainUrl,
  publicStoreDomain,
}) {
  const {t} = useTranslation();
  const {i18n} = useRouteLoaderData('root');
  const {pathname} = useLocation();
  const selectedLocale = {prefix: i18n?.pathPrefix, isDefault: i18n?.isDefault};

  return (
    <div className={styles.mobileMenu} role="navigation">
      <div className={styles.menuMobileHeading}>
        <NavLink
          prefetch="intent"
          to="/account"
          className={activeStyle('/account', pathname)}
          reloadDocument
        >
          <HelloRender />
        </NavLink>
      </div>
      <div className={styles.mobileLinks}>
        {(menu || FALLBACK_HEADER_MENU).items.map((item) => {
          if (!item.url) return null;

          const url = item?.url;

          return (
            <NavLink
              className={
                styles.headerMenuItem + ' ' + activeStyle(url, pathname)
              }
              key={item.id}
              to={url}
              prefetch="intent"
              reloadDocument
            >
              {item.title}
              <IconCaret direction={'left'} viewBox={'0 0 20 15'} />
            </NavLink>
          );
        })}
        <DownloadButton
          className={styles.headerDownloadButton}
          buttonText={t('general.download-catalog')}
          buttonURL={
            selectedLocale?.isDefault
              ? '/pages/catalog'
              : selectedLocale?.prefix + '/pages/catalog'
          }
          openInNewTab={false}
        />
      </div>
      <MenuMobileFooter />
    </div>
  );
}

function MenuMobileFooter() {
  const {t} = useTranslation();
  return (
    <div className={styles.menuMobileFooter}>
      <div className={styles.menuMobileSearchBarWrapper}>
        <PredictiveSearchResults className={styles.predictiveSearchResults} />
        <PredictiveSearchForm className={styles.predictiveSearchForm}>
          {({fetchResults, inputRef}) => (
            <div className={styles.searchBar}>
              <input
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder={t('general.search')}
                ref={inputRef}
                type="search"
              />
              <IconSearch
                className={styles.icon}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                onClick={() => {
                  window.location.href = inputRef?.current?.value
                    ? `/search?q=${inputRef.current.value}`
                    : `/search`;
                }}
              />
            </div>
          )}
        </PredictiveSearchForm>
      </div>
    </div>
  );
}

function HeaderIcons({cart}) {
  const {pathname} = useLocation();

  return (
    <nav className={styles.headerIcons} role="navigation">
      <AnimatedSearchBar className={styles.searchIcon} />
      {/* Carrito de compra directa. Convive con el presupuesto solo si la
          tienda lo habilita: ver ENABLE_CART en app/lib/const.js. */}
      {ENABLE_CART && <CartLink cart={cart} />}
      <Quote />
      <NavLink
        className={styles.accountIcon + ' ' + activeStyle('/account', pathname)}
        prefetch="intent"
        to="/account"
      >
        <Suspense
          fallback={
            <IconAccount
              className={styles.icon}
              width="22"
              height="24"
              viewBox="0 0 22 24"
            />
          }
        ></Suspense>
        <HelloRender />
      </NavLink>
    </nav>
  );
}

/**
 * Acceso al carrito con el contador de items.
 *
 * El contador se resuelve dentro de un <Suspense> porque el carrito viene
 * diferido del loader del root: sin esto, el header espera al carrito para
 * pintarse y se retrasa toda la barra.
 */
function CartLink({cart}) {
  const {t} = useTranslation();

  return (
    <a
      href="#cart-aside"
      className={styles.cartLink}
      aria-label={t('cart.open')}
    >
      <Suspense fallback={<IconCart count={0} styles={styles} />}>
        <Await
          resolve={cart}
          errorElement={<IconCart count={0} styles={styles} />}
        >
          {(resolved) => (
            <IconCart count={resolved?.totalQuantity ?? 0} styles={styles} />
          )}
        </Await>
      </Suspense>
    </a>
  );
}

function HeaderMenuMobileToggle() {
  return (
    <a className={styles.headerMenuMobileToggle} href="#mobile-menu-aside">
      <IconMenu fill="none" viewBox="0 0 18 16" stroke="none" />
    </a>
  );
}

/**
 * Devuelve la clase `active` cuando el link corresponde a la ruta actual.
 * Función pura: el `pathname` lo pide el componente con useLocation() una sola
 * vez, en vez de llamar al hook dentro de un map (violaba rules-of-hooks).
 * @param {string} linkUrl
 * @param {string} pathname
 */
function activeStyle(linkUrl, pathname) {
  return linkUrl.includes(pathname) ? styles.active : '';
}

/** @typedef {Pick<LayoutProps, 'header' | 'cart' | 'isLoggedIn'>} HeaderProps */
/** @typedef {import('../../../storefrontapi.generated.js').HeaderQuery} HeaderQuery */
/** @typedef {import('~/components/PageLayout/Layout.jsx').LayoutProps} LayoutProps */
/** @typedef {import('../Layout/Layout.jsx').LayoutProps} LayoutProps */
