/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    blue: '#3B82F6',   // Standard Tailwind Blue 500
                    green: '#22C55E',  // Green 500
                    red: '#EF4444',    // Red 500
                    yellow: '#EAB308', // Yellow 500
                }
            }
        },
    },
    plugins: [],
}
