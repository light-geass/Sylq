/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background:                '#111111',
        surface:                   '#171717',
        'surface-dim':             '#171717',
        'surface-bright':          '#3a3a3a',
        'surface-container-lowest':'#0a0a0a',
        'surface-container-low':   '#1f1f1f',
        'surface-container':       '#262626',
        'surface-container-high':  '#333333',
        'surface-container-highest':'#404040',
        'on-surface':              '#f4f4f5',
        'on-surface-variant':      '#a1a1aa',
        'outline':                 '#71717a',
        'outline-variant':         '#3f3f46',
        'primary':                 '#e2e8f0',
        'on-primary':              '#0f172a',
        'primary-container':       '#cbd5e1',
        'secondary':               '#f8fafc',
        'on-secondary':            '#020617',
        'secondary-container':     '#e2e8f0',
        'tertiary':                '#d4d4d8',
        'on-tertiary':             '#18181b',
        'tertiary-container':      '#a1a1aa',
        'error':                   '#fca5a5',
        'on-error':                '#450a0a',
        'error-container':         '#7f1d1d',
        'surface-variant':         '#3f3f46',
      },
      fontFamily: {
        sans:  ['Inter', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-lg':    ['48px', { lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '800' }],
        'headline-lg':   ['32px', { lineHeight: '1.2',  fontWeight: '700' }],
        'headline-md':   ['24px', { lineHeight: '1.3',  fontWeight: '600' }],
        'body-lg':       ['18px', { lineHeight: '1.6',  fontWeight: '400' }],
        'body-md':       ['16px', { lineHeight: '1.6',  fontWeight: '400' }],
        'technical-data':['14px', { lineHeight: '1.4',  letterSpacing: '0.05em', fontWeight: '500' }],
        'label-sm':      ['12px', { lineHeight: '1',    fontWeight: '700' }],
      },
      maxWidth: {
        container: '1280px',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        md:      '0.5rem',
        lg:      '0.75rem',
        xl:      '1rem',
        '2xl':   '1.5rem',
        full:    '9999px',
      },
      backdropBlur: {
        glass: '10px',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(248,250,252,0.3)' },
          '50%':       { boxShadow: '0 0 40px rgba(248,250,252,0.6)' },
        },
      },
      animation: {
        'fade-in':    'fade-in 0.4s ease-out forwards',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
