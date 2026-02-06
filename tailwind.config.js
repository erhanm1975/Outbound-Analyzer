/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#3B82F6",
                "background-light": "#F3F4F6",
                "background-dark": "#0F172A",
                "surface-light": "#FFFFFF",
                "surface-dark": "#1E293B",
                "text-light": "#334155",
                "text-dark": "#E2E8F0",
                "accent-blue": "#EFF6FF",
                "accent-blue-dark": "#1E3A8A",
                "accent-green": "#F0FDF4",
                "accent-green-text": "#16A34A",
                "accent-orange": "#FFF7ED",
                "accent-orange-text": "#EA580C",
                "accent-purple": "#FAF5FF",
                "accent-purple-text": "#9333EA",
                "border-light": "#E2E8F0",
                "border-dark": "#334155"
            },
            fontFamily: {
                display: ["Inter", "sans-serif"],
                body: ["Inter", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "0.5rem",
            },
        },
    },
    plugins: [],
}
