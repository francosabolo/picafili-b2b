import {Form, useLocation, useRouteLoaderData} from '@remix-run/react';
import {locales} from '~/data/locales.js';
import styles from './styles.module.scss';
import React, {useEffect, useRef, useState} from 'react';

export function LanguageSelectorDropdown({className}) {
  const {i18n} = useRouteLoaderData('root');
  let selectedLocale = {locale: i18n?.language, country: i18n?.country};
  const {pathname, search} = useLocation();
  const strippedPathname = pathname.replace(selectedLocale?.pathPrefix, '');
  const detailsRef = useRef(null);

  useEffect(() => {
    const detailsElement = detailsRef.current;
    if (detailsElement) {
      detailsElement.removeAttribute('open');
    }
    const handleClickOutside = (event) => {
      if (!detailsRef?.current?.contains(event.target)) {
        const summaryElement = detailsRef?.current?.querySelector('summary');
        if (summaryElement && detailsRef?.current?.hasAttribute('open')) {
          summaryElement.click();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedLocale]);

  return (
    <details
      ref={detailsRef}
      className={`${styles.languageSelectorDropdown} ${className}`}
    >
      <summary className={styles.selectedLocale}>
        {selectedLocale?.locale}
      </summary>
      <div className={styles.languageDropdown}>
        {locales &&
          Object.keys(locales).map((languageKey) => {
            const locale = locales[languageKey];
            const hreflang = `${locale.language}`;

            if (locale?.language === selectedLocale?.locale) {
              return null;
            }

            return (
              <Form method="post" action="/locale" key={`lang--` + hreflang}>
                <input type="hidden" name="language" value={locale.language} />
                <input type="hidden" name="country" value={locale.country} />
                <input
                  type="hidden"
                  name="currentPath"
                  value={`${strippedPathname}${search}`}
                />
                <button type="submit">{locale.language}</button>
              </Form>
            );
          })}
      </div>
    </details>
  );
}

export function LanguageSelector() {
  const {i18n} = useRouteLoaderData('root');
  let selectedLocale = {locale: i18n?.language, country: i18n?.country};
  const {pathname, search} = useLocation();
  const strippedPathname = pathname.replace(selectedLocale?.pathPrefix, '');

  return (
    <div className={styles.languageSelector}>
      {locales &&
        Object.keys(locales).map((languageKey) => {
          const locale = locales[languageKey];
          const hreflang = `${locale?.language}`;

          return (
            <Form method="post" action="/locale" key={`lang--` + hreflang}>
              <input type="hidden" name="language" value={locale.language} />
              <input type="hidden" name="country" value={locale.country} />
              <input
                type="hidden"
                name="currentPath"
                value={`${strippedPathname}${search}`}
              />
              <button
                type="submit"
                className={`
                  ${styles.languageButton}
                  ${
                    locale?.language === selectedLocale?.locale
                      ? styles.active
                      : null
                  }`}
              >
                {locale.language}
              </button>
            </Form>
          );
        })}
    </div>
  );
}
