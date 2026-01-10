import {
  generateThemeCss,
  parseThemeSettings,
} from "@workspace/ui/lib/theme-utils";

export function ThemeScript({ appearance }: { appearance?: string | null }) {
  const themeSettings = parseThemeSettings(appearance);
  if (!themeSettings) {
    return null;
  }

  const css = generateThemeCss(themeSettings);
  if (!css) {
    return null;
  }

  return (
    <style
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Theme script
      dangerouslySetInnerHTML={{
        __html: css,
      }}
      id="theme-script"
    />
  );
}
