"use client";

import { Toaster } from "@workspace/ui/components/sonner";
import type * as React from "react";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
      >
        {children}
        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </QueryProvider>
  );
}
