/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    light: '#87CEEB',    // Light Blue
                    DEFAULT: '#3B82F6',  // Blue-500
                    dark: '#1E3A8A',     // Navy Blue
                },
                secondary: {
                    light: '#F3F4F6',    // Grey
                    DEFAULT: '#6B7280',  // Gray-500
                    dark: '#111827',     // Black
                },
                success: '#10B981',    // Green
                danger: '#EF4444',     // Red
                white: '#FFFFFF',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}