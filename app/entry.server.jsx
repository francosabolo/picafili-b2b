import {RemixServer} from '@remix-run/react';
import isbot from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {createContentSecurityPolicy} from '@shopify/hydrogen';

/**
 * @param {Request} request
 * @param {number} responseStatusCode
 * @param {Headers} responseHeaders
 * @param {EntryContext} remixContext
 * @param {AppLoadContext} context
 */
export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
  context,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    defaultSrc: [
      "'self'",
      'https://newassets.hcaptcha.com',
      'https://google-analytics.com',
      'https://messaging-api.shopifyapps.com/shopify_chat/',
    ],
    styleSrc: [
      "'self'",
      'https://cdn.shopify.com',
      'https://googletagmanager.com',
      'https://tagmanager.google.com',
      'https://fonts.googleapis.com',
      'https://www.googletagmanager.com/debug/badge.css',
    ],
    fontSrc: ["'self'", 'https://cdn.shopify.com', 'https://fonts.gstatic.com'],
    imgSrc: [
      "'self'",
      'https://cdn.shopify.com',
      'https://googletagmanager.com',
      'https://ssl.gstatic.com',
      'https://www.gstatic.com',
      'https://www.googletagmanager.com/a',
      'https://www.dropbox.com',
      'https://dl.dropboxusercontent.com',
    ],
    scriptSrc: [
      "'self'",
      // "'unsafe-inline'",
      'https://js.hcaptcha.com',
      'https://cdn.shopify.com',
      'https://tagmanager.google.com',
      'https://*.googletagmanager.com',
      'https://googletagmanager.com',
    ],
    connectSrc: [
      "'self'",
      'https://newassets.hcaptcha.com',
      'https://www.google-analytics.com',
      'https://*.google-analytics.com',
      // El comodín NO cubre el apex: GA4 postea a analytics.google.com y a
      // www.google.com/g/collect, y ambos quedaban bloqueados por CSP.
      'https://analytics.google.com',
      'https://*.analytics.google.com',
      'https://www.google.com',
      'https://*.googletagmanager.com',
      'https://monorail-edge.shopifysvc.com',
      'https://otlp-http-production.shopifysvc.com',
      'https://error-analytics-production.shopifysvc.com',
      'www.googletagmanager.com',
      'https://messaging-api.shopifyapps.com/shopify_chat/',
      'cdn.shopify.com',
      'monorail-edge',
      'monorail-edge',
      'https://otlp-http-production.shopifysvc.com/v1/metrics',
      'https://monorail-edge.shopifysvc.com',
      'shopify-chat.shopifyapps.com',
      'https://notify.bugsnag.com',
      'messaging-api',
      'pusher.com',
      '*.pusher.com',
      '*.hcaptcha.com/',
      'hcaptcha.com',
      '*.hcaptcha.com',
      'https://www.google-analytics.com',
      'https://www.google-analytics.com/g/collect',
      'https://error-analytics-production.shopifysvc.com',
      'https://messaging-api.shopifyapps.com/shopify_chat/api/storefront/shop',
    ],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <RemixServer context={remixContext} url={request.url} />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        // eslint-disable-next-line no-console
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

/** @typedef {import('@shopify/remix-oxygen').EntryContext} EntryContext */
/** @typedef {import('@shopify/remix-oxygen').AppLoadContext} AppLoadContext */
