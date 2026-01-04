"use client";

import * as React from "react";
import type { BulkAction } from "./types";

// ============================================================================
// useBulkActionHandler
// ============================================================================

interface UseBulkActionHandlerResult<T> {
  /** Currently loading action ID (null if none) */
  loadingActionId: string | null;
  /** Execute a bulk action with confirmation and loading state */
  handleAction: (action: BulkAction<T>) => Promise<void>;
  /** Check if a specific action is loading */
  isActionLoading: (actionId: string) => boolean;
  /** Check if any action is loading */
  isAnyLoading: boolean;
}

/**
 * Hook to handle bulk action execution with loading state and confirmation.
 * Consolidates duplicated logic from DataViewBulkActions and InlineBulkActions.
 */
export function useBulkActionHandler<T>(
  selectedRows: T[]
): UseBulkActionHandlerResult<T> {
  const [loadingActionId, setLoadingActionId] = React.useState<string | null>(
    null
  );

  const handleAction = React.useCallback(
    async (action: BulkAction<T>) => {
      if (action.confirmMessage) {
        // biome-ignore lint/suspicious/noAlert: confirmation is intentional for destructive bulk actions
        const confirmed = window.confirm(action.confirmMessage);
        if (!confirmed) {
          return;
        }
      }

      setLoadingActionId(action.id);
      try {
        await action.onAction(selectedRows);
      } finally {
        setLoadingActionId(null);
      }
    },
    [selectedRows]
  );

  const isActionLoading = React.useCallback(
    (actionId: string) => loadingActionId === actionId,
    [loadingActionId]
  );

  return {
    loadingActionId,
    handleAction,
    isActionLoading,
    isAnyLoading: loadingActionId !== null,
  };
}

/**
 * Check if a bulk action is disabled
 */
export function isBulkActionDisabled<T>(
  action: BulkAction<T>,
  selectedRows: T[],
  isLoading: boolean
): boolean {
  if (isLoading) {
    return true;
  }
  if (typeof action.disabled === "function") {
    return action.disabled(selectedRows);
  }
  return action.disabled ?? false;
}
