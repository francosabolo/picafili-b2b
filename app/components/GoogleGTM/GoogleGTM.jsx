import {useAnalytics} from '@shopify/hydrogen';
import {useEffect} from 'react';

export function GoogleGTM() {
  const {subscribe, register} = useAnalytics();
  const {ready} = register('Google Tag Manager');

  useEffect(() => {
    subscribe('product_viewed', () => {
      // Triggering a custom event in GTM when a product is viewed
      window.dataLayer.push({event: 'viewed-product'});
    });

    ready();
  }, []);

  return null;
}
