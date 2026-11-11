import Link from "next/link";
import { Suspense } from "react";
import { BrandWordmark } from "@/components/brand";
import { OrbitArcs } from "@/components/orbit-arcs";
import { SidebarNav, SidebarSettingsLink, TabBar } from "@/components/layout/nav-link";
import { ThemeSync, UserMenu } from "@/components/layout/user-menu";
import { getProfile } from "@/lib/auth";
import { avatarUrl } from "@/features/avatar/server";
import { StudyProvider } from "@/features/timer/study-provider";
import { BellLink } from "@/features/notifications/components/bell";
import { countUnread } from "@/features/notifications/queries";
import { OfflineRuntime } from "@/features/pwa/offline-runtime";
import { MobileTimerPill, MobileTimerSpacer, SidebarTimer } from "@/features/timer/components/timer-widgets";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <StudyProvider>
      <div className="flex min-h-dvh">
        {/* Sidebar: tablet e desktop */}
        {/* Sempre escura, nos dois temas: é o painel da marca, como na tela de entrada. */}
        <aside className="dark sticky top-0 isolate hidden h-dvh w-[264px] shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[linear-gradient(180deg,#0f0c25_0%,#0a0a17_40%,#0a0915_70%,#120e2c_100%)] text-fg lg:flex">
          <OrbitArcs className="pointer-events-none absolute -top-14 -left-20 -z-10 w-[330px] opacity-35" />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-24 -z-10 size-[380px] rounded-full bg-[radial-gradient(closest-side,rgb(109_75_255/0.18),transparent)]"
          />
          <div className="flex h-16 items-center justify-between gap-2 pr-2.5 pl-5">
            <Link href="/painel" className="min-w-0 rounded-md" aria-label="Missão Alpha-01, painel">
              <BrandWordmark />
            </Link>
            <Suspense fallback={<span className="size-10" />}>
              <Bell />
            </Suspense>
          </div>
          <div className="px-1 pt-1 pb-2">
            <SidebarTimer />
          </div>
          <SidebarNav />
          <div className="flex flex-col gap-0.5 border-t border-white/[0.06] px-3 pt-3 pb-3">
            <SidebarSettingsLink />
            <div className="mt-1">
              <Suspense fallback={<UserSkeleton />}>
                <SidebarUser />
              </Suspense>
            </div>
          </div>
        </aside>

        <div className="relative isolate flex min-w-0 flex-1 flex-col">
          {/* Brilho violeta discreto no topo do conteúdo (só no tema escuro). */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[560px] bg-[radial-gradient(55%_75%_at_100%_0%,rgb(123_108_246/0.09),transparent_70%),radial-gradient(40%_60%_at_0%_0%,rgb(123_108_246/0.035),transparent_70%)] dark:block"
          />
          {/* Barra superior: celular */}
          <header className="sticky top-0 z-30 flex h-[calc(56px+env(safe-area-inset-top))] items-end border-b border-border/70 bg-bg/80 px-4 pb-2.5 backdrop-blur-xl lg:hidden">
            <Link
              href="/painel"
              className="flex flex-1 items-center gap-2.5 rounded-md"
              aria-label="Missão Alpha-01, painel"
            >
              <BrandWordmark />
            </Link>
            <Suspense fallback={<span className="size-10" />}>
              <Bell className="mr-1" />
            </Suspense>
            <Suspense fallback={<span className="size-7 rounded-full bg-surface-2" />}>
              <SidebarUser compact />
            </Suspense>
          </header>

          <main className="flex-1 overflow-x-clip pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0">
            {children}
            <MobileTimerSpacer />
          </main>
        </div>

        <MobileTimerPill />
        <OfflineRuntime />

        {/* Navegação inferior: celular */}
        <TabBar />
      </div>
    </StudyProvider>
  );
}

async function Bell({ className }: { className?: string }) {
  const count = await countUnread();
  return <BellLink count={count ?? 0} className={className} />;
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
