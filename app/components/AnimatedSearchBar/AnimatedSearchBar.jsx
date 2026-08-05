import styles from './styles.module.scss';
import {
  PredictiveSearchForm,
  PredictiveSearchResults,
} from '~/components/Search/Search.jsx';
import {useState, useRef, useEffect} from 'react';
import {IconSearch} from '~/components/Icon/Icon';
import {useNavigation} from '@remix-run/react';
import {useTranslation} from '~/i18n/index.jsx';

export function AnimatedSearchBar({className}) {
  const [isOpen, setIsOpen] = useState(false);
  const [animation, setAnimation] = useState();
  const [iconAnimation, setIconAnimation] = useState();
  const navigation = useNavigation();
  const animateSearchBarRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      toggleAnimation();
    }
  }, [navigation]);

  function toggleAnimation() {
    if (isOpen) {
      setAnimation(styles.closeBar);
      setIconAnimation(styles.closeIcon);
    } else {
      setAnimation(styles.openBar);
      setIconAnimation(styles.openIcon);
      setTimeout(() => {
        animateSearchBarRef?.current.getElementsByTagName('input')[0].focus();
      }, 500);
    }
    setIsOpen(!isOpen);
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        event.target == animateSearchBarRef?.current ||
        animateSearchBarRef?.current.contains(event?.target)
      ) {
        return;
      }
      if (isOpen) {
        toggleAnimation();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [animateSearchBarRef, isOpen]);

  return (
    <div
      className={`${styles.animatedSearchBarToggle} ${className}`}
      open={isOpen}
      ref={animateSearchBarRef}
    >
      <SearchInput isOpen={isOpen} animation={animation} />
      <IconSearch
        className={styles.icon}
        width="20"
        height="20"
        viewBox="0 0 28 24"
        onClick={() => {
          toggleAnimation();
        }}
        style={{animationName: iconAnimation}}
      />
    </div>
  );
}

function SearchInput({isOpen, animation}) {
  const {t} = useTranslation();

  // Recibe inputRef como prop
  return (
    <div
      className={styles.animatedSearchBarWrapper}
      style={{
        animationName: animation,
        visibility: isOpen ? 'visible' : 'hidden',
      }}
    >
      <PredictiveSearchForm className={styles.predictiveSearchForm}>
        {({fetchResults, inputRef}) => (
          <input
            name="q"
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              fetchResults();
            }}
            onChange={fetchResults}
            onFocus={fetchResults}
            placeholder={t('general.search')}
            ref={inputRef}
            type="search"
            className={styles.animatedSearchBarInput}
            autoFocus
          />
        )}
      </PredictiveSearchForm>
      <PredictiveSearchResults className={styles.predictiveSearchResults} />
    </div>
  );
}
