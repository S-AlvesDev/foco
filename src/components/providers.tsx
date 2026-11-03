"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
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
    </ThemeProvider>
  );
}
