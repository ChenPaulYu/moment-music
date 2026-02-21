import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#6347ff",
        "background-dark": "#131022",
        "background-light": "#f6f6f8",
        surface: "#1e1933",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        serif: ["Playfair Display", "serif"],
        body: ["Noto Sans", "system-ui", "sans-serif"],
      },
      animation: {
        blob: "blob 10s infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        wave: "wave 1.2s ease-in-out infinite",
        "ping-slow": "ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite",
        "page-enter": "page-enter 0.5s cubic-bezier(0.4, 0, 0.2, 1) both",
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.4, 0, 0.2, 1) both",
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        wave: {
          "0%, 100%": { transform: "scaleY(0.5)" },
          "50%": { transform: "scaleY(1)" },
        },
        "ping-slow": {
          "75%, 100%": { transform: "scale(2)", opacity: "0" },
        },
        "page-enter": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [animate],
} satisfies Config;
