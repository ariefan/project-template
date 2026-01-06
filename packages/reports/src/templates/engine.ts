/**
 * Template Engine
 *
 * Eta-based template rendering with custom helpers
 */

import { Eta } from "eta";
import { TemplateHelpers } from "./helpers";

const LINE_NUMBER_PATTERN = /line\s+(\d+)/i;

export interface TemplateContext<T = unknown> {
  /** Data to render */
  data: T[];
  /** Metadata about the report */
  metadata: {
    title?: string;
    subtitle?: string;
    generatedAt: Date;
    rowCount: number;
    pageNumber?: number;
    totalPages?: number;
  };
  /** Additional parameters */
  params?: Record<string, unknown>;
}

export interface RenderOptions {
  /** Enable debug mode */
  debug?: boolean;
  /** Custom helpers to merge with defaults */
  helpers?: Record<string, (...args: unknown[]) => unknown>;
}

export class TemplateEngine {
  private readonly eta: Eta;
  private readonly cache: Map<string, unknown>;

  constructor() {
    this.eta = new Eta({
      // Use "it" as the data variable (Eta default)
      varName: "it",
      // Enable auto-escaping for HTML safety
      autoEscape: true,
      // Enable caching
      cache: true,
    });

    this.cache = new Map();
  }

  /**
   * Render a template with data and helpers
   */
  async render<T>(
    templateContent: string,
    context: TemplateContext<T>,
    options?: RenderOptions
  ): Promise<string> {
    // Merge helpers with context
    const helpers = {
      ...TemplateHelpers,
      ...options?.helpers,
    };

    // Build template data
    const templateData = {
      ...context,
      ...helpers,
    };

    try {
      const result = await this.eta.renderStringAsync(
        templateContent,
        templateData
      );
      return result;
    } catch (error) {
      if (options?.debug) {
        console.error("Template render error:", error);
        console.error("Template content:", templateContent);
        console.error("Context:", context);
      }
      throw new TemplateRenderError(
        `Failed to render template: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Compile a template for repeated use
   */
  compile(templateContent: string): (data: object) => string {
    try {
      // Validate by compiling
      this.eta.compile(templateContent);
      // Return a render function that uses the instance
      const eta = this.eta;
      return (data: object) => eta.renderString(templateContent, data);
    } catch (error) {
      throw new TemplateCompileError(
        `Failed to compile template: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * Validate template syntax without rendering
   */
  validate(templateContent: string): ValidationResult {
    try {
      // Try to compile the template
      this.eta.compile(templateContent);
      return { valid: true, errors: [] };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        errors: [
          {
            message: errorMessage,
            line: this.extractLineNumber(errorMessage),
          },
        ],
      };
    }
  }

  /**
   * Get available helper function names
   */
  getAvailableHelpers(): string[] {
    return Object.keys(TemplateHelpers);
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Extract line number from error message
   */
  private extractLineNumber(errorMessage: string): number | undefined {
    const match = errorMessage.match(LINE_NUMBER_PATTERN);
    return match?.[1] ? Number.parseInt(match[1], 10) : undefined;
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    message: string;
    line?: number;
    column?: number;
  }>;
}

export class TemplateRenderError extends Error {
  cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "TemplateRenderError";
    this.cause = cause;
  }
}

export class TemplateCompileError extends Error {
  cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "TemplateCompileError";
    this.cause = cause;
  }
}

/**
 * Create a new template engine instance
 */
export function createTemplateEngine(): TemplateEngine {
  return new TemplateEngine();
}
