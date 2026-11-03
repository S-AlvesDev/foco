import Link from "next/link";
import { Suspense } from "react";
import { BrandMark, BrandWordmark } from "@/components/brand";
import { SidebarNav, SidebarSettingsLink, TabBar } from "@/components/layout/nav-link";
import { ThemeSync, UserMenu } from "@/components/layout/user-menu";
import { getProfile } from "@/lib/auth";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      {/* Sidebar: tablet e desktop */}
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-border bg-surface-1 md:flex">
        <div className="flex h-14 items-center px-4">
          <Link href="/painel" className="rounded-md" aria-label="Foco aí, painel">
            <BrandWordmark />
          </Link>
        </div>
        <SidebarNav />
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          <SidebarSettingsLink />
          <div className="mt-1 border-t border-border pt-2">
            <Suspense fallback={<UserSkeleton />}>
              <SidebarUser />
            </Suspense>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior: celular */}
        <header className="sticky top-0 z-30 flex h-[calc(52px+env(safe-area-inset-top))] items-end border-b border-border bg-bg/85 px-4 pb-2.5 backdrop-blur-md md:hidden">
          <Link
            href="/painel"
            className="flex flex-1 items-center gap-2 rounded-md"
            aria-label="Foco aí, painel"
          >
            <BrandMark />
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Foco aí</span>
          </Link>
          <Suspense fallback={<span className="size-7 rounded-full bg-surface-2" />}>
            <SidebarUser compact />
          </Suspense>
        </header>

        <main className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
      </div>

      {/* Navegação inferior: celular */}
      <TabBar />
    </div>
  );
}

async function SidebarUser({ compact = false }: { compact?: boolean }) {
  const profile = await getProfile();
  const user = { name: profile.display_name || profile.email, email: profile.email, theme: profile.theme };
  return (
    <>
      {!compact && <ThemeSync theme={profile.theme} />}
      <UserMenu user={user} compact={compact} />
    </>
  );
}

function UserSkeleton() {
  return (
    <div className="flex h-11 items-center gap-2.5 px-2" aria-hidden>
      <span className="size-[26px] rounded-full bg-surface-2" />
      <span className="flex flex-1 flex-col gap-1.5">
        <span className="h-2.5 w-20 rounded bg-surface-2" />
        <span className="h-2 w-28 rounded bg-surface-2" />
      </span>
    </div>
  );
}
