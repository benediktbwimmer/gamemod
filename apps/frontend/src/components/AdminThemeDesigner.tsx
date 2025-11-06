import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { useStaffSettingsMutation, useStaffSettingsQuery } from "@/hooks/useStaffSettings";
import { useStaffAuth } from "@/lib/staffAuth";
import { applyTheme, defaultTheme } from "@/lib/theme";
import type { ThemeConfig } from "@/lib/theme";

const quickPalettes: Array<{
  label: string;
  theme: ThemeConfig;
}> = [
  {
    label: "Aurora",
    theme: {
      primary: "#14b8a6",
      surface: "#04151f",
      surfaceMuted: "#0b2736",
      surfaceSubtle: "#153b51",
      backgroundAccentOne: "#083344",
      backgroundAccentTwo: "#145b6c"
    }
  },
  {
    label: "Crimson Forge",
    theme: {
      primary: "#ef4444",
      surface: "#190810",
      surfaceMuted: "#2a111d",
      surfaceSubtle: "#391524",
      backgroundAccentOne: "#4a1424",
      backgroundAccentTwo: "#7f1d1d"
    }
  },
  {
    label: "Nebula",
    theme: {
      primary: "#8b5cf6",
      surface: "#0d1126",
      surfaceMuted: "#161d3a",
      surfaceSubtle: "#1f2852",
      backgroundAccentOne: "#272f75",
      backgroundAccentTwo: "#5b21b6"
    }
  },
  {
    label: "Solar Flare",
    theme: {
      primary: "#f97316",
      surface: "#140b03",
      surfaceMuted: "#261406",
      surfaceSubtle: "#3b1f0c",
      backgroundAccentOne: "#5a2509",
      backgroundAccentTwo: "#f59e0b"
    }
  },
  {
    label: "Glacier",
    theme: {
      primary: "#38bdf8",
      surface: "#031521",
      surfaceMuted: "#082132",
      surfaceSubtle: "#0c2d45",
      backgroundAccentOne: "#164e63",
      backgroundAccentTwo: "#0ea5e9"
    }
  },
  {
    label: "Obsidian",
    theme: {
      primary: "#a855f7",
      surface: "#050508",
      surfaceMuted: "#121023",
      surfaceSubtle: "#1b1733",
      backgroundAccentOne: "#211945",
      backgroundAccentTwo: "#3b0764"
    }
  }
];

type StatusState = "saved" | "reset" | "preview" | null;

export function AdminThemeDesigner() {
  const { adminKey } = useStaffAuth();
  const settingsQuery = useStaffSettingsQuery();
  const mutation = useStaffSettingsMutation(adminKey);

  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [status, setStatus] = useState<StatusState>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQuery.data?.theme) {
      setTheme(settingsQuery.data.theme);
      applyTheme(settingsQuery.data.theme);
    }
  }, [settingsQuery.data?.theme]);

  useEffect(() => {
    if (!status || status === "preview") {
      return;
    }

    const timeout = window.setTimeout(() => setStatus(null), 2_400);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const referenceTheme = settingsQuery.data?.theme ?? defaultTheme;
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(theme) !== JSON.stringify(referenceTheme);
  }, [theme, referenceTheme]);

  const handleColorChange = (key: keyof ThemeConfig) => {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const nextTheme = {
        ...theme,
        [key]: event.target.value
      };
      setTheme(nextTheme);
      applyTheme(nextTheme);
      setStatus("preview");
    };
  };

  const handlePaletteSelect = (palette: ThemeConfig) => {
    setTheme(palette);
    applyTheme(palette);
    setStatus("preview");
  };

  const handleSave = () => {
    if (!hasUnsavedChanges || mutation.isPending) {
      return;
    }
    setErrorMessage(null);
    mutation
      .mutateAsync({ theme })
      .then(() => {
        setStatus("saved");
      })
      .catch((error) => {
        setStatus(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to save theme."
        );
      });
  };

  const handleReset = () => {
    setErrorMessage(null);
    mutation
      .mutateAsync({ theme: defaultTheme })
      .then(() => {
        setTheme(defaultTheme);
        applyTheme(defaultTheme);
        setStatus("reset");
      })
      .catch((error) => {
        setStatus(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to reset theme."
        );
      });
  };

  if (settingsQuery.isLoading && !settingsQuery.data) {
    return (
      <section className="rounded-2xl border border-surface-subtle bg-surface/80 p-6">
        <p className="text-sm text-slate-400">Loading theme designer…</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-surface-subtle bg-surface/80 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Theme Designer</h2>
          <p className="text-sm text-slate-400">
            Adjust the control center palette in real-time. Changes apply to everyone once
            saved.
          </p>
        </div>
        {status ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === "saved"
                ? "bg-emerald-500/20 text-emerald-200"
                : status === "reset"
                ? "bg-slate-500/20 text-slate-200"
                : "bg-primary/20 text-primary-foreground"
            }`}
          >
            {status === "saved"
              ? "Theme saved"
              : status === "reset"
              ? "Theme reset"
              : "Previewing…"}
          </span>
        ) : null}
      </header>

      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <fieldset className="space-y-4">
            <legend className="text-xs uppercase tracking-widest text-slate-400">
              Core palette
            </legend>

            <ThemeColorRow
              id="primary"
              label="Primary Accent"
              color={theme.primary}
              onChange={handleColorChange("primary")}
            />
            <ThemeColorRow
              id="surface"
              label="Surface"
              color={theme.surface}
              onChange={handleColorChange("surface")}
            />
            <ThemeColorRow
              id="surfaceMuted"
              label="Surface Muted"
              color={theme.surfaceMuted}
              onChange={handleColorChange("surfaceMuted")}
            />
            <ThemeColorRow
              id="surfaceSubtle"
              label="Surface Subtle"
              color={theme.surfaceSubtle}
              onChange={handleColorChange("surfaceSubtle")}
            />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-xs uppercase tracking-widest text-slate-400">
              Background nebula
            </legend>

            <ThemeColorRow
              id="accentOne"
              label="Accent A"
              color={theme.backgroundAccentOne}
              onChange={handleColorChange("backgroundAccentOne")}
            />
            <ThemeColorRow
              id="accentTwo"
              label="Accent B"
              color={theme.backgroundAccentTwo}
              onChange={handleColorChange("backgroundAccentTwo")}
            />
          </fieldset>
        </div>

        <aside className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-white">Quick palettes</h3>
            <p className="text-xs text-slate-400">
              Jump-start with a curated theme, then fine-tune.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickPalettes.map((palette) => (
                <button
                  key={palette.label}
                  type="button"
                  onClick={() => handlePaletteSelect(palette.theme)}
                  className="flex items-center gap-2 rounded-lg border border-surface-subtle bg-surface-muted/40 px-3 py-2 text-xs font-medium text-slate-200 hover:border-primary hover:text-white"
                >
                  <span
                    className="inline-flex h-4 w-4 rounded-full"
                    style={{ background: palette.theme.primary }}
                  />
                  {palette.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-surface-subtle bg-surface-muted/30 p-4 text-xs text-slate-300">
            <p>
              Theme settings are stored in your browser only. Team members can supply their
              own palettes without affecting production traffic.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || mutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              {mutation.isPending ? "Saving…" : "Save theme"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-surface-subtle px-4 py-2 text-sm font-medium text-slate-200 hover:border-primary/60 hover:text-white"
            >
              Reset to default
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

type ThemeColorRowProps = {
  id: string;
  label: string;
  color: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function ThemeColorRow({ id, label, color, onChange }: ThemeColorRowProps) {
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-300">{label}</span>
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-8 w-8 rounded-full border border-white/10 shadow"
          style={{ backgroundColor: color }}
        />
        <input
          id={id}
          type="color"
          value={color}
          onChange={onChange}
          className="h-9 w-16 cursor-pointer rounded-lg border border-surface-subtle bg-surface-muted/30 p-1"
        />
      </div>
    </label>
  );
}
