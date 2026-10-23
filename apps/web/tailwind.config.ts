import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sakura: {
          DEFAULT: '#FF2D9B',
          glow: '#FF47C7',
          50: '#fff1f9',
          100: '#ffe4f3',
          200: '#ffc9e8',
          300: '#ff9ed6',
          400: '#ff61bc',
          500: '#FF2D9B',
          600: '#e61483',
          700: '#c2096a',
          800: '#a00c58',
          900: '#840f4b',
        },
        dark: {
          DEFAULT: '#080608',
          bg: '#000000',
          card: '#0D0A0C',
          surface: '#131014',
          input: '#1A151A',
          hover: 'rgba(255, 255, 255, 0.04)',
        },
        brand: {
          border: 'rgba(255, 45, 155, 0.25)',
          'border-bright': 'rgba(255, 45, 155, 0.58)',
          'border-subtle': 'rgba(255, 255, 255, 0.09)',
        },
      },
      boxShadow: {
        'sakura-glow': '0 0 20px rgba(255, 45, 155, 0.28)',
        'sakura-bright': '0 0 30px rgba(255, 45, 155, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
