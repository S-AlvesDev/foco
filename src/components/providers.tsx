"use client";

import { Toaster } from "sonner";
import { ServiceWorkerManager } from "@/features/pwa/sw-manager";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ServiceWorkerManager />
      <Toaster
        position="bottom-right"
        offset={16}
        mobileOffset={{ bottom: 88 }}
        toastOptions={{
          classNames: {
            toast: "!bg-surface-3 !text-fg !border-border !rounded-lg !shadow-pop !text-[13px] !font-sans",
            description: "!text-fg-2",
          },
        }}
      />
    </>
  );
}
