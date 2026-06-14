/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FBFAF7",
        surface: "#FFFFFF",
        ink: "#16161D",
        muted: "#6B6B76",
        line: "#E6E3DC",
        pine: {
          DEFAULT: "#1F6F5C",
          dark: "#185647",
          light: "#E7F0EC",
        },
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,22,29,0.04), 0 8px 24px -16px rgba(22,22,29,0.18)",
      },
    },
  },
  plugins: [],
};
