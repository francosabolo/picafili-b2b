import {Form, useLoaderData} from '@remix-run/react';
import {json} from '@shopify/remix-oxygen';
import {useState} from 'react';
import {BrandMark} from '~/components/Header/Header.jsx';
import {IconCheck} from '~/components/Icon/Icon.jsx';
import {
  B2B_REQUEST_FIELDS,
  B2B_REQUEST_NAMESPACE,
  B2B_REQUESTED_AT_KEY,
} from '~/data/b2b-request.js';
import {B2B_REQUEST_STATUS_QUERY} from '~/graphql/b2b/b2bRequest.js';
import {CUSTOMER_COMPANY_QUERY} from '~/graphql/customer-account/CustomerCompanyQuery.js';
import {useTranslation} from '~/i18n/index.jsx';
import {SALES_CONTACT} from '~/lib/const.js';
import {seoMeta} from '~/lib/seo.js';
import styles from '~/styles/pages/Login.module.scss';
import formStyles from '~/styles/pages/B2BRequest.module.scss';

/**
 * Sala de espera del portal, con dos estados.
 *
 * Sesión válida y todavía sin company. Si **no** pidió acceso, ve el
 * formulario; si ya lo pidió, ve en qué está. Los dos estados viven en la misma
 * ruta a propósito: es la única pantalla a la que el gate manda a alguien sin
 * company, y separarlos obligaría a decidir a cuál mandarlo antes de saber si
 * pidió.
 *
 * El gate (`app/lib/access.server.js`) trae a la gente hasta acá y la saca
 * apenas la company aparece: esta ruta no decide nada.
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
 * ¿Cuándo pidió acceso este cliente? `null` si todavía no pidió.
 *
 * Nunca lanza. Si la Admin API no contesta —token sin permisos, o el
 * placeholder que hay en el `.env` local— se cae a mostrar el formulario. Es el
 * lado seguro: reenviarlo pisa las mismas keys y no duplica nada, mientras que
 * un 500 dejaría sin salida a la única pantalla que esta persona puede ver.
 *
 * @param {import('@shopify/remix-oxygen').AppLoadContext} context
 * @param {string} customerId
 */
async function readRequestedAt(context, customerId) {
  try {
    const response = await context.adminApiClient.request(
      B2B_REQUEST_STATUS_QUERY,
      {
        variables: {
          customerId,
          identifiers: [
            {namespace: B2B_REQUEST_NAMESPACE, key: B2B_REQUESTED_AT_KEY},
          ],
        },
      },
    );

    if (response?.errors) return null;

    const metafields = response?.data?.customer?.metafields ?? [];

    return (
      metafields.find((m) => m?.key === B2B_REQUESTED_AT_KEY)?.value ?? null
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('readRequestedAt:', error);
    return null;
  }
}

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({context}) {
  // Se reusa la query de company en vez de escribir una nueva: lo único que
  // falta acá es el email y el id, y esa query ya los trae.
  const {data} = await context.customerAccount.query(CUSTOMER_COMPANY_QUERY);

  const customerId = data?.customer?.id ?? null;

  return json({
    email: data?.customer?.emailAddress?.emailAddress ?? null,
    requestedAt: customerId ? await readRequestedAt(context, customerId) : null,
    salesEmail: SALES_CONTACT.email,
  });
}

export default function AccountPendingPage() {
  const {email, requestedAt, salesEmail} = useLoaderData();
  const [justSent, setJustSent] = useState(false);

  // El estado se toma del envío recién hecho O del loader: sin lo primero, la
  // persona manda el formulario y se queda mirando el mismo formulario hasta
  // que algo revalide.
  const sent = justSent || Boolean(requestedAt);

  return (
    <div className={styles.layout}>
      <PanelColumn sent={sent} />

      <section className={styles.access}>
        {sent ? (
          <SentCard email={email} salesEmail={salesEmail} />
        ) : (
          <RequestForm email={email} onSent={() => setJustSent(true)} />
        )}
      </section>
    </div>
  );
}

/**
 * Columna de marca. Cambia el discurso según el estado: antes de pedir explica
 * qué hace falta, después explica qué sigue.
 *
 * @param {{sent: boolean}}
 */
function PanelColumn({sent}) {
  const {t} = useTranslation();

  const steps = sent
    ? ['pending.step-review', 'pending.step-catalog', 'pending.step-quotes']
    : [
        'b2b-request.step-data',
        'b2b-request.step-check',
        'b2b-request.step-access',
      ];

  return (
    <section className={styles.panel}>
      <div className={styles.panelInner}>
        <span className={styles.eyebrow}>{t('pending.eyebrow')}</span>
        <h1 className={styles.panelTitle}>
          {t(sent ? 'pending.panel-title' : 'b2b-request.panel-title')}
        </h1>
        <p className={styles.panelBody}>
          {t(sent ? 'pending.panel-body' : 'b2b-request.panel-body')}
        </p>

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
  );
}

/** Los campos que ocupan la fila entera: los que reciben más texto. */
const WIDE_FIELDS = new Set(['razonSocial', 'contacto', 'direccion']);

/**
 * @param {{email: string|null, onSent: () => void}}
 */
function RequestForm({email, onSent}) {
  const {t} = useTranslation();
  const [values, setValues] = useState({});
  const [sending, setSending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);

  /**
   * `fetch` plano y no `useFetcher`, igual que el alta de cotización en
   * `QuoteContext.jsx`.
   *
   * No es preferencia de estilo: con `fetcher.submit`, el 401 que devuelve el
   * gate para `/api/*` no llega como dato sino que **se lleva puesta la página
   * entera al error boundary** — verificado en el navegador: el formulario
   * desaparecía y salía "Algo falló de nuestro lado". El fetcher espera una
   * respuesta con el protocolo de Remix, y la del gate no lo tiene porque corre
   * antes que Remix. Con `fetch` el 401 es un status más y se maneja acá.
   */
  const submit = async (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(event.currentTarget));

    setValues(data);
    setSending(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const response = await fetch('/api/solicitud-acceso', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
      });

      const payload = await response.json().catch(() => null);

      if (response.ok && payload?.ok) {
        onSent();
        return;
      }

      // El endpoint devuelve dos formas distintas de error: un objeto por campo
      // cuando falló la validación, y una lista cuando falló Shopify.
      if (payload?.errors && !Array.isArray(payload.errors)) {
        setFieldErrors(payload.errors);
      } else {
        setFormError(t('b2b-request.error-generic'));
      }
    } catch (error) {
      // Sin red no hay nada que reintentar solo, pero callarse deja un botón
      // que no hace nada.
      setFormError(t('b2b-request.error-generic'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={formStyles.formCard}>
      <div className={styles.cardBrand}>
        <BrandMark />
      </div>

      <h2 className={styles.cardTitle}>{t('b2b-request.card-title')}</h2>
      <p className={styles.cardBody}>{t('b2b-request.card-body')}</p>

      {formError && <p className={formStyles.formError}>{formError}</p>}

      <form method="post" onSubmit={submit} noValidate>
        <fieldset className={formStyles.fields} disabled={sending}>
          {B2B_REQUEST_FIELDS.map((field) => {
            const error = fieldErrors[field.name];

            return (
              <div
                key={field.name}
                className={`${formStyles.field} ${
                  WIDE_FIELDS.has(field.name) ? formStyles.fieldWide : ''
                }`}
              >
                <label className={formStyles.label} htmlFor={field.name}>
                  {t(field.labelKey)}
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  className={`${formStyles.input} ${
                    error ? formStyles.inputInvalid : ''
                  }`}
                  type="text"
                  autoComplete={field.autoComplete}
                  // Lo que se tipeó sobrevive a un envío rechazado. Sin esto,
                  // un CUIT mal puesto vacía los otros siete campos.
                  defaultValue={values[field.name] ?? ''}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${field.name}-error` : undefined}
                />
                {error && (
                  <span
                    className={formStyles.fieldError}
                    id={`${field.name}-error`}
                  >
                    {t(error)}
                  </span>
                )}
              </div>
            );
          })}
        </fieldset>

        <button type="submit" className={formStyles.submit} disabled={sending}>
          {t(sending ? 'b2b-request.sending' : 'b2b-request.submit')}
        </button>
      </form>

      <p className={formStyles.note}>
        {t('b2b-request.note')}
        {email ? ` ${email}.` : ''}
      </p>
    </div>
  );
}

/**
 * @param {{email: string|null, salesEmail: string|null}}
 */
function SentCard({email, salesEmail}) {
  const {t} = useTranslation();

  return (
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
        <p className={styles.noAccountTitle}>{t('pending.contact-title')}</p>
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
  );
}

/** @typedef {import('@remix-run/react').MetaFunction} MetaFunction */
/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
