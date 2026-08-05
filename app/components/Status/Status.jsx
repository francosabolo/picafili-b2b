import React from 'react';
import styles from './styles.module.scss';
import {useTranslation} from '~/i18n/index.jsx';

export function QuoteStatus({status}) {
  let text, className;
  const {t} = useTranslation();

  switch (status) {
    case 'COMPLETED':
      text = t('quoting.status-completed');
      className = styles.statusCompleted;
      break;
    case 'INVOICE_SENT':
      text = t('quoting.status-sent');
      className = styles.statusInvoiceSent;
      break;
    case 'OPEN':
      text = t('quoting.status-open');
      className = styles.statusOpen;
      break;
    default:
      text = t('quoting.status-unknown');
      className = styles.statusUnknown;
  }

  return <span className={className}>{text}</span>;
}

export function FulfillmentStatus({status}) {
  let text, className;

  switch (status) {
    case 'CANCELLED':
      text = 'Cancelled';
      className = styles.statusCompleted;
      break;
    case 'ERROR':
      text = 'Error';
      className = styles.statusCompleted;
      break;
    case 'FAILURE':
      text = 'Failure';
      className = styles.statusCompleted;
      break;
    case 'SUCCESS':
      text = 'Success';
      className = styles.statusCompleted;
      break;
    case 'OPEN':
      text = 'Open';
      className = styles.statusCompleted;
      break;
    case 'PENDING':
      text = 'Completed';
      className = styles.statusCompleted;
      break;
  }

  return <span className={className}>{text}</span>;
}

export function OrderStatus({status}) {
  let text, className;

  switch (status) {
    case 'CANCELLED':
      text = 'Cancelled';
      className = styles.statusCompleted;
      break;
    case 'ERROR':
      text = 'Error';
      className = styles.statusCompleted;
      break;
    case 'FAILURE':
      text = 'Failure';
      className = styles.statusCompleted;
      break;
    case 'SUCCESS':
      text = 'Success';
      className = styles.statusCompleted;
      break;
    case 'OPEN':
      text = 'Open';
      className = styles.statusCompleted;
      break;
    case 'PENDING':
      text = 'Completed';
      className = styles.statusCompleted;
      break;
  }

  return <span className={className}>{text}</span>;
}

export function FinancialStatus({status}) {
  let text, className;

  switch (status) {
    case 'AUTHORIZED':
      text = 'Authorized';
      className = styles.statusCompleted;
      break;

    case 'EXPIRED':
      text = 'Expired';
      className = styles.statusCompleted;
      break;

    case 'PAID':
      text = 'Paid';
      className = styles.statusCompleted;
      break;

    case 'PARTIALLY_PAID':
      text = 'Partially Paid';
      className = styles.statusCompleted;
      break;

    case 'PARTIALLY_REFUNDED':
      text = 'Partially refunded';
      className = styles.statusCompleted;
      break;

    case 'PENDING':
      text = 'Pending';
      className = styles.statusCompleted;
      break;

    case 'REFUNDED':
      text = 'Refunded';
      className = styles.statusCompleted;
      break;

    case 'VOIDED':
      text = 'Completed';
      className = styles.statusCompleted;
      break;
  }

  return <span className={className}>{text}</span>;
}
