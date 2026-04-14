import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // 🔥 FIX INI (hapus array aneh tadi)
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // BASE
        background: "var(--background)",
        foreground: "var(--foreground)",

        // CARD
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",

        // PRIMARY
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",

        // SECONDARY
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",

        // MUTED
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",

        // ACCENT
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",

        // BORDER
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",

        // SIDEBAR 🔥 (INI PENTING)
        sidebar: "var(--sidebar)",
        "sidebar-foreground": "var(--sidebar-foreground)",
        "sidebar-accent": "var(--sidebar-accent)",
        "sidebar-accent-foreground": "var(--sidebar-accent-foreground)",
        "sidebar-border": "var(--sidebar-border)",
      },
    },
  },
  plugins: [],
};

export default config;