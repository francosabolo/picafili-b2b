import {useCallback} from 'react';

const useLabelAnimation = () => {
  const handleFocus = useCallback((e) => {
    e.target.parentElement.classList.add('active');
  }, []);

  const handleBlur = useCallback((e) => {
    if (!e.target.value) {
      e.target.parentElement.classList.remove('active');
    }
  }, []);

  return {
    handleFocus,
    handleBlur,
  };
};

export default useLabelAnimation;
