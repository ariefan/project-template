import * as React from "react";
import type { FilterValue } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterValue[];
  createdAt: string;
}

interface FilterPresetsStorage {
  presets: FilterPreset[];
  version: number;
}

// ============================================================================
// Hook: useFilterPresets
// ============================================================================

interface UseFilterPresetsOptions {
  /**
   * Storage key for localStorage.
   * Default: "dataview-filter-presets"
   */
  storageKey?: string;

  /**
   * Optional ID to scope presets to a specific data view instance.
   * Useful when you have multiple data views in the same app.
   */
  dataViewId?: string;
}

export function useFilterPresets(options: UseFilterPresetsOptions = {}) {
  const { storageKey = "dataview-filter-presets", dataViewId } = options;

  const getStorageKey = React.useCallback(() => {
    return dataViewId ? `${storageKey}-${dataViewId}` : storageKey;
  }, [storageKey, dataViewId]);

  const [presets, setPresets] = React.useState<FilterPreset[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const stored = localStorage.getItem(getStorageKey());
      if (!stored) {
        return [];
      }

      const parsed: FilterPresetsStorage = JSON.parse(stored);
      return parsed.presets ?? [];
    } catch {
      return [];
    }
  });

  const saveToStorage = React.useCallback(
    (updatedPresets: FilterPreset[]) => {
      if (typeof window === "undefined") {
        return;
      }

      const storage: FilterPresetsStorage = {
        presets: updatedPresets,
        version: 1, // For future migrations
      };

      try {
        localStorage.setItem(getStorageKey(), JSON.stringify(storage));
      } catch (error) {
        console.error("Failed to save filter presets:", error);
      }
    },
    [getStorageKey]
  );

  const savePreset = React.useCallback(
    (name: string, filters: FilterValue[]) => {
      const newPreset: FilterPreset = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        filters,
        createdAt: new Date().toISOString(),
      };

      const updatedPresets = [...presets, newPreset];
      setPresets(updatedPresets);
      saveToStorage(updatedPresets);

      return newPreset;
    },
    [presets, saveToStorage]
  );

  const deletePreset = React.useCallback(
    (presetId: string) => {
      const updatedPresets = presets.filter((p) => p.id !== presetId);
      setPresets(updatedPresets);
      saveToStorage(updatedPresets);
    },
    [presets, saveToStorage]
  );

  const updatePreset = React.useCallback(
    (presetId: string, updates: Partial<Omit<FilterPreset, "id">>) => {
      const updatedPresets = presets.map((p) =>
        p.id === presetId ? { ...p, ...updates } : p
      );
      setPresets(updatedPresets);
      saveToStorage(updatedPresets);
    },
    [presets, saveToStorage]
  );

  const clearAll = React.useCallback(() => {
    setPresets([]);
    saveToStorage([]);
  }, [saveToStorage]);

  return {
    presets,
    savePreset,
    deletePreset,
    updatePreset,
    clearAll,
  };
}
