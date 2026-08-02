import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Wanago brand — green palette
        brand: {
          50:  "#f0faf4",
          100: "#daf2e4",
          200: "#b8e4ca",
          300: "#88cfab",
          400: "#52b484",
          500: "#228050",  // primary green
          600: "#1a6341",
          700: "#134a32",  // dark green
          800: "#0f3826",
          900: "#0a2518",
          950: "#051409",
        },
        amber: {
          brand: "#c9a84c",
        },
        // Semantic aliases (shadcn/ui compatible)
        background:    "hsl(var(--background))",
        foreground:    "hsl(var(--foreground))",
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border:  "hsl(var(--border))",
        input:   "hsl(var(--input))",
        ring:    "hsl(var(--ring))",
        "dark-surface": {
          DEFAULT:    "hsl(var(--dark-surface))",
          foreground: "hsl(var(--dark-surface-foreground))",
        },
        sidebar: {
          DEFAULT:            "hsl(var(--sidebar-background))",
          foreground:         "hsl(var(--sidebar-foreground))",
          primary:            "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:             "hsl(var(--sidebar-accent))",
          "accent-foreground":"hsl(var(--sidebar-accent-foreground))",
          border:             "hsl(var(--sidebar-border))",
          ring:               "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      // Tighter line-heights than Tailwind's defaults, matching the existing
      // 14px body base — denser, more numbers-forward rhythm for stat tiles
      // and list rows (fintech-app density) without changing the base size.
      fontSize: {
        xs:    ["11px",   { lineHeight: "15px" }],
        sm:    ["12.5px", { lineHeight: "17px" }],
        base:  ["14px",   { lineHeight: "19px" }],
        lg:    ["15.5px", { lineHeight: "21px" }],
        xl:    ["17px",   { lineHeight: "23px" }],
        "2xl": ["19px",   { lineHeight: "24px" }],
        "3xl": ["23px",   { lineHeight: "28px" }],
      },
      spacing: {
        touch: "2.75rem", // 44px — minimum comfortable tap target
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0"  },
        },
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer:         "shimmer 1.4s infinite linear",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":        "fade-in 0.15s ease-out",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.12)",
        sidebar: "1px 0 0 0 hsl(var(--border))",
        nav: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 2px 8px -2px rgb(0 0 0 / 0.06)",
        "nav-bottom": "0 -1px 8px 0 rgb(0 0 0 / 0.04), 0 -1px 2px -1px rgb(0 0 0 / 0.03)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
