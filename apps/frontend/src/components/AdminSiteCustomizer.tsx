import { useEffect, useMemo, useState } from "react";

import { useStaffSettingsMutation, useStaffSettingsQuery } from "@/hooks/useStaffSettings";
import { useStaffAuth } from "@/lib/staffAuth";
import {
  defaultStaffSiteSettings,
  type StaffSiteSettings
} from "@/lib/staffSettings";

export function AdminSiteCustomizer() {
  const { adminKey } = useStaffAuth();
  const settingsQuery = useStaffSettingsQuery();
  const mutation = useStaffSettingsMutation(adminKey);

  const [siteDraft, setSiteDraft] = useState<StaffSiteSettings>(defaultStaffSiteSettings);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQuery.data?.site) {
      setSiteDraft(settingsQuery.data.site);
    }
  }, [settingsQuery.data?.site]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(siteDraft) !== JSON.stringify(settingsQuery.data?.site ?? defaultStaffSiteSettings);
  }, [siteDraft, settingsQuery.data?.site]);

  const persist = (next: StaffSiteSettings) => {
    setSiteDraft(next);

    if (!adminKey) {
      setErrorMessage("Staff credentials required to update site copy.");
      return;
    }

    setErrorMessage(null);
    mutation.mutate(
      { site: next },
      {
        onError: (error) => {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to update site copy."
          );
        }
      }
    );
  };

  const handleReset = () => {
    if (!adminKey) {
      setErrorMessage("Staff credentials required to reset site copy.");
      return;
    }

    setErrorMessage(null);
    mutation
      .mutateAsync({ site: defaultStaffSiteSettings })
      .then(() => {
        setSiteDraft(defaultStaffSiteSettings);
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to reset site copy."
        );
      });
  };

  if (settingsQuery.isLoading && !settingsQuery.data) {
    return (
      <section className="rounded-2xl border border-surface-subtle bg-surface/80 p-6">
        <p className="text-sm text-slate-400">Loading site customizer…</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-surface-subtle bg-surface/80 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Site Customizer</h2>
          <p className="text-sm text-slate-400">
            Tailor dashboard labels and visibility for your moderation crew. Updates apply
            instantly to everyone once saved.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-surface-subtle px-3 py-2 text-xs font-medium text-slate-200 hover:border-primary/60 hover:text-white"
        >
          Reset to defaults
        </button>
      </header>

      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-widest text-slate-400">
              Branding
            </legend>

            <LabelledInput
              label="Corner label"
              value={siteDraft.brandLabel}
              onChange={(value) =>
                persist({
                  ...siteDraft,
                  brandLabel: value
                })
              }
              placeholder="GameMod"
            />
            <LabelledInput
              label="Corner headline"
              value={siteDraft.brandHeading}
              onChange={(value) =>
                persist({
                  ...siteDraft,
                  brandHeading: value
                })
              }
              placeholder="Control Center"
            />
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-widest text-slate-400">
              Header copy
            </legend>
            <LabelledInput
              label="Header note"
              value={siteDraft.headerNote}
              onChange={(value) =>
                persist({
                  ...siteDraft,
                  headerNote: value
                })
              }
              placeholder="Operations Checkpoint"
            />
            <LabelledInput
              label="Greeting line"
              value={siteDraft.headerGreeting}
              onChange={(value) =>
                persist({
                  ...siteDraft,
                  headerGreeting: value
                })
              }
              placeholder="Welcome back, Commander Vega"
            />
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs uppercase tracking-widest text-slate-400">
              Sidebar card
            </legend>
            <LabelledInput
              label="Guild name"
              value={siteDraft.guildName}
              onChange={(value) =>
                persist({
                  ...siteDraft,
                  guildName: value
                })
              }
              placeholder="NovaWatch"
            />
            <ToggleRow
              label="Show guild summary card"
              checked={siteDraft.showGuildCard}
              onToggle={(checked) =>
                persist({
                  ...siteDraft,
                  showGuildCard: checked
                })
              }
            />
          </fieldset>
        </form>

        <aside className="space-y-4">
          <ToggleRow
            label="Show topics list in staff tools"
            checked={siteDraft.showTopicsPanel}
            onToggle={(checked) =>
              persist({
                ...siteDraft,
                showTopicsPanel: checked
              })
            }
          />

          <div className="rounded-xl border border-surface-subtle bg-surface-muted/30 p-4 text-xs text-slate-300">
            <p>
              Brand and layout updates are stored centrally. Refresh the page for the
              latest palette and copy.
            </p>
          </div>

          {hasChanges ? (
            <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary-foreground">
              Changes were updated. Use the reset button to restore the default GameMod
              styling.
            </p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

type LabelledInputProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

function LabelledInput({ label, value, placeholder, onChange }: LabelledInputProps) {
  return (
    <label className="block text-sm">
      <span className="text-slate-300">{label}</span>
      <input
        type="text"
        className="mt-1 w-full rounded-lg border border-surface-subtle bg-surface-muted/40 px-3 py-2 text-sm text-white outline-none focus:border-primary"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

type ToggleRowProps = {
  label: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
};

function ToggleRow({ label, checked, onToggle }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-surface-subtle bg-surface-muted/30 px-4 py-3 text-sm text-slate-200">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onToggle(event.target.checked)}
        className="h-4 w-4 cursor-pointer accent-primary"
      />
    </label>
  );
}
