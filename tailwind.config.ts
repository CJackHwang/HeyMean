import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './{pages,components,hooks,services,utils}/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#333333',
        'background-light': '#ffffff',
        'background-dark': '#111111',
        'heymean-l': '#F0F0F0',
        'heymean-d': '#2C2C2C',
        'primary-text-light': '#333333',
        'primary-text-dark': '#ffffff',
        'thinking-dark': '#1A2B21',
        'thinking-text-dark': '#A6E0B3',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '1rem',
        xl: '1.5rem',
        '2xl': '2rem',
        full: '9999px',
      },
      transitionDuration: {
        moderate: '200ms',
      },
      transitionTimingFunction: {
        'out-quad': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [],
};

export default config;
