"use client";

import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
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
