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
  BookOpenIcon,
  BoxIcon,
  ChevronDownIcon,
  CodeIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HelpCircleIcon,
  LogOutIcon,
  MenuIcon,
  MessageSquareIcon,
  PackageIcon,
  RocketIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ModeToggle } from "@/components/layouts/header/mode-toggle";
import { NotificationMenu } from "@/components/layouts/header/notification-menu";
import { useIsMobile } from "@/hooks/use-mobile";

interface NavSubItem {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface NavItem {
  href?: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  subItems?: NavSubItem[];
}

const navItems: NavItem[] = [
  {
    label: "Products",
    icon: PackageIcon,
    subItems: [
      { href: "/products/analytics", label: "Analytics", icon: ZapIcon },
      { href: "/products/automation", label: "Automation", icon: RocketIcon },
      { href: "/products/security", label: "Security", icon: ShieldIcon },
    ],
  },
  {
    label: "Solutions",
    icon: BoxIcon,
    subItems: [
      { href: "/solutions/enterprise", label: "Enterprise", icon: UsersIcon },
      { href: "/solutions/startups", label: "Startups", icon: RocketIcon },
      { href: "/solutions/developers", label: "Developers", icon: CodeIcon },
    ],
  },
  {
    label: "Resources",
    icon: BookOpenIcon,
    subItems: [
      { href: "/docs", label: "Documentation", icon: FileTextIcon },
      { href: "/blog", label: "Blog", icon: MessageSquareIcon },
      { href: "/support", label: "Support", icon: HelpCircleIcon },
    ],
  },
  { href: "/pricing", label: "Pricing", icon: CreditCardIcon },
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
                <Separator />
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
                            {item.icon && (
                              <item.icon className="h-4 w-4 text-muted-foreground" />
                            )}
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
                          <div className="ml-4 flex flex-col gap-1 pt-1 pl-3">
                            {item.subItems.map((subItem) => (
                              <Link
                                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                                href={subItem.href}
                                key={subItem.href}
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                {subItem.icon && (
                                  <subItem.icon className="h-4 w-4 text-muted-foreground" />
                                )}
                                {subItem.label}
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
                        {item.icon && (
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                        )}
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
            <nav className="flex items-center gap-1">
              {navItems.map((item) =>
                item.subItems ? (
                  <DropdownMenu key={item.label}>
                    <DropdownMenuTrigger asChild>
                      <Button className="gap-2" variant="ghost">
                        {item.icon && <item.icon className="size-4" />}
                        {item.label}
                        <ChevronDownIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {item.subItems.map((subItem) => (
                        <DropdownMenuItem asChild key={subItem.href}>
                          <Link
                            className="flex-row items-center gap-2"
                            href={subItem.href}
                          >
                            {subItem.icon && <subItem.icon />}
                            {subItem.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button asChild key={item.label} variant="ghost">
                    <Link className="gap-2" href={item.href ?? "#"}>
                      {item.icon && <item.icon className="size-4" />}
                      {item.label}
                    </Link>
                  </Button>
                )
              )}
            </nav>
          </div>
        )}

        {/* Right: Notification, Theme toggle, User avatar */}
        <div className="ml-auto flex items-center gap-1">
          <NotificationMenu />
          <ModeToggle />
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
