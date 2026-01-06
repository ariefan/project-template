/**
 * Template Validator
 *
 * Validates template syntax and structure
 */

import { createTemplateEngine, type ValidationResult } from "./engine";
import { TemplateHelpers } from "./helpers";

// Top-level regex patterns for performance
const INFINITE_LOOP_PATTERN = /while\s*\(\s*true\s*\)/;
const CONSOLE_PATTERN = /console\.\w+/;
const EVAL_PATTERN = /\beval\s*\(/;

export interface ValidationOptions {
  /** Require specific variables in template */
  requiredVariables?: string[];
  /** Max template size in bytes */
  maxSize?: number;
  /** Allowed helper functions */
  allowedHelpers?: string[];
  /** Disallowed patterns (regex) */
  disallowedPatterns?: RegExp[];
}

export interface DetailedValidationResult extends ValidationResult {
  /** Variables found in template */
  variables: string[];
  /** Helper functions used */
  helpers: string[];
  /** Template size in bytes */
  size: number;
  /** Warnings (non-fatal issues) */
  warnings: Array<{
    message: string;
    line?: number;
  }>;
}

export class TemplateValidator {
  private readonly engine = createTemplateEngine();

  /**
   * Validate a template with detailed analysis
   */
  validate(
    templateContent: string,
    options?: ValidationOptions
  ): DetailedValidationResult {
    const errors: Array<{ message: string; line?: number }> = [];
    const warnings: Array<{ message: string; line?: number }> = [];
    const size = Buffer.byteLength(templateContent, "utf-8");

    this.checkSize(size, options?.maxSize, errors);
    this.checkDisallowedPatterns(
      templateContent,
      options?.disallowedPatterns,
      errors
    );

    const variables = this.extractVariables(templateContent);
    const helpers = this.extractHelpers(templateContent);

    this.checkRequiredVariables(variables, options?.requiredVariables, errors);
    this.checkAllowedHelpers(helpers, options?.allowedHelpers, warnings);
    this.checkSyntax(templateContent, errors);
    this.checkCommonIssues(templateContent, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      variables,
      helpers,
      size,
    };
  }

  private checkSize(
    size: number,
    maxSize: number | undefined,
    errors: Array<{ message: string; line?: number }>
  ): void {
    const limit = maxSize ?? 100_000;
    if (size > limit) {
      errors.push({
        message: `Template exceeds maximum size of ${limit} bytes (actual: ${size})`,
      });
    }
  }

  private checkDisallowedPatterns(
    templateContent: string,
    patterns: RegExp[] | undefined,
    errors: Array<{ message: string; line?: number }>
  ): void {
    if (!patterns) {
      return;
    }
    for (const pattern of patterns) {
      const match = templateContent.match(pattern);
      if (match) {
        errors.push({
          message: `Template contains disallowed pattern: ${pattern.source}`,
          line: this.getLineNumber(templateContent, match.index ?? 0),
        });
      }
    }
  }

  private checkRequiredVariables(
    variables: string[],
    required: string[] | undefined,
    errors: Array<{ message: string; line?: number }>
  ): void {
    if (!required) {
      return;
    }
    for (const reqVar of required) {
      if (!variables.includes(reqVar)) {
        errors.push({ message: `Required variable not found: ${reqVar}` });
      }
    }
  }

  private checkAllowedHelpers(
    helpers: string[],
    allowed: string[] | undefined,
    warnings: Array<{ message: string; line?: number }>
  ): void {
    if (!allowed) {
      return;
    }
    for (const helper of helpers) {
      if (!allowed.includes(helper)) {
        warnings.push({ message: `Helper '${helper}' is not in allowed list` });
      }
    }
  }

  private checkSyntax(
    templateContent: string,
    errors: Array<{ message: string; line?: number }>
  ): void {
    const syntaxResult = this.engine.validate(templateContent);
    if (!syntaxResult.valid) {
      errors.push(...syntaxResult.errors);
    }
  }

  /**
   * Extract variable references from template
   */
  private extractVariables(templateContent: string): string[] {
    const variables = new Set<string>();

    // Match <%= it.variableName %> and <% it.variableName %>
    const variablePattern = /it\.(\w+(?:\.\w+)*)/g;
    const matches = templateContent.matchAll(variablePattern);

    for (const match of matches) {
      if (match[1]) {
        variables.add(match[1]);
      }
    }

    return Array.from(variables);
  }

  /**
   * Extract helper function calls from template
   */
  private extractHelpers(templateContent: string): string[] {
    const helpers = new Set<string>();
    const availableHelpers = Object.keys(TemplateHelpers);

    // Match helper function calls
    for (const helper of availableHelpers) {
      const pattern = new RegExp(`\\b${helper}\\s*\\(`, "g");
      if (pattern.test(templateContent)) {
        helpers.add(helper);
      }
    }

    return Array.from(helpers);
  }

  /**
   * Check for common template issues
   */
  private checkCommonIssues(
    templateContent: string,
    warnings: Array<{ message: string; line?: number }>
  ): void {
    // Check for unclosed tags
    const openTags = (templateContent.match(/<%/g) || []).length;
    const closeTags = (templateContent.match(/%>/g) || []).length;

    if (openTags !== closeTags) {
      warnings.push({
        message: `Unbalanced template tags: ${openTags} opening, ${closeTags} closing`,
      });
    }

    // Check for potential infinite loops
    if (INFINITE_LOOP_PATTERN.test(templateContent)) {
      warnings.push({
        message: "Potential infinite loop detected (while(true))",
      });
    }

    // Check for direct console usage
    if (CONSOLE_PATTERN.test(templateContent)) {
      warnings.push({
        message: "Template contains console statements",
      });
    }

    // Check for eval usage
    if (EVAL_PATTERN.test(templateContent)) {
      warnings.push({
        message: "Template contains eval() which may be unsafe",
      });
    }
  }

  /**
   * Get line number from character position
   */
  private getLineNumber(content: string, position: number): number {
    const beforePosition = content.substring(0, position);
    return (beforePosition.match(/\n/g) || []).length + 1;
  }
}

/**
 * Create a new template validator
 */
export function createTemplateValidator(): TemplateValidator {
  return new TemplateValidator();
}
