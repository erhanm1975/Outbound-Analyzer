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
                "background-light": "#f5f6f8",
                "background-dark": "#111418", // Stitch Main BG
                "surface-light": "#FFFFFF",
                "surface-dark": "#151b23", // Stitch Card BG
                "text-light": "#0f172a",
                "text-dark": "#ffffff",
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
