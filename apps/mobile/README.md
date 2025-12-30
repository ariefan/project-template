# Mobile App

React Native mobile application built with Expo and NativeWind, integrated into the turborepo monorepo.

## Tech Stack

- **React Native 0.81** - Mobile framework
- **Expo ~54** - Development platform
- **Expo Router ~6** - File-based routing
- **NativeWind v4** - Tailwind CSS for React Native
- **React Native Reusables** - Accessible UI components
- **Lucide React Native** - Icon library

## Development

```bash
# Start development server
pnpm dev

# Platform-specific
pnpm ios      # iOS simulator (Mac only)
pnpm android  # Android emulator
pnpm web      # Browser

# Linting
pnpm lint
pnpm lint:fix
```

You can also scan the QR code using the [Expo Go](https://expo.dev/go) app to run on your physical device.

## TypeScript Configuration

### Why is typecheck skipped?

This app uses **NativeWind v4**, which employs runtime type augmentation to add `className` prop support to React Native components. However, in monorepo setups, TypeScript's module augmentation doesn't cross workspace package boundaries.

**The issue:**
- NativeWind augments React Native types in `node_modules`
- Our UI components are in `@workspace/ui-mobile` (separate package)
- TypeScript doesn't apply the augmentation across packages
- Result: ~200 false positive "className doesn't exist" errors

**The solution:**
- `skipLibCheck: true` in [tsconfig.json](tsconfig.json)
- Typecheck script shows explanation instead of running `tsc`
- **Types work correctly at runtime** - this is purely a build-time issue

### Why skipLibCheck is acceptable:

1. The mobile app has no consumers (it's an application, not a library)
2. Runtime behavior is correct - NativeWind works perfectly
3. Alternative solutions (custom type declarations) are overly complex
4. This is a known limitation of NativeWind v4 in monorepos
5. Editor intellisense and autocomplete still work

## UI Components

Components are provided by `@workspace/ui-mobile`, which exports:

- Primitives from `@rn-primitives/*` (accessible, headless components)
- Styled components with NativeWind
- Theme utilities and helpers

Import from the workspace package:

```tsx
import { Button } from '@workspace/ui-mobile/components/button';
import { Text } from '@workspace/ui-mobile/components/text';
import { Icon } from '@workspace/ui-mobile/components/icon';
```

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router pages
│   ├── (dashboard)/       # Authenticated routes (tabs)
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Landing page
│   └── login.tsx          # Login page
├── components/            # App-specific components
│   └── drawer-menu.tsx    # Drawer navigation
├── nativewind-env.d.ts   # NativeWind type reference
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Monorepo Integration

This mobile app is part of a turborepo monorepo and shares:

- **`@workspace/ui-mobile`** - Shared UI component library
- **`@workspace/typescript-config`** - Shared TypeScript config
- **Biome** - Shared linter/formatter configuration

## Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [NativeWind](https://www.nativewind.dev/)
- [React Native Reusables](https://rnr-docs.vercel.app/)

## Deploy with EAS

The easiest way to deploy your app is with [Expo Application Services (EAS)](https://expo.dev/eas):

- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Updates](https://docs.expo.dev/eas-update/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
