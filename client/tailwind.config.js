/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Design tokens
        bg: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          raised: 'var(--bg-surface-raised)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
        },
        accent: {
          mint: 'var(--accent-mint)',
          record: 'var(--accent-record)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
        },
        border: {
          DEFAULT: 'var(--border)',
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,.4), 0 4px 16px 0 rgba(0,0,0,.3)',
        'card-md': '0 4px 24px 0 rgba(0,0,0,.5), 0 1px 4px 0 rgba(0,0,0,.4)',
        'card-lg': '0 8px 40px 0 rgba(0,0,0,.6), 0 2px 8px  0 rgba(0,0,0,.5)',
        'glow': '0 0 32px rgba(108,92,231,.5)',
        'glow-sm': '0 0 16px rgba(108,92,231,.35)',
        'inner-sm': 'inset 0 1px 2px rgba(0,0,0,.4)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6C5CE7 0%, #2DD4A7 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(108,92,231,.12) 0%, rgba(45,212,167,.12) 100%)',
        'hero-mesh': 'radial-gradient(ellipse at 15% 40%, rgba(108,92,231,.09) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(45,212,167,.08) 0%, transparent 50%)',
        // Aliases so existing classes like 'bg-gradient-brand' work
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-brand': 'var(--gradient-hero)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%, 100%': { transform: 'scale(1)', opacity: '.7' },
          '50%': { transform: 'scale(1.08)', opacity: '.4' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'record-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '.5', transform: 'scale(1.15)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .4s ease-out both',
        'scale-in': 'scale-in .3s ease-out both',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'record-pulse': 'record-pulse 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
