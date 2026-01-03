"use client"

import * as React from "react"
import type { ViewMode } from "./types"

interface UseResponsiveViewOptions {
  /** Default view for desktop */
  defaultView?: ViewMode
  /** Breakpoint for tablet (switches to list/grid) */
  tabletBreakpoint?: number
  /** Breakpoint for mobile (switches to list) */
  mobileBreakpoint?: number
  /** View to use on tablet */
  tabletView?: ViewMode
  /** View to use on mobile */
  mobileView?: ViewMode
  /** Disable responsive behavior */
  disabled?: boolean
}

interface UseResponsiveViewResult {
  view: ViewMode
  setView: (view: ViewMode) => void
  isResponsive: boolean
  screenSize: "mobile" | "tablet" | "desktop"
}

export function useResponsiveView(
  options: UseResponsiveViewOptions = {}
): UseResponsiveViewResult {
  const {
    defaultView = "table",
    tabletBreakpoint = 1024,
    mobileBreakpoint = 640,
    tabletView = "grid",
    mobileView = "list",
    disabled = false,
  } = options

  const [manualView, setManualView] = React.useState<ViewMode | null>(null)
  const [screenSize, setScreenSize] = React.useState<"mobile" | "tablet" | "desktop">("desktop")
  const [isResponsive, setIsResponsive] = React.useState(false)

  React.useEffect(() => {
    if (disabled) return

    const checkScreenSize = () => {
      const width = window.innerWidth

      let newScreenSize: "mobile" | "tablet" | "desktop"
      if (width < mobileBreakpoint) {
        newScreenSize = "mobile"
      } else if (width < tabletBreakpoint) {
        newScreenSize = "tablet"
      } else {
        newScreenSize = "desktop"
      }

      setScreenSize(newScreenSize)
      setIsResponsive(newScreenSize !== "desktop")
    }

    // Initial check
    checkScreenSize()

    // Add resize listener
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [disabled, mobileBreakpoint, tabletBreakpoint])

  // Determine the view based on screen size and manual override
  const view = React.useMemo(() => {
    if (manualView) return manualView
    if (disabled) return defaultView

    switch (screenSize) {
      case "mobile":
        return mobileView
      case "tablet":
        return tabletView
      default:
        return defaultView
    }
  }, [manualView, disabled, screenSize, defaultView, mobileView, tabletView])

  const setView = React.useCallback((newView: ViewMode) => {
    setManualView(newView)
  }, [])

  return {
    view,
    setView,
    isResponsive,
    screenSize,
  }
}
