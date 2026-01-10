"use client";

import { cn } from "@workspace/ui/lib/utils";
import { forwardRef, useEffect, useState } from "react";
import { MarkdownRenderer } from "../markdown-renderer";

export interface MarkdownEditorProps {
  /** The markdown content */
  markdown: string;
  /** Callback when content changes */
  onChange: (value: string) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional additional class name for the wrapper */
  className?: string;
  /** Show preview panel (default: true) */
  showPreview?: boolean;
}

export interface MarkdownEditorRef {
  /** Get current markdown value */
  getValue: () => string;
  /** Set markdown value */
  setValue: (value: string) => void;
}

/**
 * MarkdownEditor component
 *
 * A split-view markdown editor with live preview.
 * Features:
 * - Textarea input for markdown editing
 * - Live preview panel using MarkdownRenderer
 * - Responsive split view (stacked on mobile, side-by-side on desktop)
 * - Support for GFM, math equations (KaTeX), and sanitization
 *
 * @example
 * ```tsx
 * <MarkdownEditor
 *   markdown={field.value}
 *   onChange={field.onChange}
 *   placeholder="Write your markdown here..."
 * />
 * ```
 */
export const MarkdownEditor = forwardRef<
  MarkdownEditorRef,
  MarkdownEditorProps
>(
  (
    {
      markdown,
      onChange,
      placeholder = "Write your markdown here...",
      className,
      showPreview = true,
    },
    ref
  ) => {
    const [localValue, setLocalValue] = useState(markdown);

    // Sync local state with prop changes
    useEffect(() => {
      setLocalValue(markdown);
    }, [markdown]);

    // Expose methods via ref
    useEffect(() => {
      if (ref && typeof ref !== "function") {
        ref.current = {
          getValue: () => localValue,
          setValue: (value: string) => {
            setLocalValue(value);
            onChange(value);
          },
        };
      }
    }, [localValue, onChange, ref]);

    const handleChange = (value: string) => {
      setLocalValue(value);
      onChange(value);
    };

    return (
      <div className={cn("grid gap-4", className)}>
        <div className={cn("grid gap-4", showPreview && "lg:grid-cols-2")}>
          {/* Editor Panel */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="font-medium text-foreground text-sm">
                Editor
              </span>
              <span className="text-muted-foreground text-xs">Markdown</span>
            </div>
            <textarea
              className="min-h-[300px] flex-1 resize-none border-0 bg-transparent p-4 font-mono text-sm outline-none focus:outline-none"
              onChange={(e) => handleChange(e.target.value)}
              placeholder={placeholder}
              value={localValue}
            />
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="font-medium text-foreground text-sm">
                  Preview
                </span>
                <span className="text-muted-foreground text-xs">Rendered</span>
              </div>
              <div className="min-h-[300px] flex-1 overflow-y-auto p-4">
                {localValue ? (
                  <MarkdownRenderer content={localValue} />
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    Nothing to preview
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

MarkdownEditor.displayName = "MarkdownEditor";

export default MarkdownEditor;
