import Link from "next/link";
import { BrandWordmark } from "@/components/brand";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <FocusRings />
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 sm:pt-7">
        <Link href="/entrar" className="inline-flex rounded-md" aria-label="Foco aí, início">
          <BrandWordmark />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pt-[9vh] pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-[368px]">{children}</div>
      </main>
    </div>
  );
}

/** Anéis concêntricos muito sutis, eco da marca. Puramente decorativos. */
function FocusRings() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[1400px] w-[1400px] -translate-x-1/2 -translate-y-1/2 text-fg opacity-[0.045] dark:opacity-[0.06]"
      viewBox="0 0 1400 1400"
      fill="none"
    >
      {[120, 210, 310, 420, 540, 680].map((r) => (
        <circle key={r} cx="700" cy="700" r={r} stroke="currentColor" strokeWidth="1" />
      ))}
    </svg>
  );
}
