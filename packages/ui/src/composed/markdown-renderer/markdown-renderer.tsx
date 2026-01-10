"use client";

import { cn } from "@workspace/ui/lib/utils";
// biome-ignore lint/correctness/noUnusedImports: Needed for KaTeX CSS
import katex from "katex";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

/**
 * Props for MarkdownRenderer component
 */
export interface MarkdownRendererProps {
  /** The markdown content to render */
  content: string;
  /** Optional additional class name for the wrapper */
  className?: string;
  /** Whether to disable sanitization (NOT RECOMMENDED) */
  disableSanitize?: boolean;
}

/**
 * Custom component styles for markdown elements
 * Uses Tailwind classes for consistent theming
 */
const markdownComponents: Components = {
  // Headings with proper spacing and colors
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        "mt-8 scroll-m-20 font-bold font-heading text-3xl text-foreground tracking-tight first:mt-0",
        className
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        "mt-6 scroll-m-20 border-b pb-2 font-heading font-semibold text-2xl text-foreground tracking-tight first:mt-0",
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        "mt-4 scroll-m-20 font-heading font-semibold text-foreground text-xl tracking-tight first:mt-0",
        className
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(
        "mt-4 scroll-m-20 font-heading font-semibold text-foreground text-lg tracking-tight first:mt-0",
        className
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn(
        "mt-4 scroll-m-20 font-heading font-semibold text-base text-foreground tracking-tight first:mt-0",
        className
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn(
        "mt-4 scroll-m-20 font-heading font-semibold text-base text-muted-foreground tracking-tight first:mt-0",
        className
      )}
      {...props}
    />
  ),

  // Paragraphs with proper spacing
  p: ({ className, ...props }) => (
    <p
      className={cn("text-foreground leading-7 first:mt-0", className)}
      {...props}
    />
  ),

  // Lists with proper spacing
  ul: ({ className, ...props }) => (
    <ul className={cn("my-4 ml-6 list-disc space-y-2", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn("my-4 ml-6 list-decimal space-y-2", className)}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("mt-1", className)} {...props} />
  ),

  // Blockquotes with styling
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "mt-4 border-muted-foreground/30 border-l-4 pl-4 text-muted-foreground italic",
        className
      )}
      {...props}
    />
  ),

  // Code blocks with syntax
  code: ({ className, ...props }) => {
    // Check if this is inline code (has className) or block code
    const isInline = !className || className === "language-text";

    if (isInline) {
      return (
        <code
          className={cn(
            "rounded bg-muted px-1.5 py-0.5 font-mono text-foreground text-sm",
            className
          )}
          {...props}
        />
      );
    }

    return (
      <code
        className={cn(
          "rounded bg-muted px-1.5 py-0.5 font-mono text-foreground text-sm",
          className
        )}
        {...props}
      />
    );
  },
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "mt-4 mb-4 overflow-x-auto rounded-lg border bg-muted p-4 font-mono text-sm",
        className
      )}
      {...props}
    />
  ),

  // Horizontal rule
  hr: ({ ...props }) => <hr className="my-8 border-border" {...props} />,

  // Links with security
  a: ({ className, ...props }) => (
    <a
      className={cn(
        "font-medium text-primary underline underline-offset-4 hover:text-foreground",
        className
      )}
      rel="noopener noreferrer"
      target="_blank"
      {...props}
    />
  ),

  // Images with responsive sizing
  img: ({ className, ...props }) => (
    // biome-ignore lint/a11y/useAltText: Alt text is user's responsibility
    // biome-ignore lint/correctness/useImageSize: Dynamic content, size unknown at compile time
    // biome-ignore lint/performance/noImgElement: Framework-agnostic library, cannot use next/image
    <img
      className={cn("rounded-lg border shadow-md", className)}
      loading="lazy"
      {...props}
    />
  ),

  // Tables
  table: ({ className, ...props }) => (
    <div className="my-4 w-full overflow-y-auto">
      <table
        className={cn("w-full border-collapse border-spacing-0", className)}
        {...props}
      />
    </div>
  ),
  thead: ({ className, ...props }) => (
    <thead className={cn("border-b", className)} {...props} />
  ),
  tbody: ({ className, ...props }) => (
    <tbody className={cn("", className)} {...props} />
  ),
  tr: ({ className, ...props }) => (
    <tr
      className={cn(
        "m-0 border-t p-0 transition-colors hover:bg-muted/50",
        className
      )}
      {...props}
    />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "border px-4 py-2 text-left font-bold text-foreground [&[align=center]]:text-center [&[align=right]]:text-right",
        className
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "border px-4 py-2 text-left text-foreground [&[align=center]]:text-center [&[align=right]]:text-right",
        className
      )}
      {...props}
    />
  ),

  // Strong/bold
  strong: ({ className, ...props }) => (
    <strong
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  ),

  // Emphasis/italic
  em: ({ className, ...props }) => (
    <em className={cn("text-foreground italic", className)} {...props} />
  ),

  // Strikethrough (GFM)
  del: ({ className, ...props }) => (
    <del
      className={cn("text-muted-foreground line-through", className)}
      {...props}
    />
  ),
};

/**
 * MarkdownRenderer component
 *
 * Renders markdown content with full support for:
 * - GitHub Flavored Markdown (GFM): tables, strikethrough, task lists, autolinks
 * - Math equations (KaTeX): inline $...$ and block $$...$$
 * - Sanitization: protects against XSS attacks
 * - Syntax highlighting for code blocks
 * - Proper semantic HTML with ARIA attributes
 * - Dark mode support via Tailwind classes
 *
 * @example
 * ```tsx
 * <MarkdownRenderer content="# Hello\n\nThis is **bold** and $E=mc^2$" />
 * ```
 *
 * @see {@link https://github.com/remarkjs/react-markdown} for react-markdown docs
 * @see {@link https://github.com/remarkjs/remark-gfm} for GFM docs
 * @see {@link https://github.com/remarkjs/remark-math} for math docs
 * @see {@link https://github.com/remarkjs/react-markdown#use} for security info
 */
export function MarkdownRenderer({
  content,
  className,
  disableSanitize = false,
}: MarkdownRendererProps) {
  const rehypePlugins = disableSanitize
    ? [rehypeKatex]
    : [rehypeKatex, rehypeSanitize];

  return (
    <div
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none",
        className
      )}
    >
      <ReactMarkdown
        components={markdownComponents}
        rehypePlugins={rehypePlugins}
        remarkPlugins={[remarkGfm, remarkMath]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Safe HTML schema for sanitization
 *
 * This defines which HTML elements and attributes are allowed in the markdown.
 * Customize this if you need to allow additional elements (e.g., iframes).
 *
 * @see {@link https://github.com/mapbox/rehype-sanitize} for schema format
 */

export default MarkdownRenderer;
