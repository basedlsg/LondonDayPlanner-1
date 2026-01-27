import React from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../i18n';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'button' | 'dropdown';
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'button',
  className = ''
}) => {
  const { i18n } = useTranslation();

  const currentLanguage = supportedLanguages.find(
    lang => lang.code === i18n.language
  ) || supportedLanguages[0];

  const toggleLanguage = () => {
    const currentIndex = supportedLanguages.findIndex(
      lang => lang.code === i18n.language
    );
    const nextIndex = (currentIndex + 1) % supportedLanguages.length;
    i18n.changeLanguage(supportedLanguages[nextIndex].code);
  };

  if (variant === 'button') {
    return (
      <button
        onClick={toggleLanguage}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${className}`}
        style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          border: '1px solid #dee2e6',
          color: '#495057',
        }}
        title={`Switch language (Current: ${currentLanguage.nativeName})`}
      >
        <Globe className="h-4 w-4" style={{ color: '#17B9E6' }} />
        <span className="text-sm font-medium">{currentLanguage.nativeName}</span>
      </button>
    );
  }

  // Dropdown variant
  return (
    <div className={`relative ${className}`}>
      <select
        value={i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ color: '#495057' }}
      >
        {supportedLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
      <Globe
        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none"
        style={{ color: '#17B9E6' }}
      />
    </div>
  );
};

export default LanguageSwitcher;
