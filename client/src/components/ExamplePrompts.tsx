import React from 'react';
import { useTranslation } from 'react-i18next';

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
  cityName?: string;
}

interface Example {
  labelKey: 'simple' | 'detailed' | 'complex';
  prompt: string;
  tier: 'simple' | 'detailed' | 'complex';
}

const getExamples = (cityName: string = 'London', language: string): Example[] => {
  // City-specific neighborhoods
  const neighborhoods: Record<string, { area1: string; area2: string; area3: string }> = {
    'London': { area1: 'Mayfair', area2: 'Shoreditch', area3: 'Chelsea' },
    'New York City': { area1: 'SoHo', area2: 'Greenwich Village', area3: 'Williamsburg' },
    'Paris': { area1: 'Le Marais', area2: 'Saint-Germain', area3: 'Montmartre' },
    'Tokyo': { area1: 'Shibuya', area2: 'Shinjuku', area3: 'Ginza' },
    'Rome': { area1: 'Trastevere', area2: 'Centro Storico', area3: 'Testaccio' },
    'Barcelona': { area1: 'Gothic Quarter', area2: 'El Born', area3: 'Gracia' },
    'Hong Kong': { area1: 'Central', area2: 'Wan Chai', area3: 'Lan Kwai Fong' },
    '香港': { area1: '中環', area2: '灣仔', area3: '蘭桂坊' },
  };

  // Use Chinese area names if language is zh-HK and city is Hong Kong
  const isChineseHK = language === 'zh-HK';
  const actualCityKey = isChineseHK && cityName === 'Hong Kong' ? '香港' : cityName;
  const areas = neighborhoods[actualCityKey] || neighborhoods['London'];

  // Return localized prompts based on language
  if (isChineseHK) {
    return [
      {
        labelKey: 'simple',
        prompt: `${areas.area1}咖啡店`,
        tier: 'simple',
      },
      {
        labelKey: 'detailed',
        prompt: `${areas.area2}安靜有WiFi的咖啡廳，工作到下午6點`,
        tier: 'detailed',
      },
      {
        labelKey: 'complex',
        prompt: `早上飲咖啡 -- ${areas.area1}午餐12點 -- 工作到6點 -- ${areas.area3}飲嘢`,
        tier: 'complex',
      },
    ];
  }

  return [
    {
      labelKey: 'simple',
      prompt: `Coffee shop in ${areas.area1}`,
      tier: 'simple',
    },
    {
      labelKey: 'detailed',
      prompt: `Quiet cafe with wifi in ${areas.area2}, working until 6PM`,
      tier: 'detailed',
    },
    {
      labelKey: 'complex',
      prompt: `Morning coffee for calls -- lunch meeting ${areas.area1} at 12 -- work until 6 -- drinks ${areas.area3}, hidden upscale bar`,
      tier: 'complex',
    },
  ];
};

const ExamplePrompts: React.FC<ExamplePromptsProps> = ({ onSelect, cityName = 'London' }) => {
  const { t, i18n } = useTranslation();
  const examples = getExamples(cityName, i18n.language);

  return (
    <div className="mb-4">
      <p className="text-xs text-gray-500 mb-2 px-1">
        {i18n.language === 'zh-HK' ? '試試範例：' : 'Try an example:'}
      </p>
      <div className="flex flex-wrap gap-2">
        {examples.map((example, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(example.prompt)}
            className="text-xs px-3 py-1.5 rounded-full transition-all duration-200 text-left max-w-full"
            style={{
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              border: '1px solid #dee2e6',
              color: '#495057',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)';
              e.currentTarget.style.borderColor = '#17B9E6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)';
              e.currentTarget.style.borderColor = '#dee2e6';
            }}
          >
            <span className="font-medium" style={{ color: '#17B9E6' }}>
              {t(`input.exampleLabels.${example.labelKey}`)}:
            </span>{' '}
            <span className="opacity-80 truncate inline-block max-w-[180px] align-bottom">
              {example.prompt.length > 35 ? example.prompt.slice(0, 35) + '...' : example.prompt}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExamplePrompts;
