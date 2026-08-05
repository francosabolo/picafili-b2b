import {json, redirect} from '@shopify/remix-oxygen';
import {Link, useLoaderData} from '@remix-run/react';
import {Image, Pagination, getPaginationVariables} from '@shopify/hydrogen';
import {pageTitle} from '~/lib/utils.js';
import {useTranslation} from '~/i18n/index.jsx';

/**
 * @type {MetaFunction<typeof loader>}
 */
export const meta = ({data, matches}) => {
  return [{title: pageTitle(matches, data?.blog?.title ?? 'page-title.blogs')}];
};

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({request, params, context}) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 4,
  });

  if (!params.blogHandle) {
    throw new Response(`blog not found`, {status: 404});
  }

  const {blog} = await context.storefront.query(BLOGS_QUERY, {
    variables: {
      blogHandle: params.blogHandle,
      ...paginationVariables,
    },
  });

  if (!blog?.articles) {
    throw new Response('Not found', {status: 404});
  }

  const publicStoreDomain = context.env.PUBLIC_STORE_DOMAIN;

  return redirect(`https://${publicStoreDomain}/blogs/${params.blogHandle}`);

  // return json({blog});
}

export default function Blog() {
  const {t} = useTranslation();
  /** @type {LoaderReturnData} */
  const {blog} = useLoaderData();
  const {articles} = blog;

  return (
    <div className="blog">
      <h1>{blog.title}</h1>
      <div className="blog-grid">
        <Pagination connection={articles}>
          {({nodes, isLoading, PreviousLink, NextLink}) => {
            return (
              <>
                <PreviousLink>
                  {isLoading ? 'Loading...' : <span>↑ Load previous</span>}
                </PreviousLink>
                {nodes.map((article, index) => {
                  return (
                    <ArticleItem
                      article={article}
                      key={article.id}
                      loading={index < 2 ? 'eager' : 'lazy'}
                    />
                  );
                })}
                <NextLink>
                  {isLoading ? (
                    'Loading...'
                  ) : (
                    <span>{t('general.load-more')} ↓</span>
                  )}
                </NextLink>
              </>
            );
          }}
        </Pagination>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   article: ArticleItemFragment;
 *   loading?: HTMLImageElement['loading'];
 * }}
 */
function ArticleItem({article, loading}) {
  const publishedAt = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));
  return (
    <div className="blog-article" key={article.id}>
      <Link to={`/blogs/${article.blog.handle}/${article.handle}`}>
        {article.image && (
          <div className="blog-article-image">
            <Image
              alt={article.image.altText || article.title}
              aspectRatio="3/2"
              data={article.image}
              loading={loading}
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
        )}
        <h3>{article.title}</h3>
        <small>{publishedAt}</small>
      </Link>
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog
const BLOGS_QUERY = `#graphql
  query Blog(
    $language: LanguageCode
    $blogHandle: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(language: $language) {
    blog(handle: $blogHandle) {
      title
      seo {
        title
        description
      }
      articles(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor
      ) {
        nodes {
          ...ArticleItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          hasNextPage
          endCursor
          startCursor
        }

      }
    }
  }
  fragment ArticleItem on Article {
    author: authorV2 {
      name
    }
    contentHtml
    handle
    id
    image {
      id
      altText
      url
      width
      height
    }
    publishedAt
    title
    blog {
      handle
    }
  }
`;

/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @template T @typedef {import('@remix-run/react').MetaFunction<T>} MetaFunction */
/** @typedef {import('storefrontapi.generated').ArticleItemFragment} ArticleItemFragment */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
