"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";
import { QueryProvider } from "./query-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableColorScheme
        enableSystem
      >
        {children}
      </NextThemesProvider>
    </QueryProvider>
  );
}
