import {Price} from '~/components/Price/Price.jsx';
import styles from '~/components/Quote/styles.module.scss';
import {IconQuote} from '~/components/Icon/Icon.jsx';
import {useQuote} from '~/context/QuoteContext.jsx';
import QuoteAside from '~/components/QuoteAside/QuoteAside.jsx';
import {Aside} from '~/components/Aside/Aside.jsx';
import {useState, useRef, useEffect} from 'react';
import {Link} from '@remix-run/react';
import {useTranslation} from '~/i18n/index.jsx';
import {useUser} from '~/context/UserContext.jsx';
import {IconHelp} from '../Icon/Icon';
import {MinimumOrderNotice} from '~/components/Quote/MinimumOrderNotice.jsx';
import {useAccountState} from '~/context/AccountStateContext.jsx';

const Quote = () => {
  const {quoteQty, quoteTotal} = useQuote();
  const {canOrder} = useAccountState();
  const {getUserData} = useUser();
  const {t} = useTranslation();
  const [user, setUser] = useState(null);

  const byPassRequestedLogin = true;

  useEffect(() => {
    const user = getUserData();
    setUser(user);
  }, [getUserData()]);

  if (!user && !byPassRequestedLogin) {
    return <QuoteTooltip loggedIn={false} />;
  }

  // if user is logged and not active, show tooltip
  if (!user?.tags?.includes('active') && !byPassRequestedLogin) {
    return <QuoteTooltip loggedIn={true} />;
  }

  // Sin permiso de pedir no hay nota de pedido. Sin este guard, un usuario
  // pendiente de aprobación seguía viendo el total y los precios en la barra
  // inferior — una fuga del gating por la puerta de atrás.
  if (!canOrder) return null;

  const asideID = 'quote-aside';

  return (
    <div>
      <a href="#quote-aside" className={styles.quoteIcon}>
        <IconQuote viewBox="0 0 28 28" />
        <span className={styles.quoteIconQty}>{quoteQty}</span>
      </a>
      <Aside
        id={asideID}
        heading={quoteQty > 0 ? t('general.your_quote') : null}
      >
        <QuoteAside id={asideID} />
      </Aside>
      {quoteQty > 0 && (
        <div className={styles.bottomBar}>
          {/* Contenedor alineado al del header: la barra ocupa todo el ancho,
              el contenido respeta la grilla de la página. */}
          <div className={styles.bottomBarInner}>
            <div className={styles.summary}>
              {/* Plural por clave y no concatenando una "s": en frances el
                  singular es "1 article" pero el plural cambia la palabra en
                  otros idiomas, y concatenar solo funciona en es/en. */}
              <span className={styles.text}>
                {t(
                  quoteQty === 1
                    ? 'quoting.articles-one'
                    : 'quoting.articles-many',
                  {count: quoteQty},
                )}
              </span>
              {quoteTotal && (
                <span className={styles.total}>
                  <Price data={quoteTotal} withoutTrailingZeros />
                </span>
              )}
            </div>
            <MinimumOrderNotice total={quoteTotal} compact />
            {/* La barra lleva a la PANTALLA de presupuesto, no al drawer:
                revisar 20 lineas con su desglose de descuentos no entra en un
                panel de 375px. El drawer queda para el vistazo rapido. */}
            <Link to="/presupuesto" className={styles.cta}>
              {t('quote-page.review')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quote;

export function QuoteTooltip({loggedIn}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);
  const {t} = useTranslation();
  const buttonCTA = loggedIn
    ? t('general.not-active-user')
    : t('general.sign-in');

  const tooltipMsg = loggedIn ? (
    <>
      <a href="/account">{t('general.not-active-user-msg')}</a>
    </>
  ) : (
    t('general.sign-in-to-quote')
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setShowTooltip(false);
      }
    }

    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div>
      <div className={styles.containerQuoteLogin}>
        <a
          href="#quote-aside"
          onClick={() => setShowTooltip(!showTooltip)}
          className={styles.quoteIcon}
        >
          <IconQuote />
        </a>
        {showTooltip && (
          <div
            className={`${styles.tooltipLogin} ${
              loggedIn ? styles.tooltipInactiveUser : ''
            }`}
            ref={tooltipRef}
          >
            <IconHelp className={styles.iconHelp} />
            <div className={styles.loginCaption}>{tooltipMsg}</div>

            {!loggedIn && (
              <div>
                <a className={styles.loginCta} href="/account">
                  {buttonCTA}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
