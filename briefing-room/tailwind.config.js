/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0F0D0A",
        surface: "rgba(200,169,126,0.05)",
        border: "rgba(200,169,126,0.15)",
        accent: "#C8A97E",
        "accent-hover": "#D4A86A",
        "text-primary": "#E8DCC8",
        "text-secondary": "#A89070",
        "text-muted": "#7A6A55",
      },
      fontFamily: {
        serif: ["DM Serif Display", "serif"],
        body: ["Crimson Pro", "serif"],
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.6s ease-out forwards",
        "fadeUp-delay": "fadeUp 0.6s ease-out 0.2s forwards",
        "fadeUp-delay2": "fadeUp 0.6s ease-out 0.4s forwards",
      },
    },
  },
  plugins: [],
};
