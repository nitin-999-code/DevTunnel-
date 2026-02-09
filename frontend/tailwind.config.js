/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: {
                    900: '#0a0a0f',
                    800: '#12121a',
                    700: '#1a1a24',
                    600: '#24242f',
                    500: '#2e2e3a',
                    400: '#3d3d4a',
                    300: '#4d4d5a',
                },
                cyan: {
                    400: '#22d3ee',
                    500: '#06b6d4',
                    600: '#0891b2',
                },
                neon: {
                    cyan: '#06b6d4',
                    purple: '#8b5cf6',
                    green: '#10b981',
                    orange: '#f59e0b',
                    red: '#ef4444',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', 'monospace'],
            },
            boxShadow: {
                'glow-sm': '0 0 10px rgba(6, 182, 212, 0.2)',
                'glow': '0 0 20px rgba(6, 182, 212, 0.3)',
                'glow-lg': '0 0 30px rgba(6, 182, 212, 0.4)',
                'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 4s ease-in-out infinite',
                'gradient': 'gradient 3s ease infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                gradient: {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
}
