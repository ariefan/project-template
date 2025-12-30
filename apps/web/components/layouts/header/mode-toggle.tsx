"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

type ModeToggleVariant = "light-dark" | "full" | "auto";

interface ModeToggleProps {
  variant?: ModeToggleVariant;
}

export function ModeToggle({ variant = "auto" }: ModeToggleProps) {
  const { setTheme, theme } = useTheme();

  const showSystem = variant === "full";
  const showDropdown = variant !== "auto";

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleClick = () => {
    if (variant === "auto") {
      toggleTheme();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button onClick={handleClick} size="icon" variant="ghost">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>

      {showDropdown ? (
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            Dark
          </DropdownMenuItem>
          {showSystem ? (
            <DropdownMenuItem onClick={() => setTheme("system")}>
              System
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  );
}
