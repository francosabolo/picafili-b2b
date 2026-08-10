import {Form, useLoaderData} from '@remix-run/react';
import {json} from '@shopify/remix-oxygen';
import {BrandMark} from '~/components/Header/Header.jsx';
import {IconCheck} from '~/components/Icon/Icon.jsx';
import {CUSTOMER_COMPANY_QUERY} from '~/graphql/customer-account/CustomerCompanyQuery.js';
import {useTranslation} from '~/i18n/index.jsx';
import {SALES_CONTACT} from '~/lib/const.js';
import {seoMeta} from '~/lib/seo.js';
import styles from '~/styles/pages/Login.module.scss';

/**
 * Sala de espera del portal: sesión válida, todavía sin company asignada.
 *
 * Existe porque `REQUIRE_B2B_COMPANY` genera un tercer estado que antes no
 * había —ni invitado ni cliente— y sin una pantalla propia ese estado se veía
 * como un bucle de redirects o un catálogo vacío. Acá se dice qué pasó, qué
 * falta y con quién hablar.
 *
 * El gate (`app/lib/access.server.js`) es quien trae a la gente hasta acá, y
 * también quien la saca apenas la company aparece: esta ruta no decide nada.
 *
 * @type {MetaFunction}
 */
export const meta = ({matches, location}) => {
  return seoMeta({
    matches,
    location,
    title: 'pending.title',
    description: 'pending.panel-body',
    // Una pantalla de espera detrás de un login no tiene por qué estar en
    // ningún índice.
    noIndex: true,
  });
};

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({context}) {
  // Se reusa la query de company en vez de escribir una nueva: lo único que
  // falta acá es el email, y esa query ya lo trae. Un documento más sería un
  // documento más que mantener sincronizado.
  const {data} = await context.customerAccount.query(CUSTOMER_COMPANY_QUERY);

  return json({
    email: data?.customer?.emailAddress?.emailAddress ?? null,
    salesEmail: SALES_CONTACT.email,
  });
}

export default function AccountPendingPage() {
  const {t} = useTranslation();
  const {email, salesEmail} = useLoaderData();

  const steps = [
    'pending.step-review',
    'pending.step-catalog',
    'pending.step-quotes',
  ];

  return (
    <div className={styles.layout}>
      <section className={styles.panel}>
        <div className={styles.panelInner}>
          <span className={styles.eyebrow}>{t('pending.eyebrow')}</span>
          <h1 className={styles.panelTitle}>{t('pending.panel-title')}</h1>
          <p className={styles.panelBody}>{t('pending.panel-body')}</p>

          <ul className={styles.benefits}>
            {steps.map((key) => (
              <li key={key} className={styles.benefit}>
                <IconCheck className={styles.benefitIcon} />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.access}>
        <div className={styles.card}>
          <div className={styles.cardBrand}>
            <BrandMark />
          </div>

          <h2 className={styles.cardTitle}>{t('pending.card-title')}</h2>
          <p className={styles.cardBody}>{t('pending.card-body')}</p>

          {/* El email confirma CON QUÉ cuenta entró. Es el dato que el equipo
              comercial va a pedir por teléfono, y sin mostrarlo el comprador
              tiene que adivinar cuál de sus mails usó. */}
          {email && (
            <p className={styles.noAccountBody}>
              {t('pending.signed-in-as')} <strong>{email}</strong>
            </p>
          )}

          <hr className={styles.divider} />

          <div className={styles.noAccount}>
            <p className={styles.noAccountTitle}>
              {t('pending.contact-title')}
            </p>
            <p className={styles.noAccountBody}>{t('pending.contact-body')}</p>
            {/* Sin email configurado no se renderiza un `mailto:` roto: el
                contacto sale de SALES_CONTACT y puede faltar. */}
            {salesEmail && (
              <a className={styles.noAccountCta} href={`mailto:${salesEmail}`}>
                {salesEmail}
              </a>
            )}
          </div>

          {/* Form y no fetcher: cerrar sesión tiene que funcionar aunque la
              hidratación no haya entrado — es la única salida de esta
              pantalla para quien entró con la cuenta equivocada. */}
          <Form method="post" action="/account/logout">
            <button type="submit" className={styles.back}>
              {t('pending.logout')}
            </button>
          </Form>
        </div>
      </section>
    </div>
  );
}

/** @typedef {import('@remix-run/react').MetaFunction} MetaFunction */
/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
