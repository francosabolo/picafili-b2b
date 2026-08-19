import clsx from 'clsx';
import {useTranslation} from '~/i18n/index.jsx';

/**
 * @param {IconProps}
 */
function Icon({children, className, fill = 'currentColor', stroke, ...props}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 25 28"
      {...props}
      fill={fill}
      stroke={stroke}
      className={clsx('w-6 h-6', className)}
    >
      {children}
    </svg>
  );
}

/**
 * @param {IconProps} props
 */
export function IconMenu(props) {
  return (
    <Icon {...props} stroke={props.stroke || 'currentColor'}>
      <title>Menu</title>
      <path
        d="M1 .5a.5.5 0 100 1h15.71a.5.5 0 000-1H1zM.5 8a.5.5 0 01.5-.5h15.71a.5.5 0 010 1H1A.5.5 0 01.5 8zm0 7a.5.5 0 01.5-.5h15.71a.5.5 0 010 1H1a.5.5 0 01-.5-.5z"
        fill="currentColor"
      />
    </Icon>
  );
}

export function IconQuote(props) {
  return (
    <Icon {...props} stroke={props.stroke || 'currentColor'}>
      <title>Quote</title>
      <path
        d="M16.0135 2.41666C16.3245 2.41666 16.5638 2.67041 16.5638 2.9725V6.86333C16.5638 9.07458 18.3703 10.8871 20.5597 10.8992C21.4689 10.8992 22.1868 10.9112 22.7371 10.9112L22.9409 10.9104C23.3087 10.9076 23.8038 10.8992 24.2325 10.8992C24.5316 10.8992 24.7709 11.1408 24.7709 11.4429V21.1579C24.7709 24.1546 22.3662 26.5833 19.3992 26.5833H9.87611C6.76555 26.5833 4.22925 24.0337 4.22925 20.8921V7.86625C4.22925 4.86958 6.64591 2.41666 9.62487 2.41666H16.0135ZM17.2936 18.0042H10.7854C10.2948 18.0042 9.88808 18.4029 9.88808 18.8983C9.88808 19.3937 10.2948 19.8046 10.7854 19.8046H17.2936C17.7841 19.8046 18.1909 19.3937 18.1909 18.8983C18.1909 18.4029 17.7841 18.0042 17.2936 18.0042ZM14.8291 11.9625H10.7854C10.2948 11.9625 9.88808 12.3733 9.88808 12.8687C9.88808 13.3642 10.2948 13.7629 10.7854 13.7629H14.8291C15.3196 13.7629 15.7264 13.3642 15.7264 12.8687C15.7264 12.3733 15.3196 11.9625 14.8291 11.9625ZM18.3072 3.51141C18.3072 2.99062 18.9329 2.73204 19.2906 3.10783C20.5839 4.466 22.8438 6.84037 24.1072 8.16712C24.4565 8.53325 24.2005 9.14104 23.6968 9.14225C22.7134 9.14587 21.5541 9.14225 20.7202 9.13379C19.3971 9.13379 18.3072 8.033 18.3072 6.69658V3.51141Z"
        fill="currentColor"
      />
    </Icon>
  );
}

export function IconPreview(props) {
  return (
    <Icon
      {...props}
      stroke={props.stroke || 'transparent'}
      width="19"
      height="16"
      viewBox="0 0 19 16"
    >
      <title>Preview</title>
      <path
        d="M9.44358 0.944458C11.2821 0.944458 13.0251 1.5823 14.5428 2.76318C16.0604 3.93543 17.3525 5.65072 18.2804 7.79698C18.3498 7.96075 18.3498 8.15038 18.2804 8.30554C16.4246 12.5981 13.1205 15.1667 9.44358 15.1667H9.43491C5.76661 15.1667 2.46255 12.5981 0.60672 8.30554C0.537343 8.15038 0.537343 7.96075 0.60672 7.79698C2.46255 3.50446 5.76661 0.944458 9.43491 0.944458H9.44358ZM9.44358 4.60776C7.52705 4.60776 5.97474 6.15065 5.97474 8.05557C5.97474 9.95187 7.52705 11.4948 9.44358 11.4948C11.3514 11.4948 12.9037 9.95187 12.9037 8.05557C12.9037 6.15065 11.3514 4.60776 9.44358 4.60776ZM9.44462 5.89879C10.6327 5.89879 11.604 6.86418 11.604 8.05367C11.604 9.23455 10.6327 10.1999 9.44462 10.1999C8.24787 10.1999 7.2766 9.23455 7.2766 8.05367C7.2766 7.90714 7.29394 7.76923 7.31996 7.63132H7.36332C8.32592 7.63132 9.10641 6.8728 9.14109 5.92465C9.23649 5.90741 9.34055 5.89879 9.44462 5.89879Z"
        fill="currentColor"
      />
    </Icon>
  );
}

/**
 * @param {IconProps} props
 */
export function IconClose(props) {
  return (
    <Icon {...props} stroke={props.stroke || 'currentColor'}>
      <title>Close</title>
      <line
        x1="4.44194"
        y1="4.30806"
        x2="15.7556"
        y2="15.6218"
        strokeWidth="1.25"
      />
      <line
        y1="-0.625"
        x2="16"
        y2="-0.625"
        transform="matrix(-0.707107 0.707107 0.707107 0.707107 16 4.75)"
        strokeWidth="1.25"
      />
    </Icon>
  );
}

export function IconCopy(props) {
  return (
    <Icon {...props} stroke={props.stroke || 'currentColor'}>
      <title>Copy</title>
      <g clipPath="url(#clip0_423_10294)">
        <path
          d="M3.15219 6.33958C3.15219 4.51147 4.66475 3.02398 6.52367 3.02398H9.09776V2.58043C9.09776 1.15421 7.9216 0 6.47384 0H2.62392C1.17615 0 0 1.15666 0 2.58043V7.65797C0 9.08419 1.17615 10.2384 2.62392 10.2384H3.15219V6.33958Z"
          fill="black"
        />
        <path
          d="M10.3757 3.75916H6.52334C5.07418 3.75916 3.89941 4.91445 3.89941 6.33959V11.4196C3.89941 12.8447 5.07418 14 6.52334 14H10.3757C11.8249 14 12.9997 12.8447 12.9997 11.4196V6.33959C12.9997 4.91445 11.8249 3.75916 10.3757 3.75916Z"
          fill="black"
        />
      </g>
      <defs>
        <clipPath id="clip0_423_10294">
          <rect width="13" height="14" fill="white" />
        </clipPath>
      </defs>
    </Icon>
  );
}

/**
 * @param {IconProps}
 */
export function IconArrow({direction = 'right', ...props}) {
  let rotate;

  switch (direction) {
    case 'right':
      rotate = 'rotate-0';
      break;
    case 'left':
      rotate = 'rotate-180';
      break;
    case 'up':
      rotate = '-rotate-90';
      break;
    case 'down':
      rotate = 'rotate-90';
      break;
    default:
      rotate = 'rotate-0';
  }

  return (
    <Icon {...props} className={`w-5 h-5 ${rotate}`}>
      <title>Arrow</title>
      <path
        d="M5.34985 11.9998H19.7501"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
      <path
        d="M10.8 18.0243L4.75 12.0003L10.8 5.97534"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </Icon>
  );
}

/**
 * @param {IconProps}
 */
export function IconCaret({
  direction = 'down',
  stroke = 'currentColor',
  ...props
}) {
  let rotate;

  switch (direction) {
    case 'down':
      rotate = 'rotate-0';
      break;
    case 'up':
      rotate = 'rotate-180  -translate-y-1/3';
      break;
    case 'left':
      rotate = '-rotate-90';
      break;
    case 'right':
      rotate = 'rotate-90';
      break;
    default:
      rotate = 'rotate-0';
  }

  return (
    <Icon
      {...props}
      className={`w-5 h-5 transition ${rotate}`}
      fill="transparent"
      stroke={stroke}
    >
      <title>Caret</title>
      <path d="M14 8L10 12L6 8" strokeWidth="1.25" />
    </Icon>
  );
}

export function IconFile(...props) {
  return (
    <Icon {...props}>
      <path
        d="M12.5638 0.972581C12.5638 0.670498 12.3245 0.416748 12.0135 0.416748H5.62487C2.64591 0.416748 0.229248 2.86966 0.229248 5.86633V18.8922C0.229248 22.0338 2.76555 24.5834 5.87611 24.5834H15.3992C18.3662 24.5834 20.7709 22.1547 20.7709 19.158V9.443C20.7709 9.14091 20.5316 8.89925 20.2325 8.89925C19.8038 8.89925 19.3087 8.90764 18.9409 8.91044L18.7371 8.91133C18.1868 8.91133 17.4689 8.89925 16.5597 8.89925C14.3703 8.88717 12.5638 7.07467 12.5638 4.86341V0.972581Z"
        fill="#090909"
      />
      <path
        d="M15.2906 1.10791C14.9329 0.732123 14.3072 0.990706 14.3072 1.5115V4.69666C14.3072 6.03308 15.3971 7.13387 16.7202 7.13387C17.5541 7.14233 18.7134 7.14596 19.6968 7.14233C20.2005 7.14112 20.4565 6.53333 20.1072 6.16721C18.8438 4.84046 16.5839 2.46608 15.2906 1.10791Z"
        fill="#090909"
      />
    </Icon>
  );
}

export function IconCart({stroke = 'currentColor', count, styles, ...props}) {
  return (
    <div className={styles.iconCartWrapper}>
      <Icon
        {...props}
        viewBox="0 0 24 24"
        fill="none"
        className={`${count !== 0 ? 'cartFilled' : 'cartEmpty'} ${
          styles.iconCart
        }`}
        stroke={stroke}
      >
        {/* Tomado del theme de la tienda retail: trazo de 1.5 y
            `currentColor`, como el resto de esa familia. El portal y la tienda
            son la misma marca vista por el mismo comprador. */}
        <path
          d="M2.5 3.5h1.9l2.72 11.9a1.9 1.9 0 0 0 1.85 1.47h8.36a1.9 1.9 0 0 0 1.85-1.45L21 8.4H5.75"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.2 21.3a1.55 1.55 0 1 1 0-3.1 1.55 1.55 0 0 1 0 3.1Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17 21.3a1.55 1.55 0 1 1 0-3.1 1.55 1.55 0 0 1 0 3.1Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Icon>
      {count !== 0 ? <div className={styles.cartBubble}>{count}</div> : null}
    </div>
  );
}

/**
 * @param {IconProps} props
 */
export function IconSelect(props) {
  return (
    <Icon {...props}>
      <title>Select</title>
      <path d="M7 8.5L10 6.5L13 8.5" strokeWidth="1.25" />
      <path d="M13 11.5L10 13.5L7 11.5" strokeWidth="1.25" />
    </Icon>
  );
}

/**
 * @param {IconProps} props
 */
export function IconBag(props) {
  return (
    <Icon {...props}>
      <title>Bag</title>
      <path
        fillRule="evenodd"
        d="M8.125 5a1.875 1.875 0 0 1 3.75 0v.375h-3.75V5Zm-1.25.375V5a3.125 3.125 0 1 1 6.25 0v.375h3.5V15A2.625 2.625 0 0 1 14 17.625H6A2.625 2.625 0 0 1 3.375 15V5.375h3.5ZM4.625 15V6.625h10.75V15c0 .76-.616 1.375-1.375 1.375H6c-.76 0-1.375-.616-1.375-1.375Z"
      />
    </Icon>
  );
}

/**
 * @param {IconProps} props
 */
export function IconLogin(props) {
  return (
    <Icon {...props}>
      <title>Login</title>
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <path
          d="M8,10.6928545 C10.362615,10.6928545 12.4860225,11.7170237 13.9504747,13.3456144 C12.4860225,14.9758308 10.362615,16 8,16 C5.63738499,16 3.51397752,14.9758308 2.04952533,13.3472401 C3.51397752,11.7170237 5.63738499,10.6928545 8,10.6928545 Z"
          fill="currentColor"
        ></path>
        <path
          d="M8,3.5 C6.433,3.5 5.25,4.894 5.25,6.5 C5.25,8.106 6.433,9.5 8,9.5 C9.567,9.5 10.75,8.106 10.75,6.5 C10.75,4.894 9.567,3.5 8,3.5 Z"
          fill="currentColor"
          fillRule="nonzero"
        ></path>
      </g>
    </Icon>
  );
}

/**
 * @param {IconProps} props
 */
export function IconAccount(props) {
  return (
    <Icon {...props} viewBox="0 0 24 24" fill="none">
      <title>Account</title>
      {/* Mismo ícono de cuenta que el theme de la tienda retail. */}
      <path
        d="M5 20V19C5 15.134 8.13401 12 12 12V12C15.866 12 19 15.134 19 19V20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

export function IconQuestionMark(props) {
  return (
    <Icon {...props}>
      <title>Question Mark</title>
      <g>
        <path d="M15.255,0c5.424,0,10.764,2.498,10.764,8.473c0,5.51-6.314,7.629-7.67,9.62c-1.018,1.481-0.678,3.562-3.475,3.562   c-1.822,0-2.712-1.482-2.712-2.838c0-5.046,7.414-6.188,7.414-10.343c0-2.287-1.522-3.643-4.066-3.643   c-5.424,0-3.306,5.592-7.414,5.592c-1.483,0-2.756-0.89-2.756-2.584C5.339,3.683,10.084,0,15.255,0z M15.044,24.406   c1.904,0,3.475,1.566,3.475,3.476c0,1.91-1.568,3.476-3.475,3.476c-1.907,0-3.476-1.564-3.476-3.476   C11.568,25.973,13.137,24.406,15.044,24.406z" />
      </g>
    </Icon>
  );
}

/**
 * @param {IconProps} props
 */
export function IconHelp(props) {
  return (
    <Icon {...props}>
      <title>Help</title>
      <path d="M3.375 10a6.625 6.625 0 1 1 13.25 0 6.625 6.625 0 0 1-13.25 0ZM10 2.125a7.875 7.875 0 1 0 0 15.75 7.875 7.875 0 0 0 0-15.75Zm.699 10.507H9.236V14h1.463v-1.368ZM7.675 7.576A3.256 3.256 0 0 0 7.5 8.67h1.245c0-.496.105-.89.316-1.182.218-.299.553-.448 1.005-.448a1 1 0 0 1 .327.065c.124.044.24.113.35.208.108.095.2.223.272.383.08.154.12.34.12.558a1.3 1.3 0 0 1-.076.471c-.044.131-.11.252-.197.361-.08.102-.174.197-.283.285-.102.087-.212.182-.328.284a3.157 3.157 0 0 0-.382.383c-.102.124-.19.27-.262.438a2.476 2.476 0 0 0-.164.591 6.333 6.333 0 0 0-.043.81h1.179c0-.263.021-.485.065-.668a1.65 1.65 0 0 1 .207-.47c.088-.139.19-.263.306-.372.117-.11.244-.223.382-.34l.35-.306c.116-.11.218-.23.305-.361.095-.139.168-.3.219-.482.058-.19.087-.412.087-.667 0-.35-.062-.664-.186-.942a1.881 1.881 0 0 0-.513-.689 2.07 2.07 0 0 0-.753-.427A2.721 2.721 0 0 0 10.12 6c-.4 0-.764.066-1.092.197a2.36 2.36 0 0 0-.83.536c-.225.234-.4.515-.523.843Z" />
    </Icon>
  );
}

/**
 * @param {IconProps} props
 */
export function IconSearch(props) {
  const {t} = useTranslation();

  return (
    <Icon {...props} viewBox="0 0 24 24" fill="none">
      <title>{t('general.search')}</title>
      {/* La lupa del theme de la tienda: contorno, no silueta rellena. La
          anterior era una masa negra que en el header se leía como un botón. */}
      <path
        d="M17 17L21 21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 11C3 15.4183 6.58172 19 11 19C13.213 19 15.2161 18.1015 16.6644 16.6493C18.1077 15.2022 19 13.2053 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

/**
 *
 * @param stroke
 * @param props
 * @returns {JSX.Element}
 * @constructor
 */
export function IconCheck({stroke = 'currentColor', ...props}) {
  // viewBox propio: las formas estan dibujadas en una caja de 20x20 y el
  // wrapper usa 0 0 25 28. Heredando el del wrapper, el tilde se renderizaba
  // en la esquina superior izquierda y a la mitad de tamano — invisible dentro
  // de un boton de 40px.
  return (
    <Icon viewBox="0 0 20 20" {...props} fill="transparent" stroke={stroke}>
      <title>Check</title>
      <circle cx="10" cy="10" r="7.25" strokeWidth="1.25" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="m7.04 10.37 2.42 2.41 3.5-5.56"
      />
    </Icon>
  );
}

/**
 *
 * @param stroke
 * @param props
 * @returns {JSX.Element}
 * @constructor
 */
export function IconXMark({stroke = 'currentColor', ...props}) {
  return (
    <Icon {...props} fill="transparent" stroke={stroke}>
      <title>Delete</title>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </Icon>
  );
}
export function IconDownload({...props}) {
  return (
    <Icon
      {...props}
      fill={props.fill || 'transparent'}
      stroke={props.stroke || 'currentColor'}
    >
      <title>Download</title>
      <path
        d="M9.2301 5.29052V1.2815C9.2301 0.855229 9.5701 0.5 10.0001 0.5C10.3851 0.5 10.7113 0.798491 10.763 1.17658L10.7701 1.2815V5.29052L15.55 5.29083C17.93 5.29083 19.8853 7.23978 19.9951 9.67041L20 9.88609V14.9254C20 17.373 18.1127 19.3822 15.768 19.495L15.56 19.5H4.44C2.06 19.5 0.11409 17.5608 0.00483778 15.1213L0 14.9047V9.87576C0 7.4281 1.87791 5.40921 4.22199 5.29585L4.43 5.29083L9.2301 5.29052L9.23 11.6932L7.63 10.041C7.33 9.73119 6.84 9.73119 6.54 10.041C6.39 10.1959 6.32 10.4024 6.32 10.6089C6.32 10.7659 6.3648 10.9295 6.45952 11.0679L6.54 11.1666L9.45 14.1819C9.59 14.3368 9.79 14.4194 10 14.4194C10.1667 14.4194 10.3333 14.362 10.4653 14.2533L10.54 14.1819L13.45 11.1666C13.75 10.8568 13.75 10.3508 13.45 10.041C13.1773 9.75936 12.7475 9.73375 12.4462 9.96418L12.36 10.041L10.77 11.6932L10.7701 5.29052H9.2301Z"
        fill="currentColor"
      />
    </Icon>
  );
}

/**
 * @param {IconProps} props
 */
export function IconRemove(props) {
  return (
    <Icon {...props} fill="transparent" stroke={props.stroke || 'currentColor'}>
      <title>Remove</title>
      <path
        d="M4 6H16"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.5 9V14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.5 9V14" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M5.5 6L6 17H14L14.5 6"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 6L8 5C8 4 8.75 3 10 3C11.25 3 12 4 12 5V6"
        strokeWidth="1.25"
      />
    </Icon>
  );
}

/**
 * @param {IconProps} props
 */
export function IconRemoveItem(props) {
  return (
    <Icon {...props} fill="transparent" stroke={props.stroke || 'currentColor'}>
      <title>Remove Item</title>
      <path
        d="M16.1032 7.89017C16.1032 7.89017 15.6507 13.5027 15.3882 15.8668C15.2632 16.996 14.5657 17.6577 13.4232 17.6785C11.249 17.7177 9.07234 17.7202 6.89901 17.6743C5.79984 17.6518 5.11401 16.9818 4.99151 15.8727C4.72734 13.4877 4.27734 7.89017 4.27734 7.89017"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.2567 5.19975H3.125"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5335 5.19975C13.8793 5.19975 13.316 4.73725 13.1877 4.09642L12.9852 3.08308C12.8602 2.61558 12.4368 2.29225 11.9543 2.29225H8.42682C7.94432 2.29225 7.52099 2.61558 7.39599 3.08308L7.19349 4.09642C7.06516 4.73725 6.50182 5.19975 5.84766 5.19975"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

/**
 * @param {IconProps} props
 */
export function IconFilters(props) {
  return (
    <Icon {...props} fill="transparent" stroke={props.stroke || 'currentColor'}>
      <title>Filters</title>
      <circle cx="4.5" cy="6.5" r="2" />
      <line x1="6" y1="6.5" x2="14" y2="6.5" />
      <line x1="4.37114e-08" y1="6.5" x2="3" y2="6.5" />
      <line x1="4.37114e-08" y1="13.5" x2="8" y2="13.5" />
      <line x1="11" y1="13.5" x2="14" y2="13.5" />
      <circle cx="9.5" cy="13.5" r="2" />
    </Icon>
  );
}

export function IconAvailable(props) {
  return (
    <Icon {...props} fill="transparent" stroke={props.stroke || 'currentColor'}>
      <title>Available</title>
      <path
        d="M9.89301 0.333252C12.153 0.333252 13.6663 1.91992 13.6663 4.27992V9.72725C13.6663 12.0799 12.153 13.6666 9.89301 13.6666H4.11301C1.85301 13.6666 0.333008 12.0799 0.333008 9.72725V4.27992C0.333008 1.91992 1.85301 0.333252 4.11301 0.333252H9.89301ZM9.78634 4.99992C9.55968 4.77325 9.18634 4.77325 8.95967 4.99992L6.20634 7.75325L5.03967 6.58659C4.81301 6.35992 4.43967 6.35992 4.21301 6.58659C3.98634 6.81325 3.98634 7.17992 4.21301 7.41325L5.79967 8.99325C5.91301 9.10659 6.05967 9.15992 6.20634 9.15992C6.35967 9.15992 6.50634 9.10659 6.61967 8.99325L9.78634 5.82659C10.013 5.59992 10.013 5.23325 9.78634 4.99992Z"
        fill="#090909"
      />
    </Icon>
  );
}

export function IconOutOfStock(props) {
  return (
    <Icon {...props} fill="transparent" stroke={props.stroke || 'currentColor'}>
      <title>Availability</title>
      <path
        d="M9.89301 0.332764C12.153 0.332764 13.6663 1.91943 13.6663 4.27943V9.72676C13.6663 12.0801 12.153 13.6661 9.89301 13.6661H4.11301C1.85301 13.6661 0.333008 12.0801 0.333008 9.72676V4.27943C0.333008 1.91943 1.85301 0.332764 4.11301 0.332764H9.89301ZM9.00634 4.9801C8.77967 4.75276 8.41301 4.75276 8.17968 4.9801L6.99967 6.1661L5.81301 4.9801C5.57967 4.75276 5.21301 4.75276 4.98634 4.9801C4.75967 5.20676 4.75967 5.5801 4.98634 5.8061L6.17301 6.99343L4.98634 8.17343C4.75967 8.40676 4.75967 8.77343 4.98634 8.99943C5.09967 9.11276 5.25301 9.17343 5.39967 9.17343C5.55301 9.17343 5.69967 9.11276 5.81301 8.99943L6.99967 7.8201L8.18634 8.99943C8.29967 9.1201 8.44634 9.17343 8.59301 9.17343C8.74634 9.17343 8.89301 9.11276 9.00634 8.99943C9.23301 8.77343 9.23301 8.40676 9.00634 8.1801L7.81967 6.99343L9.00634 5.8061C9.23301 5.5801 9.23301 5.20676 9.00634 4.9801Z"
        fill="#090909"
      />
    </Icon>
  );
}

export function IconDelayed(props) {
  return (
    <Icon {...props} fill="transparent" stroke={props.stroke || 'currentColor'}>
      <title>Availability</title>
      <path
        d="M10.393 0.333496C12.653 0.333496 14.1663 1.9195 14.1663 4.2795V9.72616C14.1663 12.0802 12.653 13.6668 10.393 13.6668H4.61301C2.35301 13.6668 0.833008 12.0802 0.833008 9.72616V4.2795C0.833008 1.9195 2.35301 0.333496 4.61301 0.333496H10.393ZM7.26634 3.61283C6.99301 3.61283 6.76634 3.84016 6.76634 4.11283V7.48016C6.76634 7.6535 6.85967 7.82016 7.01301 7.90683L9.62634 9.46683C9.70634 9.52016 9.79967 9.54016 9.88634 9.54016C10.053 9.54016 10.2197 9.4535 10.313 9.2935C10.4597 9.0595 10.3797 8.75283 10.1397 8.60683L7.76634 7.1935V4.11283C7.76634 3.84016 7.54634 3.61283 7.26634 3.61283Z"
        fill="black"
      />
    </Icon>
  );
}

export function IconSuccess(props) {
  return (
    <Icon {...props} stroke={props.stroke}>
      <path
        d="M40.9998 20.507C40.961 22.3118 40.4545 23.9696 39.2892 25.3616C38.0451 26.8472 37.3969 28.5317 37.2098 30.4501C36.8757 33.882 33.8903 36.8651 30.4531 37.2017C28.5341 37.3901 26.8636 38.0593 25.3629 39.283C22.5578 41.5701 18.4565 41.5714 15.6514 39.287C14.1654 38.0767 12.5149 37.3994 10.6133 37.2084C7.08793 36.853 4.14657 33.9194 3.79376 30.41C3.60266 28.509 2.93715 26.8552 1.72639 25.367C-0.580194 22.5349 -0.573512 18.4497 1.73574 15.6176C2.93715 14.1455 3.59598 12.5036 3.79109 10.6214C4.16127 7.05452 7.06254 4.15563 10.6307 3.78826C12.5136 3.59455 14.1533 2.93195 15.626 1.73098C18.4498 -0.574781 22.5551 -0.576117 25.3776 1.72563C26.8489 2.92527 28.4873 3.59322 30.3716 3.78826C33.9477 4.15964 36.8557 7.0612 37.2178 10.6147C37.4089 12.497 38.0517 14.1521 39.2719 15.6096C40.4492 17.015 40.9664 18.6835 41.0011 20.5083L40.9998 20.507ZM17.9567 21.9898C17.8217 21.8616 17.7001 21.7521 17.5852 21.6372C16.6176 20.6713 15.6568 19.7001 14.6839 18.7409C13.9315 17.9995 13.0361 17.7484 12.0232 18.0757C10.1963 18.6661 9.6658 20.9144 11.0409 22.3278C12.6566 23.9883 14.3097 25.6115 15.9494 27.2466C17.2163 28.509 18.6756 28.5077 19.9425 27.2413C23.2327 23.9549 26.5202 20.6673 29.8076 17.3797C29.8664 17.3209 29.9266 17.2621 29.9827 17.202C30.989 16.1333 30.993 14.5502 29.9921 13.5617C28.9724 12.5544 27.4115 12.5557 26.3571 13.5951C24.8497 15.0806 23.3596 16.5848 21.8629 18.081C20.5666 19.3768 19.2717 20.674 17.9567 21.9898Z"
        fill="#F8F8F8"
      />
    </Icon>
  );
}

export function IconError(props) {
  return (
    <Icon {...props} stroke={props.stroke}>
      <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
        <rect width="30" height="30" rx="15" fill="#EF8888" />
        <path
          d="M8.6863 8.6863L21.3137 21.3137"
          stroke="#F8F8F8"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M8.6863 21.3137L21.3137 8.6863"
          stroke="#F8F8F8"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </Icon>
  );
}

export function IconDownloadFile({children, ...props}) {
  return (
    <>
      <div className="iconWithText">
        <Icon
          {...props}
          className={clsx('w-6 h-6 flex justify-center items-center')}
          stroke={props.stroke}
        >
          <path
            d="M12.565 0.97249C12.565 0.670406 12.3258 0.416656 12.0147 0.416656H5.6261C2.64714 0.416656 0.230469 2.86957 0.230469 5.86624V18.8921C0.230469 22.0337 2.76677 24.5833 5.87733 24.5833H15.4004C18.3674 24.5833 20.7721 22.1546 20.7721 19.1579V9.44291C20.7721 9.14082 20.5329 8.89916 20.2338 8.89916C19.8051 8.89916 19.3099 8.90755 18.9421 8.91035L18.7383 8.91124C18.188 8.91124 17.4702 8.89916 16.5609 8.89916C14.3716 8.88707 12.565 7.07457 12.565 4.86332V0.97249Z"
            fill="#090909"
          />
          <path
            d="M15.2918 1.10782C14.9341 0.732032 14.3084 0.990615 14.3084 1.51141V4.69657C14.3084 6.03299 15.3983 7.13378 16.7215 7.13378C17.5553 7.14224 18.7146 7.14587 19.698 7.14224C20.2017 7.14103 20.4577 6.53324 20.1084 6.16711C18.845 4.84036 16.5851 2.46599 15.2918 1.10782Z"
            fill="#090909"
          />
        </Icon>
        {children}
      </div>
    </>
  );
}
/**
 * @typedef {JSX.IntrinsicElements['svg'] & {
 *   direction?: 'up' | 'right' | 'down' | 'left';
 * }} IconProps
 */

/**
 * Carrito con un "+": la accion de sumar al carrito desde la tarjeta.
 * El IconCart normal es el acceso al carrito; este es el verbo.
 *
 * @param {IconProps} props
 */
export function IconCartPlus(props) {
  return (
    <Icon {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M2.5 3h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2l1.2-6.2H6"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <path d="M16.5 2v5M14 4.5h5" strokeWidth="1.8" strokeLinecap="round" />
    </Icon>
  );
}

/**
 * Vista de tarjetas. El viewBox es 0 0 24 24 y no el 0 0 25 28 del wrapper:
 * son rectangulos dibujados a mano y con la caja del wrapper quedaban
 * descentrados dentro del boton.
 */
export function IconGrid(props) {
  return (
    <Icon viewBox="0 0 24 24" {...props} fill="none" stroke="currentColor">
      <title>Tarjetas</title>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" strokeWidth="1.6" />
      <rect
        x="13.5"
        y="3"
        width="7.5"
        height="7.5"
        rx="1.5"
        strokeWidth="1.6"
      />
      <rect
        x="3"
        y="13.5"
        width="7.5"
        height="7.5"
        rx="1.5"
        strokeWidth="1.6"
      />
      <rect
        x="13.5"
        y="13.5"
        width="7.5"
        height="7.5"
        rx="1.5"
        strokeWidth="1.6"
      />
    </Icon>
  );
}

/** Vista de tabla: filas comparables. */
export function IconRows(props) {
  return (
    <Icon viewBox="0 0 24 24" {...props} fill="none" stroke="currentColor">
      <title>Tabla</title>
      <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.6" />
      <path d="M3 9.5h18M3 15h18M9 9.5V20" strokeWidth="1.6" />
    </Icon>
  );
}
