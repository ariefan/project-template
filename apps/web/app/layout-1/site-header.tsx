"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@workspace/ui/components/navigation-menu";
import { Separator } from "@workspace/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { cn } from "@workspace/ui/lib/utils";
import {
  BlocksIcon,
  BookOpenIcon,
  ChevronDownIcon,
  CodeIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HomeIcon,
  LayoutGridIcon,
  LogOutIcon,
  MenuIcon,
  NewspaperIcon,
  PaletteIcon,
  RocketIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface NavSubItem {
  href: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface NavItem {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: NavSubItem[];
}

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: HomeIcon },
  {
    label: "Docs",
    icon: BookOpenIcon,
    subItems: [
      {
        href: "/docs",
        label: "Introduction",
        description: "Get started with the basics",
        icon: RocketIcon,
      },
      {
        href: "/docs/installation",
        label: "Installation",
        description: "How to install and configure",
        icon: CodeIcon,
      },
      {
        href: "/docs/theming",
        label: "Theming",
        description: "Customize colors and styles",
        icon: PaletteIcon,
      },
    ],
  },
  {
    label: "Components",
    icon: LayoutGridIcon,
    subItems: [
      {
        href: "/components/buttons",
        label: "Buttons",
        description: "Interactive button components",
        icon: BlocksIcon,
      },
      {
        href: "/components/forms",
        label: "Forms",
        description: "Input and form elements",
        icon: FileTextIcon,
      },
      {
        href: "/components/layouts",
        label: "Layouts",
        description: "Page layout components",
        icon: LayoutGridIcon,
      },
    ],
  },
  { href: "/blog", label: "Blog", icon: NewspaperIcon },
];

export function SiteHeader() {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([]);

  function toggleSection(label: string) {
    setOpenSections((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }

  return (
    <header className="sticky top-0 z-50 flex w-full items-center border-b bg-background">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        {/* Left: Hamburger on mobile, Logo on desktop */}
        <div className="flex items-center gap-2">
          {isMobile ? (
            <Sheet onOpenChange={setMobileMenuOpen} open={mobileMenuOpen}>
              <SheetTrigger asChild>
                <Button aria-label="Open menu" size="icon" variant="ghost">
                  <MenuIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-72 overflow-y-auto" side="left">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      role="img"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <title>Logo</title>
                      <path d="M3 12a9 9 0 1018 0 9 9 0 10-18 0z" />
                    </svg>
                    shadcn
                  </SheetTitle>
                </SheetHeader>
                <Separator className="my-4" />
                <nav className="flex flex-col gap-1">
                  {navItems.map((item) =>
                    item.subItems ? (
                      <Collapsible
                        key={item.label}
                        onOpenChange={() => toggleSection(item.label)}
                        open={openSections.includes(item.label)}
                      >
                        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2.5 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                          <span className="flex items-center gap-3">
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            {item.label}
                          </span>
                          <ChevronDownIcon
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              openSections.includes(item.label) && "rotate-180"
                            )}
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-4 flex flex-col gap-1 border-l pt-1 pl-3">
                            {item.subItems.map((subItem) => (
                              <Link
                                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                                href={subItem.href}
                                key={subItem.href}
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                {subItem.icon && (
                                  <subItem.icon className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                  <div className="font-medium">
                                    {subItem.label}
                                  </div>
                                  {subItem.description && (
                                    <div className="text-muted-foreground text-xs">
                                      {subItem.description}
                                    </div>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <Link
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        href={item.href ?? "#"}
                        key={item.label}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        {item.label}
                      </Link>
                    )
                  )}
                </nav>
                <Separator className="my-4" />
                <div className="flex flex-col gap-1">
                  <Link
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    href="https://github.com"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ExternalLinkIcon className="h-4 w-4 text-muted-foreground" />
                    GitHub
                  </Link>
                  <Link
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    href="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Link className="inline-flex items-center gap-2" href="/">
              <svg
                className="h-6 w-6"
                fill="currentColor"
                role="img"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Logo</title>
                <path d="M3 12a9 9 0 1018 0 9 9 0 10-18 0z" />
              </svg>
              <span className="font-semibold">shadcn</span>
            </Link>
          )}
        </div>

        {/* Center: Navigation with dropdowns (desktop only) */}
        {!isMobile && (
          <div className="flex flex-1 justify-center">
            <NavigationMenu viewport={false}>
              <NavigationMenuList>
                {navItems.map((item) =>
                  item.subItems ? (
                    <NavigationMenuItem key={item.label}>
                      <NavigationMenuTrigger className="gap-2">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-80 gap-1 p-2">
                          {item.subItems.map((subItem) => (
                            <li key={subItem.href}>
                              <NavigationMenuLink asChild>
                                <Link
                                  className="flex items-start gap-3 rounded-md p-3 transition-colors hover:bg-accent"
                                  href={subItem.href}
                                >
                                  {subItem.icon && (
                                    <subItem.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                                  )}
                                  <div>
                                    <div className="font-medium text-sm">
                                      {subItem.label}
                                    </div>
                                    {subItem.description && (
                                      <div className="text-muted-foreground text-xs leading-snug">
                                        {subItem.description}
                                      </div>
                                    )}
                                  </div>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  ) : (
                    <NavigationMenuItem key={item.label}>
                      <NavigationMenuLink asChild>
                        <Link
                          className="group inline-flex h-9 w-max items-center justify-center gap-2 rounded-md bg-background px-4 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                          href={item.href ?? "#"}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  )
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        )}

        {/* Right: User avatar dropdown */}
        <div className="ml-auto flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="relative h-9 w-9 rounded-full" variant="ghost">
                <Avatar className="h-9 w-9">
                  <AvatarImage alt="User avatar" src="/avatars/01.png" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="font-medium text-sm leading-none">John Doe</p>
                  <p className="text-muted-foreground text-xs leading-none">
                    john@example.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOutIcon className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
