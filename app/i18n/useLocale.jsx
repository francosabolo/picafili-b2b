import {useMatches} from '@remix-run/react';

export function useLocale() {
  const [root] = useMatches();
  if (!root?.data?.i18n) {
    throw new Error(
      'i18n was not returned from the root layout loader.\n Please make sure i18n is configured correctly in both server.ts and root.tsx.',
    );
  }
  return root?.data?.i18n;
}
