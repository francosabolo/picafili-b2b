// @ts-ignore
// Virtual entry point for the app
import * as remixBuild from 'virtual:remix/server-build';
import {storefrontRedirect} from '@shopify/hydrogen';
import {createRequestHandler} from '@shopify/remix-oxygen';
import {createAppLoadContext} from '~/lib/context';
import {checkAccess} from '~/lib/access.server';

/**
 * Export a fetch handler in module format.
 */
export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @param {ExecutionContext} executionContext
   * @return {Promise<Response>}
   */
  async fetch(request, env, executionContext) {
    try {
      const appLoadContext = await createAppLoadContext(
        request,
        env,
        executionContext,
      );

      /**
       * Portal cerrado: el gate de acceso corre ANTES que Remix.
       *
       * Acá y no en los loaders para que una ruta nueva nazca cerrada — ver
       * `app/lib/access.server.js`. Se corta antes de resolver la ruta, así
       * que un visitante sin sesión no llega siquiera a disparar las queries.
       */
      const denied = await checkAccess({request, context: appLoadContext});

      if (denied) {
        // La sesión puede haber cambiado al chequear el login (Hydrogen
        // refresca el token si venció). Sin commitear acá, ese refresh se
        // pierde y el próximo request vuelve a empezar de cero.
        if (appLoadContext.session.isPending) {
          denied.headers.set(
            'Set-Cookie',
            await appLoadContext.session.commit(),
          );
        }

        return denied;
      }

      /**
       * Create a Remix request handler and pass
       * Hydrogen's Storefront client to the loader context.
       */
      const handleRequest = createRequestHandler({
        build: remixBuild,
        mode: process.env.NODE_ENV,
        getLoadContext: () => appLoadContext,
      });

      const response = await handleRequest(request);

      if (appLoadContext.session.isPending) {
        response.headers.set(
          'Set-Cookie',
          await appLoadContext.session.commit(),
        );
      }

      if (response.status === 404) {
        /**
         * Check for redirects only when there's a 404 from the app.
         * If the redirect doesn't exist, then `storefrontRedirect`
         * will pass through the 404 response.
         */
        return storefrontRedirect({
          request,
          response,
          storefront: appLoadContext.storefront,
        });
      }

      return response;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};
