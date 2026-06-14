/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#0E1017",
        surface: "#161922",
        ink: "#E4E6F1",
        muted: "#7B7F9E",
        line: "#272B3D",
        pine: {
          DEFAULT: "#3ECFA8",
          dark: "#30B892",
          light: "#0D2620",
        },
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -16px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
