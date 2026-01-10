import { Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";

import { THEME_STORAGE_KEY } from "@workspace/ui/lib/theme-utils";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { ThemeScript } from "@/components/providers/theme-script";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(THEME_STORAGE_KEY)?.value;
  // Cookie value is URL-encoded JSON, decode it for parsing
  const appearance = rawCookie ? decodeURIComponent(rawCookie) : undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript appearance={appearance} />
      </head>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
