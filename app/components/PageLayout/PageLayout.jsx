import {Await, useNavigation} from '@remix-run/react';
import {ENABLE_CART} from '~/lib/const.js';
import {Suspense} from 'react';
import {Aside} from '~/components/Aside/Aside.jsx';
import {Footer} from '~/components/Footer/Footer.jsx';
import {Header, MobileAsideContent} from '~/components/Header/Header.jsx';
import {CartMain} from '~/components/Cart/Cart.jsx';
import {
  PredictiveSearchForm,
  PredictiveSearchResults,
} from '~/components/Search/Search.jsx';
import {QuoteProvider} from '~/context/QuoteContext.jsx';
import Loader from '~/components/Loader/Loader.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {ConsultListProvider} from '../../context/ConsutListContext';
import {AccountStateProvider} from '~/context/AccountStateContext.jsx';
import {ToastProvider} from '~/context/ToastContext.jsx';
import {CartLinesProvider, CartLinesSync} from '~/context/CartLinesContext.jsx';
import {Toaster} from '~/components/Toast/Toast.jsx';
import {DiscountContextProvider} from '~/context/DiscountContext.jsx';
import {
  AccountStateBar,
  SalesRepBar,
} from '~/components/AccountState/AccountStateBar.jsx';
import {AccountStateBanner} from '~/components/AccountState/AccountStateBanner.jsx';

/**
 * @param {LayoutProps}
 */
export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  publicStoreDomain,
  demoAccountState,
  quoteSummary,
  b2b,
  loggedIn,
  discountContext,
}) {
  const navigation = useNavigation();

  // El loader se DERIVA del estado de navegacion. Antes era estado propio y un
  // setTimeout lo apagaba **1 segundo despues de que la navegacion ya habia
  // terminado**: un segundo entero de loader sobre una pagina que ya estaba
  // lista, en cada click. Ademas el timer no se limpiaba, asi que dos
  // navegaciones seguidas dejaban temporizadores pisandose.
  const isLoading =
    navigation.state === 'loading' && navigation.location?.key !== 'default';

  return (
    <>
      {isLoading && <LoaderWrapper isLoading={isLoading} />}
      <AccountStateProvider
        initialState={demoAccountState}
        b2b={b2b}
        loggedIn={loggedIn}
      >
        <ToastProvider>
          <CartLinesProvider>
            <DiscountContextProvider value={discountContext}>
              <ConsultListProvider>
                <QuoteProvider
                  initialSummary={quoteSummary}
                  discountContext={discountContext}
                >
                  {/* En false no se renderiza: ver ENABLE_CART en app/lib/const.js */}
                  {ENABLE_CART && <CartAside cart={cart} />}
                  <SearchAside />
                  <MobileMenuAside menu={header?.menu} shop={header?.shop} />
                  <AccountStateBar />
                  {header && (
                    <Header
                      header={header}
                      cart={cart}
                      publicStoreDomain={publicStoreDomain}
                    />
                  )}
                  <SalesRepBar />
                  <main>
                    <AccountStateBanner />
                    {children}
                  </main>
                  <Toaster />
                  <Suspense>
                    <Await resolve={footer}>
                      {(footer) => (
                        <Footer menu={footer?.menu} shop={header?.shop} />
                      )}
                    </Await>
                  </Suspense>
                </QuoteProvider>
              </ConsultListProvider>
            </DiscountContextProvider>
          </CartLinesProvider>
        </ToastProvider>
      </AccountStateProvider>
    </>
  );
}

function LoaderWrapper(isLoading) {
  return isLoading ? <Loader /> : null;
}

/**
 * @param {{cart: LayoutProps['cart']}}
 */
function CartAside({cart}) {
  const {t} = useTranslation();

  return (
    <Aside id="cart-aside" heading={t('cart.title')}>
      <Suspense fallback={<p>{t('general.loading')}</p>}>
        <Await resolve={cart}>
          {(cart) => (
            <>
              {/* Empuja el carrito resuelto al contexto para que los botones
                  de "agregar" de todo el sitio sepan que hay adentro. Va aca
                  porque este `Await` ya existe: envolver el layout entero
                  costaria el streaming. */}
              <CartLinesSync cart={cart} />
              <CartMain cart={cart} layout="aside" />
            </>
          )}
        </Await>
      </Suspense>
    </Aside>
  );
}

function SearchAside() {
  const {t} = useTranslation();
  return (
    <Aside id="search-aside" heading={t('general.search')}>
      <div className="predictive-search">
        <br />
        <PredictiveSearchForm>
          {({fetchResults, inputRef}) => (
            <div>
              <input
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder={t('general.search')}
                ref={inputRef}
                type="search"
              />
              &nbsp;
              <button
                onClick={() => {
                  window.location.href = inputRef?.current?.value
                    ? `/search?q=${inputRef.current.value}`
                    : `/search`;
                }}
              >
                {t('general.search')}
              </button>
            </div>
          )}
        </PredictiveSearchForm>
        <PredictiveSearchResults />
      </div>
    </Aside>
  );
}

/**
 * @param {{
 *   menu: HeaderQuery['menu'];
 *   shop: HeaderQuery['shop'];
 * }}
 */
function MobileMenuAside({menu, shop}) {
  return (
    menu &&
    shop?.primaryDomain?.url && (
      <Aside id="mobile-menu-aside">
        <MobileAsideContent
          menu={menu}
          primaryDomainUrl={shop.primaryDomain.url}
        />
      </Aside>
    )
  );
}

/**
 * @typedef {{
 *   cart: Promise<CartApiQueryFragment | null>;
 *   children?: React.ReactNode;
 *   footer: Promise<FooterQuery>;
 *   header: HeaderQuery;
 * }} LayoutProps
 */

/** @typedef {import('../../../storefrontapi.generated.js').CartApiQueryFragment} CartApiQueryFragment */
/** @typedef {import('../../../storefrontapi.generated.js').FooterQuery} FooterQuery */
/** @typedef {import('../../../storefrontapi.generated.js').HeaderQuery} HeaderQuery */
