import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import { Cloud, CloudOff } from 'lucide-react';
import { City } from '@/data/cities';
import ExamplePrompts from './ExamplePrompts';

interface InputScreenProps {
  onSubmit: (data: { date: string; time: string; plans: string; weatherAware?: boolean }) => void;
  isLoading?: boolean;
  selectedCity: City;
}

const InputScreen: React.FC<InputScreenProps> = ({ onSubmit, isLoading, selectedCity }) => {
  const { t, i18n } = useTranslation();

  // Initialize with current date and time
  const [date, setDate] = useState(formatDateForInput(new Date()));
  const [time, setTime] = useState(formatTimeForInput(new Date()));
  const [plans, setPlans] = useState('');
  const [weatherAware, setWeatherAware] = useState(true); // Default to enabled

  // Format date for date input (YYYY-MM-DD)
  function formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Format time for time input (HH:MM)
  function formatTimeForInput(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Set current date and time when component mounts
  useEffect(() => {
    const now = new Date();
    setDate(formatDateForInput(now));
    setTime(formatTimeForInput(now));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ date, time, plans, weatherAware });
  };

  const isZhHK = i18n.language === 'zh-HK';

  // Mobile-first design based on the mockup
  return (
    <div className="bg-white flex flex-col items-center min-h-screen w-full" style={{
      fontFamily: "'Poppins', sans-serif"
    }}>
      <div className="w-full max-w-md px-4 py-6 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8 mt-0">
          <Logo className="w-full" style={{ transform: 'scale(1.5)' }} />
        </div>

        {/* Instruction Text */}
        <p className="mb-6 font-bold tagline-text" style={{ color: '#17B9E6' }}>
          {isZhHK
            ? '輸入你的活動、地點和時間，我們會為你規劃行程。'
            : 'Enter your activities, locations and times below, we\'ll create a day plan for you.'
          }
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full">
          {/* Date Field */}
          <div className="mb-6 bg-white rounded-2xl py-6 px-5 shadow-sm"
            style={{
              border: '1px solid transparent',
              backgroundImage: 'linear-gradient(white, white), linear-gradient(to right, #E6DBEE, #BCC6E6)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              minHeight: '80px' // Increased height
            }}
          >
            <label
              htmlFor="date"
              className="block mb-2 font-bold text-xl text-[#1C1C1C]"
            >
              {isZhHK ? '日期' : 'Date'}
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent text-gray-700 focus:outline-none text-lg pl-3 py-2"
              required
            />
          </div>

          {/* Time Field */}
          <div className="mb-6 bg-white rounded-2xl py-6 px-5 shadow-sm"
            style={{
              border: '1px solid transparent',
              backgroundImage: 'linear-gradient(white, white), linear-gradient(to right, #E6DBEE, #BCC6E6)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              minHeight: '80px' // Increased height
            }}
          >
            <label
              htmlFor="time"
              className="block mb-2 font-bold text-xl text-[#1C1C1C]"
            >
              {isZhHK ? '時間' : 'Time'}
            </label>
            <input
              type="time"
              id="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-transparent text-gray-700 focus:outline-none text-lg pl-3 py-2"
              required
            />
          </div>

          {/* Plans Field */}
          <div className="mb-4 bg-white rounded-2xl py-6 px-5 shadow-sm"
            style={{
              border: '1px solid transparent',
              backgroundImage: 'linear-gradient(white, white), linear-gradient(to right, #E6DBEE, #BCC6E6)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box'
            }}
          >
            <label
              htmlFor="plans"
              className="block mb-2 font-bold text-xl text-[#1C1C1C]"
            >
              {isZhHK ? '你的計劃' : 'Your Plans'}
            </label>
            <textarea
              id="plans"
              value={plans}
              onChange={(e) => setPlans(e.target.value)}
              className="w-full bg-transparent text-gray-700 focus:outline-none text-lg min-h-[135px] p-3"
              placeholder={isZhHK
                ? '例如：早上飲咖啡 -- 中環午餐12點 -- 工作到6點 -- 蘭桂坊飲嘢'
                : 'e.g. Morning coffee for calls -- lunch meeting in Mayfair at 12 -- work until 6 -- drinks in Chelsea'
              }
              required
            />
          </div>

          {/* Example Prompts */}
          <div className="mb-6">
            <ExamplePrompts
              onSelect={(prompt) => setPlans(prompt)}
              cityName={selectedCity.name}
            />
          </div>

          {/* Weather Awareness Toggle */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setWeatherAware(!weatherAware)}
              className="w-full py-4 px-5 rounded-2xl flex items-center justify-between transition-all duration-200"
              style={{
                background: weatherAware
                  ? 'linear-gradient(135deg, #17B9E6 0%, #1D8BC4 100%)'
                  : 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
                color: weatherAware ? 'white' : '#6B7280',
                border: weatherAware ? 'none' : '2px solid #E5E7EB',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              <div className="flex items-center gap-3">
                {weatherAware ? (
                  <Cloud className="h-5 w-5" />
                ) : (
                  <CloudOff className="h-5 w-5" />
                )}
                <div className="text-left">
                  <div className="font-bold text-lg">
                    {weatherAware
                      ? (isZhHK ? '天氣感知開啟' : 'Weather Aware')
                      : (isZhHK ? '天氣感知關閉' : 'Weather Off')
                    }
                  </div>
                  <div className="text-sm opacity-80">
                    {weatherAware
                      ? (isZhHK ? '根據天氣推薦場所' : 'Get weather-smart venue recommendations')
                      : (isZhHK ? '使用標準推薦' : 'Use standard venue recommendations')
                    }
                  </div>
                </div>
              </div>
              <div
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                style={{
                  borderColor: weatherAware ? 'white' : '#D1D5DB',
                  backgroundColor: weatherAware ? 'white' : 'transparent',
                }}
              >
                {weatherAware && (
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#17B9E6' }} />
                )}
              </div>
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-4 rounded-2xl"
            style={{
              background: '#17B9E6',
              color: 'white',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.8 : 1,
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="loading-indicator" style={{
                  width: 20,
                  height: 20,
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span>{isZhHK ? '正在規劃...' : 'Creating Plan...'}</span>
              </div>
            ) : (
              isZhHK ? '規劃行程' : 'Create Plan'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InputScreen;
