import {IconCopy} from '~/components/Icon/Icon.jsx';
import {useEffect, useState} from 'react';
import styles from './styles.module.scss';
import {useTranslation} from '~/i18n/index.jsx';

export function CopyText({textToCopy}) {
  const {t} = useTranslation();
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setCopySuccess('');
    }, 1000);
  }, [copySuccess]);

  const copyToClipboard = (e) => {
    navigator.clipboard.writeText(textToCopy);
    e.target.focus();
    setCopySuccess({copySuccess: t('general.copied')});
  };

  return (
    <div>
      <div className={styles.copy}>
        <IconCopy
          stroke={'none'}
          viewBox="-5 -3 20 20"
          className="cursor-pointer"
          onClick={copyToClipboard}
        />
        {copySuccess && (
          <span className={styles.copiedToCB}>{copySuccess.copySuccess}</span>
        )}
      </div>
    </div>
  );
}
