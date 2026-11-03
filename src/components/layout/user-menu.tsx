"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { ChevronsUpDown, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "@/components/theme";
import { useEffect, useTransition } from "react";
import { signOutAction } from "@/features/auth/actions";
import { updatePreferencesAction } from "@/features/profile/actions";
import type { ThemePref } from "@/features/profile/schemas";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

export type MenuUser = { name: string; email: string; theme: ThemePref };

const itemClass =
  "flex h-8 cursor-pointer items-center gap-2.5 rounded-[5px] px-2 text-[13px] text-fg-2 outline-none select-none data-[highlighted]:bg-surface-2 data-[highlighted]:text-fg [&_svg]:size-4 [&_svg]:text-fg-3";

/** Aplica o tema salvo no perfil (ex.: alterado em outro aparelho). */
export function ThemeSync({ theme }: { theme: ThemePref }) {
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);
  return null;
}

export function UserMenu({ user, compact = false }: { user: MenuUser; compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [, startTransition] = useTransition();

  const chooseTheme = (value: string) => {
    const next = value as ThemePref;
    setTheme(next);
    startTransition(async () => {
      await updatePreferencesAction({ theme: next });
    });
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "flex cursor-pointer items-center gap-2.5 rounded-md text-left outline-none transition-colors",
          "focus-visible:outline-2 focus-visible:outline-accent data-[state=open]:bg-surface-2",
          compact ? "p-1" : "h-11 w-full px-2 hover:bg-surface-2",
        )}
        aria-label="Abrir menu da conta"
      >
        <Avatar name={user.name} size={compact ? 28 : 26} />
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-fg">{user.name}</span>
              <span className="block truncate text-[12px] text-fg-3">{user.email}</span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-fg-3" />
          </>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side={compact ? "bottom" : "top"}
          align={compact ? "end" : "start"}
          sideOffset={6}
          className="z-50 w-[232px] origin-(--radix-dropdown-menu-content-transform-origin) rounded-lg bg-surface-3 p-1 shadow-pop data-[state=open]:animate-pop"
        >
          <div className="px-2 pt-1.5 pb-2">
            <p className="truncate text-[13px] font-medium text-fg">{user.name}</p>
            <p className="truncate text-[12px] text-fg-3">{user.email}</p>
          </div>
          <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border" />
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/configuracoes">
              <Settings />
              Configurações
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border" />
          <DropdownMenu.Label className="px-2 pt-1 pb-1 text-[12px] text-fg-3">Tema</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={theme} onValueChange={chooseTheme}>
            {(
              [
                ["dark", "Escuro", Moon],
                ["light", "Claro", Sun],
                ["system", "Do sistema", Monitor],
              ] as const
            ).map(([value, label, Icon]) => (
              <DropdownMenu.RadioItem key={value} value={value} className={cn(itemClass, "pr-2")}>
                <Icon />
                <span className="flex-1">{label}</span>
                <DropdownMenu.ItemIndicator>
                  <span className="block size-1.5 rounded-full bg-accent" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border" />
          <DropdownMenu.Item
            className={itemClass}
            onSelect={() => {
              startTransition(async () => {
                await signOutAction();
              });
            }}
          >
            <LogOut />
            Sair
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
