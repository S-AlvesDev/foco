"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { updatePreferencesAction } from "../actions";
import type { PreferencesInput, ThemePref } from "../schemas";
import { TimezonePicker } from "./timezone-picker";

type Prefs = { theme: ThemePref; timezone: string; week_starts_on: 0 | 1 };

/** Cada preferência salva sozinha assim que muda; em caso de erro, volta ao valor anterior. */
export function PreferencesForm({ initial }: { initial: Prefs }) {
  const { setTheme } = useTheme();
  const [pending, startTransition] = useTransition();
  const [prefs, setOptimistic] = useOptimistic(initial, (cur, patch: Partial<Prefs>) => ({
    ...cur,
    ...patch,
  }));

  const save = (patch: PreferencesInput & Partial<Prefs>, message: string) => {
    startTransition(async () => {
      setOptimistic(patch);
      if (patch.theme) setTheme(patch.theme);
      const result = await updatePreferencesAction(patch);
      if (result.ok) {
        toast.success(message);
      } else {
        if (patch.theme) setTheme(initial.theme);
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-7">
      <Pref label="Tema" description="O escuro é o padrão. Também dá para trocar pelo menu da conta.">
        <Segmented<ThemePref>
          label="Tema"
          value={prefs.theme}
          onChange={(theme) => save({ theme }, "Tema salvo")}
          options={[
            { value: "dark", label: "Escuro", icon: <Moon /> },
            { value: "light", label: "Claro", icon: <Sun /> },
            { value: "system", label: "Sistema", icon: <Monitor /> },
          ]}
        />
      </Pref>

      <Pref
        label="Fuso horário"
        labelFor="timezone"
        description="Define quando um dia de estudo começa e termina."
      >
        <TimezonePicker
          id="timezone"
          value={prefs.timezone}
          onChange={(timezone) => save({ timezone }, "Fuso horário salvo")}
        />
      </Pref>

      <Pref label="Semana começa em" description="Usado nas metas semanais e nos relatórios.">
        <Segmented<0 | 1>
          label="Semana começa em"
          value={prefs.week_starts_on}
          onChange={(week_starts_on) => save({ week_starts_on }, "Início da semana salvo")}
          options={[
            { value: 1, label: "Segunda" },
            { value: 0, label: "Domingo" },
          ]}
        />
      </Pref>

      <p className="flex h-4 items-center gap-2 text-[12.5px] text-fg-3" aria-live="polite">
        {pending ? (
          <>
            <Spinner className="size-3.5" /> Salvando…
          </>
        ) : (
          "Alterações salvas automaticamente."
        )}
      </p>
    </div>
  );
}

function Pref({
  label,
  labelFor,
  description,
  children,
}: {
  label: string;
  labelFor?: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        {labelFor ? (
          <label htmlFor={labelFor} className="text-[13px] font-medium text-fg-2">
            {label}
          </label>
        ) : (
          <p className="text-[13px] font-medium text-fg-2">{label}</p>
        )}
        <p className="text-[12.5px] text-fg-3">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}
