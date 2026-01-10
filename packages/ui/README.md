# @workspace/ui

**shadcn/ui component library for web applications**

This package contains all shared UI components built on [shadcn/ui](https://ui.shadcn.com/) and [Radix UI](https://www.radix-ui.com/) primitives. Components are copy-pasted (not installed) so you have full ownership and can customize freely.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          @workspace/ui                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Components (54 components)                                         │
│  ├── Layout: Card, Separator, AspectRatio, Resizable               │
│  ├── Forms: Input, Textarea, Select, Checkbox, Radio, Switch       │
│  ├── Buttons: Button, ButtonGroup, Toggle, ToggleGroup             │
│  ├── Navigation: Tabs, Breadcrumb, NavigationMenu, Pagination      │
│  ├── Feedback: Alert, Badge, Progress, Skeleton, Spinner, Sonner   │
│  ├── Overlays: Dialog, Sheet, Drawer, AlertDialog, Popover         │
│  ├── Menus: DropdownMenu, ContextMenu, Menubar, Command            │
│  └── Data: Table, Calendar, Chart, Carousel, ScrollArea            │
│                                                                      │
│  Built on:                                                          │
│  ├── Radix UI (accessible primitives)                              │
│  ├── Tailwind CSS (styling)                                         │
│  ├── class-variance-authority (variants)                           │
│  └── React Hook Form + Zod (forms)                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Exports

```typescript
// Components
import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Form, FormField, FormItem } from "@workspace/ui/components/form";
// ... 54 total components

// Utilities
import { cn } from "@workspace/ui/lib/utils";

// Hooks
import { useMobile } from "@workspace/ui/hooks/use-mobile";

// Styles
import "@workspace/ui/globals.css";
```

## Usage

### Basic Components

```tsx
import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";

function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Email" type="email" />
        <Input placeholder="Password" type="password" />
        <Button className="w-full">Sign In</Button>
      </CardContent>
    </Card>
  );
}
```

### Forms with Validation

> **Important:** Always import `useForm` from `@workspace/ui/composed/form`, NOT directly from `react-hook-form`. This ensures type identity consistency across the monorepo.

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm, // Import from here, not from react-hook-form
} from "@workspace/ui/composed/form";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function LoginForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Button Variants

```tsx
import { Button } from "@workspace/ui/components/button";

<Button variant="default">Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

## Component List

### Layout
- `AspectRatio` - Maintain aspect ratios
- `Card` - Container with header/content/footer
- `Resizable` - Resizable panels
- `ScrollArea` - Custom scrollbars
- `Separator` - Horizontal/vertical dividers

### Forms
- `Button` - Primary action button
- `ButtonGroup` - Grouped buttons
- `Checkbox` - Toggle checkbox
- `Form` - Form with validation
- `Input` - Text input
- `InputGroup` - Input with addons
- `InputOTP` - One-time password input
- `Label` - Form labels
- `NativeSelect` - Browser-native select dropdown
- `RadioGroup` - Radio button group
- `Select` - Dropdown select
- `Slider` - Range slider
- `Switch` - Toggle switch
- `Textarea` - Multiline input

### Navigation
- `Breadcrumb` - Navigation breadcrumbs
- `NavigationMenu` - Site navigation
- `Pagination` - Page navigation
- `Tabs` - Tabbed content

### Feedback
- `Alert` - Alert messages
- `AlertDialog` - Confirmation dialogs
- `Badge` - Status badges
- `Progress` - Progress bars
- `Skeleton` - Loading placeholders
- `Sonner` - Toast notifications
- `Spinner` - Loading spinner
- `Tooltip` - Hover tooltips

### Overlays
- `Dialog` - Modal dialogs
- `Drawer` - Side drawers
- `HoverCard` - Hover information
- `Popover` - Floating popovers
- `Sheet` - Slide-out panels

### Menus
- `Command` - Command palette (cmdk)
- `ContextMenu` - Right-click menus
- `DropdownMenu` - Dropdown menus
- `Menubar` - Menu bar

### Data Display
- `Accordion` - Collapsible sections
- `Avatar` - User avatars
- `Calendar` - Date picker calendar
- `Carousel` - Image carousel
- `Chart` - Data visualizations (Recharts)
- `Collapsible` - Expandable content
- `Table` - Data tables

### Other
- `Empty` - Empty state placeholder
- `Field` - Form field wrapper
- `Item` - Generic list item
- `Kbd` - Keyboard shortcuts
- `Sidebar` - App sidebar
- `Toggle` - Toggle button
- `ToggleGroup` - Toggle button group

## Composed Components

Higher-level components built from primitives, located in `src/composed/`:

```typescript
import { ConfirmDialog } from "@workspace/ui/composed/confirm-dialog";
import { FileUploadWithProgress } from "@workspace/ui/composed/file-upload-with-progress";
import { ImageCompressor } from "@workspace/ui/composed/image-compressor";
import { MarkdownEditor } from "@workspace/ui/composed/markdown-editor";
import { MarkdownRenderer } from "@workspace/ui/composed/markdown-renderer";
import { ThemeCustomizer } from "@workspace/ui/composed/theme-customizer";
import { DataView } from "@workspace/ui/composed/data-view";
```

### Dialogs & Overlays
- `ConfirmDialog` - Confirmation dialog with customizable actions
- `FilePreviewDialog` - Preview files before upload
- `ImageCropDialog` - Crop images before upload

### Data Display
- `DataView` - Flexible data list/table with pagination
- `DataTableColumnHeader` - Sortable column headers
- `DataTableColumnToggle` - Column visibility controls
- `DataTablePagination` / `DataListPagination` - Pagination controls
- `PaginationBase` - Base pagination component

### Media & Files
- `FileUploadWithProgress` - Upload files with progress indicator
- `ImageCompressor` - Client-side image compression before upload

### Content
- `MarkdownEditor` - MDX-based markdown editor
- `MarkdownRenderer` - Render markdown with syntax highlighting, math, and GFM

### Theming
- `ThemeCustomizer` - Interactive theme color picker

## Adding New Components

```bash
# Add from shadcn/ui registry
pnpm dlx shadcn@latest add [component] -c apps/web

# Components are placed in packages/ui/src/components
```

## Styling

Components use Tailwind CSS with CSS variables for theming:

```css
/* packages/ui/src/styles/globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... more variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode variables */
}
```

## Utility: cn()

Merge Tailwind classes with proper precedence:

```typescript
import { cn } from "@workspace/ui/lib/utils";

<div className={cn(
  "base-class",
  isActive && "active-class",
  className // props.className wins
)} />
```

## Dependencies

- `@radix-ui/*` - Accessible primitives
- `class-variance-authority` - Variant management
- `tailwind-merge` - Class merging
- `lucide-react` - Icons
- `react-hook-form` - Form management
- `recharts` - Charts
- `sonner` - Toasts
- `cmdk` - Command palette

## Related

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
