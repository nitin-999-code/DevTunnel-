/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: {
                    900: '#000000',
                    800: '#000a02',
                    700: '#001404',
                    600: '#002908',
                    500: '#003d0c',
                    400: '#005210',
                    300: '#006614',
                },
                cyan: { 50: '#00ff41', 100: '#00ff41', 200: '#00ff41', 300: '#00ff41', 400: '#00ff41', 500: '#00ff41', 600: '#00cc33', 700: '#009926', 800: '#00661a', 900: '#00330d' },
                blue: { 50: '#00ff41', 100: '#00ff41', 200: '#00ff41', 300: '#00ff41', 400: '#00ff41', 500: '#00ff41', 600: '#00cc33', 700: '#009926', 800: '#00661a', 900: '#00330d' },
                indigo: { 50: '#00ff41', 100: '#00ff41', 200: '#00ff41', 300: '#00ff41', 400: '#00ff41', 500: '#00ff41', 600: '#00cc33', 700: '#009926', 800: '#00661a', 900: '#00330d' },
                purple: { 50: '#00ff41', 100: '#00ff41', 200: '#00ff41', 300: '#00ff41', 400: '#00ff41', 500: '#00ff41', 600: '#00cc33', 700: '#009926', 800: '#00661a', 900: '#00330d' },
                pink: { 50: '#00ff41', 100: '#00ff41', 200: '#00ff41', 300: '#00ff41', 400: '#00ff41', 500: '#00ff41', 600: '#00cc33', 700: '#009926', 800: '#00661a', 900: '#00330d' },
                green: { 50: '#00ff41', 100: '#00ff41', 200: '#00ff41', 300: '#00ff41', 400: '#00ff41', 500: '#00ff41', 600: '#00cc33', 700: '#009926', 800: '#00661a', 900: '#00330d' },
                emerald: { 50: '#00ff41', 100: '#00ff41', 200: '#00ff41', 300: '#00ff41', 400: '#00ff41', 500: '#00ff41', 600: '#00cc33', 700: '#009926', 800: '#00661a', 900: '#00330d' },
                orange: { 50: '#ffb000', 100: '#ffb000', 200: '#ffb000', 300: '#ffb000', 400: '#ffb000', 500: '#ffb000', 600: '#cc8d00', 700: '#996a00', 800: '#664600', 900: '#332300' },
                yellow: { 50: '#ffb000', 100: '#ffb000', 200: '#ffb000', 300: '#ffb000', 400: '#ffb000', 500: '#ffb000', 600: '#cc8d00', 700: '#996a00', 800: '#664600', 900: '#332300' },
                red: { 50: '#ff0000', 100: '#ff0000', 200: '#ff0000', 300: '#ff0000', 400: '#ff0000', 500: '#ff0000', 600: '#cc0000', 700: '#990000', 800: '#660000', 900: '#330000' },
                gray: { 50: '#ccffcc', 100: '#99ff99', 200: '#66ff66', 300: '#33ff33', 400: '#00cc33', 500: '#009926', 600: '#00661a', 700: '#004d13', 800: '#00330d', 900: '#001a06' },
                neon: {
                    cyan: '#00ff41',
                    purple: '#00ff41',
                    green: '#00ff41',
                    orange: '#ffb000',
                    red: '#ff0000',
                },
            },
            fontFamily: {
                sans: ['"JetBrains Mono"', '"Fira Code"', '"SF Mono"', 'Consolas', 'monospace'],
                mono: ['"JetBrains Mono"', '"Fira Code"', '"SF Mono"', 'Consolas', 'monospace'],
            },
            boxShadow: {
                'glow-sm': '0 0 10px rgba(0, 255, 65, 0.2)',
                'glow': '0 0 20px rgba(0, 255, 65, 0.4)',
                'glow-lg': '0 0 40px rgba(0, 255, 65, 0.6)',
                'glow-purple': '0 0 20px rgba(0, 255, 65, 0.4)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 4s ease-in-out infinite',
                'gradient': 'none',
                'blink': 'blink 1s step-end infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
                blink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' },
                }
            },
            borderRadius: {
                'none': '0px',
                'sm': '0px',
                DEFAULT: '0px',
                'md': '0px',
                'lg': '0px',
                'xl': '0px',
                '2xl': '0px',
                '3xl': '0px',
                'full': '0px',
            },
            backdropBlur: {
                xs: '0px',
            },
        },
    },
    plugins: [],
}
