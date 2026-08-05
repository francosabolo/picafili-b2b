import {Link, NavLink} from '@remix-run/react';
import {useRootLoaderData} from '~/lib/root-data.js';

export function CollectionNavigationBar({menu, styles}) {
  const {publicStoreDomain} = useRootLoaderData();
  const menuList = menu?.menu?.items;
  const privateStoreDomain = menu.shop?.primaryDomain?.url;

  return (
    <div className={styles.collectionNavigationBar}>
      {menuList?.map((item, i) => {
        if (!item.resourceId) return null;

        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(privateStoreDomain)
            ? new URL(item.url).pathname
            : item.url;

        const isExternal = !url.startsWith('/');

        return (
          <NavLink
            end
            key={'item--' + i}
            prefetch="intent"
            style={activeLinkStyle}
            to={url}
            className={styles.collectionButton}
            preventScrollReset
          >
            {item.title}
          </NavLink>
        );
      })}
    </div>
  );
}

function activeLinkStyle({isActive, isPending}) {
  return {
    background: isActive ? 'var(--color-grey-dark)' : undefined,
  };
}
