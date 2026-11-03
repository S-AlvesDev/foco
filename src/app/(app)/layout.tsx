import Link from "next/link";
import { Suspense } from "react";
import { BrandWordmark } from "@/components/brand";
import { SidebarNav, SidebarSettingsLink, TabBar } from "@/components/layout/nav-link";
import { ThemeSync, UserMenu } from "@/components/layout/user-menu";
import { getProfile } from "@/lib/auth";
import { avatarUrl } from "@/features/avatar/server";
import { StudyProvider } from "@/features/timer/study-provider";
import { MobileTimerPill, MobileTimerSpacer, SidebarTimer } from "@/features/timer/components/timer-widgets";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <StudyProvider>
      <div className="flex min-h-dvh">
        {/* Sidebar: tablet e desktop */}
        <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-border bg-surface-1 md:flex">
          <div className="flex h-16 items-center px-5">
            <Link href="/painel" className="rounded-md" aria-label="Missão Alpha-01, painel">
              <BrandWordmark />
            </Link>
          </div>
          <div className="px-1 pt-1 pb-2">
            <SidebarTimer />
          </div>
          <SidebarNav />
          <div className="flex flex-col gap-0.5 border-t border-border px-3 pt-3 pb-3">
            <SidebarSettingsLink />
            <div className="mt-1">
              <Suspense fallback={<UserSkeleton />}>
                <SidebarUser />
              </Suspense>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Barra superior: celular */}
          <header className="sticky top-0 z-30 flex h-[calc(56px+env(safe-area-inset-top))] items-end border-b border-border/70 bg-bg/80 px-4 pb-2.5 backdrop-blur-xl md:hidden">
            <Link
              href="/painel"
              className="flex flex-1 items-center gap-2.5 rounded-md"
              aria-label="Missão Alpha-01, painel"
            >
              <BrandWordmark />
            </Link>
            <Suspense fallback={<span className="size-7 rounded-full bg-surface-2" />}>
              <SidebarUser compact />
            </Suspense>
          </header>

          <main className="flex-1 overflow-x-clip pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
            {children}
            <MobileTimerSpacer />
          </main>
        </div>

        <MobileTimerPill />

        {/* Navegação inferior: celular */}
        <TabBar />
      </div>
    </StudyProvider>
  );
}

async function SidebarUser({ compact = false }: { compact?: boolean }) {
  const profile = await getProfile();
  const user = {
    name: profile.display_name || profile.email,
    email: profile.email,
    theme: profile.theme,
    avatarUrl: await avatarUrl(profile.avatar_path),
  };
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
