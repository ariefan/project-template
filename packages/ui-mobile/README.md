# @workspace/ui-mobile

**React Native component library for mobile applications**

This package contains shared UI components for React Native/Expo apps, following the same copy-paste philosophy as shadcn/ui. Built with NativeWind for Tailwind-style styling.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       @workspace/ui-mobile                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Components                                                          │
│  ├── Button - Primary action button                                 │
│  ├── Card - Container component                                     │
│  ├── Input - Text input                                             │
│  ├── Label - Form labels                                            │
│  └── Text - Typography component                                    │
│                                                                      │
│  Built on:                                                          │
│  ├── React Native                                                    │
│  ├── NativeWind (Tailwind for RN)                                  │
│  ├── @rn-primitives (accessible primitives)                        │
│  └── class-variance-authority (variants)                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Exports

```typescript
// Components
import { Button } from "@workspace/ui-mobile/components/button";
import { Card } from "@workspace/ui-mobile/components/card";
import { Input } from "@workspace/ui-mobile/components/input";
import { Label } from "@workspace/ui-mobile/components/label";
import { Text } from "@workspace/ui-mobile/components/text";

// Utilities
import { cn } from "@workspace/ui-mobile/lib/utils";
```

## Usage

### Basic Components

```tsx
import { View } from "react-native";
import { Button } from "@workspace/ui-mobile/components/button";
import { Card } from "@workspace/ui-mobile/components/card";
import { Input } from "@workspace/ui-mobile/components/input";
import { Label } from "@workspace/ui-mobile/components/label";
import { Text } from "@workspace/ui-mobile/components/text";

function LoginScreen() {
  return (
    <View className="flex-1 p-4">
      <Card className="p-6">
        <Text className="text-2xl font-bold mb-4">Sign In</Text>

        <View className="space-y-4">
          <View>
            <Label>Email</Label>
            <Input
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View>
            <Label>Password</Label>
            <Input
              placeholder="Password"
              secureTextEntry
            />
          </View>

          <Button onPress={handleLogin}>
            <Text className="text-white font-medium">Sign In</Text>
          </Button>
        </View>
      </Card>
    </View>
  );
}
```

### Button Variants

```tsx
import { Button } from "@workspace/ui-mobile/components/button";
import { Text } from "@workspace/ui-mobile/components/text";

<Button variant="default">
  <Text>Default</Text>
</Button>

<Button variant="secondary">
  <Text>Secondary</Text>
</Button>

<Button variant="destructive">
  <Text>Destructive</Text>
</Button>

<Button variant="outline">
  <Text>Outline</Text>
</Button>

<Button variant="ghost">
  <Text>Ghost</Text>
</Button>

<Button size="sm">
  <Text>Small</Text>
</Button>

<Button size="lg">
  <Text>Large</Text>
</Button>
```

### Text Variants

```tsx
import { Text } from "@workspace/ui-mobile/components/text";

<Text className="text-3xl font-bold">Heading 1</Text>
<Text className="text-2xl font-semibold">Heading 2</Text>
<Text className="text-xl font-medium">Heading 3</Text>
<Text className="text-base">Body text</Text>
<Text className="text-sm text-muted-foreground">Secondary text</Text>
```

## Component List

| Component | Description |
|-----------|-------------|
| `Button` | Pressable button with variants |
| `Card` | Container with rounded corners and shadow |
| `Input` | Text input with NativeWind styling |
| `Label` | Accessible form label |
| `Text` | Typography component |

## Adding New Components

Create new components in `src/components/`:

```tsx
// src/components/badge.tsx
import { View } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";
import { Text } from "./text";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5",
  {
    variants: {
      variant: {
        default: "bg-primary",
        secondary: "bg-secondary",
        destructive: "bg-destructive",
        outline: "border border-input",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type BadgeProps = VariantProps<typeof badgeVariants> & {
  children: React.ReactNode;
  className?: string;
};

export function Badge({ variant, className, children }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)}>
      <Text className="text-xs font-semibold">{children}</Text>
    </View>
  );
}
```

## Styling with NativeWind

Components use NativeWind (Tailwind CSS for React Native):

```tsx
// Same Tailwind classes as web
<View className="flex-1 bg-background p-4">
  <Text className="text-foreground font-bold">Hello</Text>
</View>
```

## Utility: cn()

Same utility as web for merging classes:

```typescript
import { cn } from "@workspace/ui-mobile/lib/utils";

<View className={cn(
  "base-class",
  isActive && "active-class",
  className
)} />
```

## Dependencies

- `nativewind` - Tailwind CSS for React Native
- `@rn-primitives/*` - Accessible primitives
- `class-variance-authority` - Variant management
- `tailwind-merge` - Class merging

## Peer Dependencies

Your app must install:
- `react-native >= 0.74.0`
- `nativewind ^4.0.0`
- `@rn-primitives/slot`
- `@rn-primitives/label`

## Related

- [@workspace/ui](../ui/README.md) - Web UI components
- [NativeWind](https://www.nativewind.dev/)
- [React Native Reusables](https://rnr-docs.vercel.app/)
