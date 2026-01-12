"use client";

import { THEME_STORAGE_KEY } from "@workspace/ui/lib/theme-utils";

export function ThemeScript({ appearance }: { appearance?: string }) {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Critical for preventing theme flash
      dangerouslySetInnerHTML={{
        __html: `
          try {
            const saved = ${
              appearance
                ? `JSON.parse(decodeURIComponent('${appearance}'))`
                : "null"
            };
            const storageKey = '${THEME_STORAGE_KEY}';
            
            // Priority: Server Cookie > storage > system
            let mode = saved?.mode;
            let theme = saved?.theme || 'zinc';

            if (!mode) {
              const local = localStorage.getItem(storageKey);
              if (local) {
                const parsed = JSON.parse(local);
                mode = parsed.state?.mode;
                theme = parsed.state?.theme || theme;
              }
            }

            if (!mode || mode === 'system') {
                mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }

            document.documentElement.classList.add(mode);
            document.documentElement.dataset.theme = theme;
            document.documentElement.style.colorScheme = mode;
          } catch (e) {
            console.error('Theme script error:', e);
          }
        `,
      }}
      id="theme-script"
    />
  );
}
