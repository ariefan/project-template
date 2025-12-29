# @workspace/ui-mobile

**Complete React Native Reusables component library for mobile applications**

A comprehensive collection of 32 beautiful, accessible UI components built with React Native Reusables patterns. Perfect for Expo and React Native apps in your monorepo.

## 🎨 Built With

- **React Native Reusables** - Component patterns and architecture
- **@rn-primitives** - Accessible, unstyled primitive components
- **NativeWind v4** - Tailwind CSS for React Native
- **class-variance-authority** - Component variant management
- **lucide-react-native** - Beautiful, consistent icons

## 📦 Components (32 Total)

### Foundation (5)
- **Button** - Pressable button with 6 variants (default, secondary, destructive, outline, ghost, link)
- **Card** - Container with header, title, description, content, and footer sub-components
- **Input** - Text input field with NativeWind styling
- **Label** - Accessible form label with press handling
- **Text** - Typography component with 11 variants (h1-h4, p, blockquote, code, lead, large, small, muted)

### Form Components (7)
- **Checkbox** - Accessible checkbox with indeterminate state
- **Radio Group** - Radio button group with keyboard navigation
- **Select** - Native and custom dropdown select
- **Switch** - Toggle switch with smooth animations
- **Textarea** - Multi-line text input
- **Toggle** - Binary toggle button
- **Toggle Group** - Multiple toggle buttons (single or multiple selection)

### Layout & Display (8)
- **Alert** - Notification banner with variants (default, destructive)
- **Aspect Ratio** - Container that maintains aspect ratio
- **Avatar** - User avatar with image, fallback, and initials
- **Badge** - Status badge with 4 variants
- **Progress** - Progress bar indicator
- **Separator** - Horizontal or vertical divider
- **Skeleton** - Loading placeholder animations
- **Icon** - Icon wrapper with Lucide icons integration

### Interactive Overlays (8)
- **Alert Dialog** - Modal confirmation dialog with actions
- **Context Menu** - Right-click/long-press context menu
- **Dialog** - Modal dialog with portal rendering
- **Dropdown Menu** - Dropdown menu with sub-menus
- **Hover Card** - Hover preview card (web-focused)
- **Popover** - Popover overlay with positioning
- **Tooltip** - Tooltip on hover/long-press
- **Navigation Menu** - Complex navigation menu structure

### Complex Components (4)
- **Accordion** - Collapsible sections with single/multiple expansion
- **Collapsible** - Simple expandable content
- **Menubar** - Horizontal menu bar
- **Tabs** - Tabbed interface with content panels
- **Table** - Data table structure

## 🚀 Quick Start

```tsx
import { Button } from "@workspace/ui-mobile/components/button";
import { Card } from "@workspace/ui-mobile/components/card";
import { Text } from "@workspace/ui-mobile/components/text";
import { View } from "react-native";

export default function MyScreen() {
  return (
    <View className="flex-1 p-4 bg-background">
      <Card className="p-4">
        <Text variant="h2">Welcome!</Text>
        <Text variant="p" className="text-muted-foreground">
          Beautiful components, ready to use
        </Text>
        <Button className="mt-4">
          <Text>Get Started</Text>
        </Button>
      </Card>
    </View>
  );
}
```

## 💡 Usage Examples

### Buttons

```tsx
import { Button } from "@workspace/ui-mobile/components/button";
import { Text } from "@workspace/ui-mobile/components/text";

// Variants
<Button variant="default"><Text>Default</Text></Button>
<Button variant="secondary"><Text>Secondary</Text></Button>
<Button variant="destructive"><Text>Destructive</Text></Button>
<Button variant="outline"><Text>Outline</Text></Button>
<Button variant="ghost"><Text>Ghost</Text></Button>

// Sizes
<Button size="sm"><Text>Small</Text></Button>
<Button size="lg"><Text>Large</Text></Button>
<Button size="icon"><Icon /></Button>
```

### Form with Validation

```tsx
import { Input } from "@workspace/ui-mobile/components/input";
import { Label } from "@workspace/ui-mobile/components/label";
import { Checkbox } from "@workspace/ui-mobile/components/checkbox";
import { Button } from "@workspace/ui-mobile/components/button";

<View className="gap-4">
  <View className="gap-2">
    <Label nativeID="email">Email</Label>
    <Input
      placeholder="email@example.com"
      keyboardType="email-address"
      aria-labelledby="email"
    />
  </View>

  <View className="flex-row items-center gap-2">
    <Checkbox checked={agreed} onCheckedChange={setAgreed} />
    <Label onPress={() => setAgreed(!agreed)}>
      I agree to the terms
    </Label>
  </View>

  <Button><Text>Submit</Text></Button>
</View>
```

### Cards

```tsx
import { Card } from "@workspace/ui-mobile/components/card";
import { Avatar } from "@workspace/ui-mobile/components/avatar";
import { Badge } from "@workspace/ui-mobile/components/badge";

<Card className="p-4">
  <View className="flex-row items-center gap-3">
    <Avatar alt="User" className="h-12 w-12" />
    <View className="flex-1">
      <Text variant="h4">John Doe</Text>
      <Text variant="small" className="text-muted-foreground">
        @johndoe
      </Text>
    </View>
    <Badge variant="secondary">
      <Text className="text-xs">Pro</Text>
    </Badge>
  </View>
</Card>
```

### Loading States

```tsx
import { Skeleton } from "@workspace/ui-mobile/components/skeleton";

<View className="gap-3">
  <View className="flex-row items-center gap-3">
    <Skeleton className="h-12 w-12 rounded-full" />
    <View className="flex-1 gap-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </View>
  </View>
  <Skeleton className="h-24 w-full" />
</View>
```

### Dialog Example

```tsx
import { AlertDialog } from "@workspace/ui-mobile/components/alert-dialog";
import { Button } from "@workspace/ui-mobile/components/button";

<AlertDialog>
  <AlertDialog.Trigger asChild>
    <Button variant="destructive">
      <Text>Delete Account</Text>
    </Button>
  </AlertDialog.Trigger>

  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <AlertDialog.Footer>
      <AlertDialog.Cancel><Text>Cancel</Text></AlertDialog.Cancel>
      <AlertDialog.Action onPress={handleDelete}>
        <Text>Delete</Text>
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog>
```

## 🎨 Theming

Components use CSS variables defined in your app's `global.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  /* ...more variables */
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  /* ...dark mode */
}
```

## 🔧 Utilities

### cn() - Class Name Utility

```tsx
import { cn } from "@workspace/ui-mobile/lib/utils";

<View className={cn(
  "flex-1 p-4",
  isActive && "bg-primary",
  className
)} />
```

### Theme Access

```tsx
import { NAV_THEME } from "@workspace/ui-mobile/lib/theme";

const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;
```

## 📱 Platform Support

- ✅ **iOS** - Native iOS apps
- ✅ **Android** - Native Android apps
- ✅ **Web** - React Native Web

Platform-specific optimizations built-in (hover states, focus rings, etc.).

## ♿ Accessibility

All components include:
- ARIA attributes
- Screen reader support
- Keyboard navigation
- Focus management

```tsx
<Button aria-label="Close dialog">
  <Icon name="x" />
</Button>

<Input
  aria-labelledby="email-label"
  aria-invalid={hasError}
/>
```

## 📦 Dependencies

**Peer Dependencies** (install in your app):
```bash
pnpm add @rn-primitives/accordion @rn-primitives/alert-dialog
pnpm add @rn-primitives/aspect-ratio @rn-primitives/avatar
pnpm add @rn-primitives/checkbox @rn-primitives/collapsible
pnpm add @rn-primitives/context-menu @rn-primitives/dialog
pnpm add @rn-primitives/dropdown-menu @rn-primitives/hover-card
pnpm add @rn-primitives/label @rn-primitives/menubar
pnpm add @rn-primitives/navigation-menu @rn-primitives/popover
pnpm add @rn-primitives/portal @rn-primitives/progress
pnpm add @rn-primitives/radio-group @rn-primitives/select
pnpm add @rn-primitives/separator @rn-primitives/slot
pnpm add @rn-primitives/switch @rn-primitives/table
pnpm add @rn-primitives/tabs @rn-primitives/toggle
pnpm add @rn-primitives/toggle-group @rn-primitives/toolbar
pnpm add @rn-primitives/tooltip
pnpm add lucide-react-native nativewind
pnpm add react-native-reanimated react-native-svg
pnpm add react-native-screens @react-navigation/native
```

## 📖 Examples

Live demos in the mobile app:
- `apps/mobile/app/(tabs)/index.tsx` - Component showcase
- `apps/mobile/app/(tabs)/two.tsx` - Form components demo

## 🔗 Related

- [React Native Reusables](https://rnr-docs.vercel.app/)
- [NativeWind](https://www.nativewind.dev/)
- [@rn-primitives](https://github.com/roninoss/rn-primitives)
- [Lucide Icons](https://lucide.dev/)

---

**Built with ❤️ using React Native Reusables**
