import {Link, useLoaderData} from '@remix-run/react';
import {json, redirect} from '@shopify/remix-oxygen';
import {BrandMark} from '~/components/Header/Header.jsx';
import {IconCheck} from '~/components/Icon/Icon.jsx';
import {useTranslation} from '~/i18n/index.jsx';
import {seoMeta} from '~/lib/seo.js';
import styles from '~/styles/pages/Login.module.scss';

/**
 * Sin cromo: ni barra de estado, ni header, ni banner de cuenta, ni pie. Lo
 * lee `PageLayout`. Esta ruta es una puerta —el visitante todavía no puede
 * navegar a ningún lado— y el header ofrecía justamente lo que acá está
 * cerrado.
 */
export const handle = {bodyClass: 'login', bareLayout: true};

/**
 * Puerta de entrada al portal mayorista — la pantalla "intranet".
 *
 * NO es un formulario de usuario y contraseña, y no puede serlo: con Customer
 * Account API las credenciales las pide **Shopify** en su propia pantalla
 * (email + código de un solo uso). El storefront nunca las ve, que es
 * justamente lo que hace que no haya contraseñas nuestras que filtrar. Esta
 * ruta es la antesala que explica qué hay adentro y arranca ese flujo; el
 * botón lleva a `/account/login`, que es un loader que redirige a Shopify.
 *
 * Existe aparte de `/account/login` a propósito: esa ruta tiene que seguir
 * siendo un redirect puro porque es a donde vuelven los links de "iniciar
 * sesión" repartidos por el sitio y el propio ciclo de OAuth.
 *
 * @type {MetaFunction}
 */
export const meta = ({matches, location}) => {
  return seoMeta({
    matches,
    location,
    title: 'login.title',
    description: 'login.panel-body',
  });
};

/**
 * Esta ruta es de las poquísimas públicas, así que tiene que saber qué hacer
 * con alguien que **ya** tiene sesión: mostrarle "ingresá al portal" a quien
 * ya ingresó es un callejón sin salida. Se lo manda a la home y que el gate
 * decida —portal o pantalla de espera—, para no duplicar acá esa regla.
 *
 * @param {LoaderFunctionArgs}
 */
export async function loader({request, context}) {
  const prefix = context.storefront.i18n.pathPrefix ?? '';

  if (await context.customerAccount.isLoggedIn()) {
    return redirect(`${prefix}/`);
  }

  // Lo puso el gate al rebotar la request. Viaja hasta el botón para que quien
  // entró por un link a un producto vuelva a ese producto después del login.
  const returnTo = new URL(request.url).searchParams.get('return_to');

  return json({returnTo});
}

export default function LoginPage() {
  const {t} = useTranslation();
  const {returnTo} = useLoaderData();

  const loginUrl = returnTo
    ? `/account/login?return_to=${encodeURIComponent(returnTo)}`
    : '/account/login';

  const benefits = [
    'login.benefit-prices',
    'login.benefit-quotes',
    'login.benefit-history',
  ];

  return (
    <div className={styles.layout}>
      {/* Columna de marca. En mobile se apila arriba y se achica: a 390px el
          panel completo empujaba el botón de ingresar fuera de la pantalla. */}
      <section className={styles.panel}>
        <div className={styles.panelInner}>
          <span className={styles.eyebrow}>{t('login.eyebrow')}</span>
          <h1 className={styles.panelTitle}>{t('login.panel-title')}</h1>
          <p className={styles.panelBody}>{t('login.panel-body')}</p>

          <ul className={styles.benefits}>
            {benefits.map((key) => (
              <li key={key} className={styles.benefit}>
                <IconCheck className={styles.benefitIcon} />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Columna de acceso. */}
      <section className={styles.access}>
        <div className={styles.card}>
          <div className={styles.cardBrand}>
            <BrandMark />
          </div>

          <h2 className={styles.cardTitle}>{t('login.card-title')}</h2>
          <p className={styles.cardBody}>{t('login.card-body')}</p>

          {/* Link y no <button>: el flujo lo arranca una navegación del
              servidor, no JS del cliente. Así funciona aunque la hidratación
              todavía no haya entrado. */}
          <Link to={loginUrl} className={styles.cta}>
            {t('login.cta')}
          </Link>

          <hr className={styles.divider} />

          <div className={styles.noAccount}>
            <p className={styles.noAccountTitle}>
              {t('login.no-account-title')}
            </p>
            <p className={styles.noAccountBody}>{t('login.no-account-body')}</p>
            <a className={styles.noAccountCta} href="/pages/contact">
              {t('login.no-account-cta')}
            </a>
          </div>

          <Link to="/" className={styles.back}>
            {t('login.back')}
          </Link>
        </div>
      </section>
    </div>
  );
}

/** @typedef {import('@remix-run/react').MetaFunction} MetaFunction */
/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
