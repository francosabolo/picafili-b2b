import {useMatches} from '@remix-run/react';

export function useRootLoaderData() {
  const [root] = useMatches();
  return root?.data;
}

/** @template T @typedef {import('@shopify/remix-oxygen').SerializeFrom<T>} SerializeFrom */
/** @typedef {import('~/root').loader} loader */
