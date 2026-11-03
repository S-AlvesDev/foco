"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { MobileAddButton } from "@/features/timer/components/timer-widgets";
import { Ellipsis } from "lucide-react";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { PRIMARY_NAV, SETTINGS_NAV, TAB_BAR_PRIMARY, type NavItem } from "./nav-items";

const TAB_ITEMS = PRIMARY_NAV.filter((i) => TAB_BAR_PRIMARY.includes(i.href));
const MORE_ITEMS = [...PRIMARY_NAV.filter((i) => !TAB_BAR_PRIMARY.includes(i.href)), SETTINGS_NAV];

function useActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(href + "/");
}

/** Lê a URL (dinâmica); o fallback mostra os mesmos links sem destaque enquanto ela chega. */
function WithActive({ href, render }: { href: string; render: (active: boolean) => React.ReactNode }) {
  return (
    <Suspense fallback={render(false)}>
      <ActiveReader href={href} render={render} />
    </Suspense>
  );
}

function ActiveReader({ href, render }: { href: string; render: (active: boolean) => React.ReactNode }) {
  return render(useActive(href));
}

export function SidebarLink({ item }: { item: NavItem }) {
  return <WithActive href={item.href} render={(active) => <SidebarLinkView item={item} active={active} />} />;
}

function SidebarLinkView({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[13.5px] transition-colors duration-150",
        active ? "bg-surface-3 font-medium text-fg" : "text-fg-2 hover:bg-surface-2 hover:text-fg",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", active ? "text-fg" : "text-fg-3 group-hover:text-fg-2")}
        strokeWidth={1.75}
      />
      {item.label}
    </Link>
  );
}

export function TabBarLink({ item }: { item: NavItem }) {
  return <WithActive href={item.href} render={(active) => <TabBarLinkView item={item} active={active} />} />;
}

function TabBarLinkView({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[11px] font-medium transition-colors",
        active ? "text-fg" : "text-fg-3 active:text-fg-2",
      )}
    >
      <Icon className="size-[22px]" strokeWidth={active ? 2 : 1.6} />
      {item.short ?? item.label}
    </Link>
  );
}

/* Listas montadas no cliente: ícones são componentes e não podem vir do servidor como props. */

export function SidebarNav() {
  return (
    <nav aria-label="Principal" className="flex flex-1 flex-col gap-0.5 px-2 pt-2">
      {PRIMARY_NAV.map((item) => (
        <SidebarLink key={item.href} item={item} />
      ))}
    </nav>
  );
}

export function SidebarSettingsLink() {
  return <SidebarLink item={SETTINGS_NAV} />;
}

export function TabBar() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface-1/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      {/* Painel, Sessões, [+], Matérias, Mais */}
      {TAB_ITEMS.slice(0, 2).map((item) => (
        <TabBarLink key={item.href} item={item} />
      ))}
      <MobileAddButton />
      {TAB_ITEMS.slice(2).map((item) => (
        <TabBarLink key={item.href} item={item} />
      ))}
      <MoreTab />
    </nav>
  );
}

/** "Mais": módulos que não cabem na barra inferior. */
function MoreTab() {
  return (
    <Suspense fallback={<MoreTabView active={false} />}>
      <MoreTabReader />
    </Suspense>
  );
}

function MoreTabReader() {
  const pathname = usePathname();
  const active = MORE_ITEMS.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  return <MoreTabView active={active} />;
}

function MoreTabView({ active }: { active: boolean }) {
  return (
    <Menu>
      <MenuTrigger
        className={cn(
          "flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[11px] font-medium outline-none transition-colors",
          active ? "text-fg" : "text-fg-3",
        )}
      >
        <Ellipsis className="size-[22px]" strokeWidth={active ? 2 : 1.6} />
        Mais
      </MenuTrigger>
      <MenuContent side="top" align="end" sideOffset={8} className="min-w-[200px]">
        {MORE_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <span key={item.href}>
              {i === MORE_ITEMS.length - 1 && <MenuSeparator />}
              <MenuItem asChild className="h-10 text-[14px]">
                <Link href={item.href}>
                  <Icon />
                  {item.label}
                </Link>
              </MenuItem>
            </span>
          );
        })}
      </MenuContent>
    </Menu>
  );
}
