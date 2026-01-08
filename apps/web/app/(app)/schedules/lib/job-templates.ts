/**
 * Job Templates for Scheduled Jobs
 *
 * Defines common job types with example configurations and schema descriptions.
 * These templates help users configure job settings for the schedule form.
 */

export interface JobTemplate {
  type: string;
  label: string;
  description: string;
  exampleConfig: Record<string, unknown>;
  configSchema?: string;
}

export const JOB_TEMPLATES: Record<string, JobTemplate> = {
  report: {
    type: "report",
    label: "Report",
    description: "Generate a report from a template",
    exampleConfig: {
      templateId: "tpl_sales_summary",
      format: "xlsx",
      parameters: {
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      },
    },
    configSchema:
      '{ templateId: string, format?: "xlsx"|"csv"|"pdf", parameters?: {...} }',
  },
  export: {
    type: "export",
    label: "Data Export",
    description: "Export data to a file",
    exampleConfig: {
      format: "xlsx",
      filters: {
        status: "active",
        dateRange: "last-30-days",
      },
    },
    configSchema: '{ format: "xlsx"|"csv"|"json", filters?: {...} }',
  },
  import: {
    type: "import",
    label: "Data Import",
    description: "Import data from a file",
    exampleConfig: {
      sourceType: "s3",
      bucket: "my-bucket",
      key: "imports/data.csv",
      mapping: {
        email: "userEmail",
        name: "fullName",
      },
    },
    configSchema:
      '{ sourceType: "s3"|"url"|"upload", bucket?: string, key?: string, mapping?: {...} }',
  },
  backup: {
    type: "backup",
    label: "Database Backup",
    description: "Backup database to S3",
    exampleConfig: {
      target: "postgresql",
      compression: true,
    },
    configSchema: "{ target: string, compression?: boolean }",
  },
  sync: {
    type: "sync",
    label: "External Sync",
    description: "Sync data with external API",
    exampleConfig: {
      endpoint: "https://api.example.com/sync",
      apiKey: "{{ secrets.API_KEY }}",
    },
    configSchema: "{ endpoint: string, apiKey?: string, headers?: {...} }",
  },
  cleanup: {
    type: "cleanup",
    label: "Data Cleanup",
    description: "Clean up old or expired data",
    exampleConfig: {
      targetType: "logs",
      retentionDays: 90,
      batchSize: 1000,
    },
    configSchema:
      "{ targetType: string, retentionDays: number, batchSize?: number }",
  },
  notify: {
    type: "notify",
    label: "Notification",
    description: "Send scheduled notifications",
    exampleConfig: {
      channels: ["email", "slack"],
      template: "weekly_summary",
      recipients: ["team@example.com"],
    },
    configSchema:
      "{ channels: string[], template: string, recipients?: string[] }",
  },
  webhook: {
    type: "webhook",
    label: "Webhook Call",
    description: "Trigger an external webhook",
    exampleConfig: {
      url: "https://api.example.com/webhooks/scheduled",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        event: "scheduled_trigger",
        timestamp: "{{ now }}",
      },
    },
    configSchema:
      '{ url: string, method?: "GET"|"POST"|"PUT", headers?: {...}, body?: {...} }',
  },
  aggregate: {
    type: "aggregate",
    label: "Data Aggregation",
    description: "Aggregate and compute metrics",
    exampleConfig: {
      sourceTable: "events",
      metrics: ["count", "avg_duration", "success_rate"],
      groupBy: ["date", "region"],
      targetTable: "daily_metrics",
    },
    configSchema:
      "{ sourceTable: string, metrics: string[], groupBy?: string[], targetTable?: string }",
  },
};

// Get all templates as array for Select/Combobox options
export const JOB_TEMPLATE_OPTIONS = Object.values(JOB_TEMPLATES);

// Get template by type
export function getJobTemplate(type: string): JobTemplate | undefined {
  return JOB_TEMPLATES[type];
}

// Get job type options for Combobox (value/label format)
export function getJobTypeOptions(): Array<{ value: string; label: string }> {
  return JOB_TEMPLATE_OPTIONS.map((t) => ({ value: t.type, label: t.label }));
}
