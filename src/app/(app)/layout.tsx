import { Suspense } from "react";
import Link from "next/link";
import { BottomNav, TopNav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="brand-badge size-8 rounded-lg grid place-items-center text-white text-sm font-bold">A</span>
            <span className="font-semibold">AutoDM</span>
          </Link>
          <Suspense fallback={null}>
            <TopNav />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5 pb-28 sm:pb-10">{children}</main>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
