/**
 * @param {{
 *   as?: React.ElementType;
 *   className?: string;
 *   flow?: 'row' | 'col';
 *   gap?: 'default' | 'blog';
 *   items?: number;
 *   layout?: 'default' | 'products' | 'auto' | 'blog';
 *   [key: string]: any;
 * }}
 */
export function PageWidthContainer({
  as: Component = 'div',
  className,
  flow = 'row',
  gap = 'default',
  items = 4,
  layout = 'default',
  ...props
}) {
  return <Component {...props} className={`${className} page-width`} />;
}
