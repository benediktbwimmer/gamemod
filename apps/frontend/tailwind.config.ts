import type { Config } from "tailwindcss";

function withOpacity(variableName: string) {
  return ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue) {
      return `rgb(var(${variableName}) / ${opacityValue})`;
    }
    return `rgb(var(${variableName}))`;
  };
}

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: withOpacity("--color-primary"),
          foreground: withOpacity("--color-primary-foreground")
        },
        surface: {
          DEFAULT: withOpacity("--color-surface"),
          muted: withOpacity("--color-surface-muted"),
          subtle: withOpacity("--color-surface-subtle")
        }
      }
    }
  },
  plugins: []
};

export default config;
