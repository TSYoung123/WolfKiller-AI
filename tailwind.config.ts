import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          glow: "hsl(var(--gold-glow))",
        },
        blood: {
          DEFAULT: "hsl(var(--blood))",
          dark: "hsl(var(--blood-dark))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          hover: "hsl(var(--surface-hover))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        title: ['"Cinzel"', "Georgia", "serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "moon-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "moon-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "twinkle": {
          "0%, 100%": { opacity: "0.2", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.5)" },
        },
        "float-star": {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)" },
          "25%": { transform: "translateY(-3px) translateX(1px)" },
          "75%": { transform: "translateY(2px) translateX(-1px)" },
        },
        "shooting-star": {
          "0%": { transform: "translateX(0) translateY(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": { transform: "translateX(80px) translateY(80px)", opacity: "0" },
        },
        "typewriter": {
          from: { width: "0" },
          to: { width: "100%" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
        "select-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.06)" },
          "70%": { transform: "scale(0.97)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
        "moon-spin": "moon-spin 60s linear infinite",
        "moon-float": "moon-float 4s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "twinkle": "twinkle 3s ease-in-out infinite",
        "float-star": "float-star 6s ease-in-out infinite",
        "shooting-star": "shooting-star 3s ease-in-out infinite",
        "typewriter": "typewriter 0.5s steps(20)",
        "shake": "shake 0.3s ease-in-out",
        "select-pop": "select-pop 0.35s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
