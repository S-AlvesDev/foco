"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, SETTINGS_NAV, type NavItem } from "./nav-items";

function useActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarLink({ item }: { item: NavItem }) {
  const active = useActive(item.href);
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
  const active = useActive(item.href);
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
      {item.label}
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
      {[...PRIMARY_NAV, SETTINGS_NAV].map((item) => (
        <TabBarLink key={item.href} item={item} />
      ))}
    </nav>
  );
}
