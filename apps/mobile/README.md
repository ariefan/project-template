# Mobile Application

**Expo/React Native mobile application**

This is the mobile application built with [Expo](https://expo.dev/) and [Expo Router](https://docs.expo.dev/router/introduction/) for file-based routing.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          apps/mobile                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Expo Router (file-based routing)                                   │
│  ├── app/                    (screens and layouts)                  │
│  ├── components/             (app-specific components)              │
│  └── hooks/                  (custom hooks)                         │
│                                                                      │
│  Shared Packages                                                     │
│  ├── @workspace/ui-mobile    (React Native components)             │
│  ├── @workspace/contracts    (API types)                           │
│  └── @workspace/utils        (shared utilities)                    │
│                                                                      │
│  Styling                                                             │
│  └── NativeWind              (Tailwind for React Native)           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# From monorepo root
pnpm dev --filter=mobile

# Or directly
cd apps/mobile
pnpm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR with Expo Go app for device

## Project Structure

```
apps/mobile/
├── app/
│   ├── _layout.tsx         # Root layout
│   ├── +html.tsx           # HTML wrapper (web)
│   ├── +not-found.tsx      # 404 page
│   ├── (tabs)/             # Tab navigator
│   │   ├── _layout.tsx     # Tab layout
│   │   ├── index.tsx       # Home tab
│   │   └── two.tsx         # Second tab
│   └── modal.tsx           # Modal screen
│
├── components/
│   ├── ThemedText.tsx
│   ├── ThemedView.tsx
│   └── [feature]/          # Feature components
│
├── hooks/
│   ├── useColorScheme.ts
│   └── useApi.ts           # API hooks
│
├── constants/
│   └── Colors.ts           # Theme colors
│
├── assets/                 # Images, fonts
│
├── app.json                # Expo config
├── tailwind.config.js      # NativeWind config
└── package.json
```

## Using UI Components

Import from `@workspace/ui-mobile`:

```tsx
import { View } from "react-native";
import { Button } from "@workspace/ui-mobile/components/button";
import { Card } from "@workspace/ui-mobile/components/card";
import { Input } from "@workspace/ui-mobile/components/input";
import { Text } from "@workspace/ui-mobile/components/text";

export default function Screen() {
  return (
    <View className="flex-1 p-4">
      <Card className="p-6">
        <Text className="text-xl font-bold mb-4">Welcome</Text>
        <Input placeholder="Search..." />
        <Button className="mt-4">
          <Text className="text-white">Submit</Text>
        </Button>
      </Card>
    </View>
  );
}
```

## File-Based Routing

Expo Router uses file-based routing like Next.js:

```
app/
├── index.tsx           → /
├── settings.tsx        → /settings
├── (tabs)/
│   ├── _layout.tsx     → Tab navigator
│   ├── index.tsx       → /  (tab)
│   └── profile.tsx     → /profile (tab)
├── posts/
│   ├── index.tsx       → /posts
│   └── [id].tsx        → /posts/123
└── modal.tsx           → /modal (modal presentation)
```

## Navigation

```tsx
import { Link, useRouter } from "expo-router";

// Declarative
<Link href="/settings">
  <Text>Go to Settings</Text>
</Link>

// Imperative
const router = useRouter();
router.push("/posts/123");
router.replace("/home");
router.back();
```

## Data Fetching

Use TanStack Query for data fetching:

```tsx
import { useQuery } from "@tanstack/react-query";

export function usePost(id: string) {
  return useQuery({
    queryKey: ["posts", id],
    queryFn: () => fetch(`${API_URL}/posts/${id}`).then(r => r.json()),
  });
}

// In component
function PostScreen() {
  const { id } = useLocalSearchParams();
  const { data, isLoading } = usePost(id as string);

  if (isLoading) return <ActivityIndicator />;

  return <Text>{data.title}</Text>;
}
```

## Styling with NativeWind

Same Tailwind classes as web:

```tsx
<View className="flex-1 bg-background p-4">
  <Text className="text-2xl font-bold text-foreground">
    Hello World
  </Text>
  <View className="flex-row gap-2 mt-4">
    <Button className="flex-1">Option A</Button>
    <Button className="flex-1">Option B</Button>
  </View>
</View>
```

## Environment Variables

```bash
# .env
EXPO_PUBLIC_API_URL=http://localhost:3001
```

Access in code:
```tsx
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
```

## Building

### Development Build

```bash
# iOS
pnpm expo run:ios

# Android
pnpm expo run:android
```

### Production Build (EAS)

```bash
# Configure EAS
pnpm eas build:configure

# Build
pnpm eas build --platform ios
pnpm eas build --platform android
```

## Scripts

```bash
pnpm start      # Start Metro bundler
pnpm ios        # Run on iOS simulator
pnpm android    # Run on Android emulator
pnpm web        # Run in browser
pnpm lint       # Lint code
pnpm typecheck  # Type check
```

## Platform-Specific Code

```tsx
import { Platform } from "react-native";

// Conditional styling
<View className={Platform.select({
  ios: "pt-12",
  android: "pt-8",
  default: "pt-4",
})} />

// Conditional components
{Platform.OS === "ios" && <StatusBar barStyle="dark-content" />}
```

## Dependencies

- `expo` - Development platform
- `expo-router` - File-based routing
- `nativewind` - Tailwind for RN
- `@tanstack/react-query` - Data fetching
- `@workspace/ui-mobile` - UI components
- `@workspace/contracts` - API types
