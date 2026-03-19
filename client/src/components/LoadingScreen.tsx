import React from 'react';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';

const LoadingScreen: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="loading-container">
      <Logo className="mb-8" />
      <div className="loading-indicator" />
      <p className="loading-text" style={{
        fontFamily: 'var(--font-button)',
        color: 'var(--color-primary)',
        marginTop: 'var(--spacing-md)'
      }}>
        {t('app.loadingTagline')}
      </p>
    </div>
  );
};

export default LoadingScreen; 