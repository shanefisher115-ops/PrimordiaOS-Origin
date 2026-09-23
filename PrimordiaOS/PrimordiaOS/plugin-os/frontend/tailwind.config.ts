import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        void: "#05030d",
        abyss: "#09051a",
        cosmic: "#17103a",
        ion: "#27d8ff",
        plasma: "#ff385c",
        ember: "#ff9f43",
        aether: "#f8d77b"
      },
      fontFamily: {
        terminal: ["'JetBrains Mono'", "'Fira Code'", "'Cascadia Code'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        cosmic: "0 0 40px rgba(39, 216, 255, 0.18), 0 0 90px rgba(255, 56, 92, 0.12)",
        glyph: "0 0 28px rgba(248, 215, 123, 0.28)",
        "glow-ion": "0 0 20px rgba(39, 216, 255, 0.35), 0 0 60px rgba(39, 216, 255, 0.15)",
        "glow-plasma": "0 0 20px rgba(255, 56, 92, 0.35), 0 0 60px rgba(255, 56, 92, 0.15)",
        "glow-ember": "0 0 20px rgba(255, 159, 67, 0.35), 0 0 60px rgba(255, 159, 67, 0.15)",
        "glow-antigravity": "0 0 20px rgba(0, 255, 136, 0.3), 0 0 60px rgba(39, 216, 255, 0.15)",
      },
      backgroundImage: {
        "nebula-radial": "radial-gradient(circle at 20% 20%, rgba(255,56,92,.28), transparent 30%), radial-gradient(circle at 80% 10%, rgba(39,216,255,.24), transparent 28%), radial-gradient(circle at 55% 85%, rgba(248,215,123,.16), transparent 32%)",
        "plasma-sweep": "linear-gradient(110deg, #27d8ff, #7c3aed, #ff385c, #f8d77b)"
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" }
        },
        "purl-pulse": {
          "0%, 100%": { boxShadow: "0 0 0px rgba(39, 216, 255, 0)", opacity: "1" },
          "50%": { boxShadow: "0 0 16px rgba(39, 216, 255, 0.5)", opacity: "0.85" }
        },
        "terminal-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" }
        },
        "antigravity-scan": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 200px" }
        },
        "node-pulse": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(39, 216, 255, 0.4)", transform: "scale(1)" },
          "50%": { boxShadow: "0 0 18px rgba(39, 216, 255, 0.7)", transform: "scale(1.08)" }
        },
      },
      animation: {
        shimmer: "shimmer 3s linear infinite",
        "purl-pulse": "purl-pulse 2s ease-in-out infinite",
        "terminal-blink": "terminal-blink 0.8s step-end infinite",
        "antigravity-scan": "antigravity-scan 4s linear infinite",
        "node-pulse": "node-pulse 2s ease-in-out infinite",
      }
    }
  },
  plugins: []
};

export default config;
