/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          indigo: "#6366F1",
          violet: "#8B5CF6",
          cyan: "#22D3EE",
        },
        ink: {
          900: "#0B0F1A",
          800: "#111827",
          700: "#1F2937",
        },
      },
      fontFamily: {
        sans: ["PingFang-SC", "system-ui", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-scale-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.7) rotate(-3deg)" },
          "60%": { opacity: "1", transform: "scale(1.05)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-scale-in": "fade-scale-in 0.6s cubic-bezier(0.22,1,0.36,1) both",
        "slide-in-right": "slide-in-right 0.35s cubic-bezier(0.22,1,0.36,1) both",
        "pop-in": "pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
