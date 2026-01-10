"use client";

import { cn } from "@workspace/ui/lib/utils";
import dynamic from "next/dynamic";
import { type ForwardedRef, forwardRef } from "react";
import "@mdxeditor/editor/style.css";
// Import custom styles for dark mode and overrides
import "./markdown-editor.css";

// Dynamically import MDXEditor to avoid SSR issues
const MDXEditor = dynamic(
  () => import("@mdxeditor/editor").then((mod) => mod.MDXEditor),
  { ssr: false }
);

import {
  codeBlockPlugin,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  type MDXEditorMethods,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";
import { MarkdownToolbar } from "./markdown-toolbar";

export interface MarkdownEditorProps {
  /** The markdown content */
  markdown: string;
  /** Callback when content changes */
  onChange: (value: string) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional additional class name for the wrapper */
  className?: string;
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
 * Uses @mdxeditor/editor (WYSIWYG) with Source Mode toggle.
 */
export const MarkdownEditor = forwardRef<
  MarkdownEditorRef | MDXEditorMethods,
  MarkdownEditorProps
>(({ markdown, onChange, placeholder, className }, ref) => {
  return (
    <div className={cn("markdown-editor-wrapper", className)}>
      <div className="relative flex flex-col overflow-hidden rounded-md border bg-background">
        <MDXEditor
          className={cn(
            "markdown-editor-content dark:prose-invert min-h-[300px] p-2"
          )}
          contentEditableClassName="prose dark:prose-invert max-w-none focus:outline-none min-h-[300px]"
          markdown={markdown}
          onChange={onChange}
          placeholder={placeholder}
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            markdownShortcutPlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            imagePlugin(),
            tablePlugin(),
            codeBlockPlugin(),
            diffSourcePlugin({ viewMode: "rich-text" }),
            toolbarPlugin({
              toolbarContents: () => <MarkdownToolbar />,
            }),
          ]}
          ref={ref as ForwardedRef<MDXEditorMethods>}
        />
      </div>
    </div>
  );
});

MarkdownEditor.displayName = "MarkdownEditor";

export default MarkdownEditor;
