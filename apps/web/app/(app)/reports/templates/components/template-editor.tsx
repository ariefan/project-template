"use client";

import type { ReportFormat, ReportTemplate } from "@workspace/contracts";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useTemplateMutations } from "../hooks/use-templates-data";

interface TemplateEditorProps {
  template?: ReportTemplate;
  mode: "create" | "edit";
}

const FORMAT_OPTIONS: { value: ReportFormat; label: string }[] = [
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel" },
  { value: "pdf", label: "PDF" },
  { value: "thermal", label: "Thermal Printer" },
  { value: "dotmatrix", label: "Dot Matrix" },
];

interface PreviewData {
  rows: unknown[];
  columns: string[];
  columnKeys?: string[];
  totalCount?: number;
}

function FormatSelect({
  value,
  onChange,
  disabled,
}: {
  value: ReportFormat;
  onChange: (value: ReportFormat) => void;
  disabled: boolean;
}) {
  return (
    <Select
      disabled={disabled}
      onValueChange={(v) => onChange(v as ReportFormat)}
      value={value}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select format" />
      </SelectTrigger>
      <SelectContent>
        {FORMAT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PreviewIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mr-1 h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Preview</title>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EtaSyntaxHelp() {
  return (
    <div className="mt-3 rounded-md bg-muted/50 p-3 text-xs">
      <div className="mb-1 font-medium">Eta Syntax:</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-muted-foreground">
        <span>
          <code className="rounded bg-muted px-1">{"<%= %>"}</code> output
        </span>
        <span>
          <code className="rounded bg-muted px-1">{"<% %>"}</code> code
        </span>
        <span>
          <code className="rounded bg-muted px-1">{"<%# %>"}</code> comment
        </span>
        <span>
          <code className="rounded bg-muted px-1">it.data</code> = rows
        </span>
      </div>
    </div>
  );
}

function PageHeader({ mode }: { mode: "create" | "edit" }) {
  return (
    <div className="mb-6">
      <Link
        className="mb-4 inline-flex items-center text-muted-foreground text-sm hover:text-foreground"
        href="/reports/templates"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Templates
      </Link>
      <h1 className="font-bold text-2xl">
        {mode === "create" ? "Create Template" : "Edit Template"}
      </h1>
      <p className="mt-1 text-muted-foreground">
        {mode === "create"
          ? "Create a new report template using Eta syntax"
          : "Update your report template configuration"}
      </p>
    </div>
  );
}

function PreviewCardContent({
  mode,
  previewError,
  previewData,
}: {
  mode: "create" | "edit";
  previewError: string | null;
  previewData: PreviewData | null;
}) {
  if (previewError) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
        {previewError}
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        {mode === "create"
          ? "Save the template first to preview"
          : "Click Preview to generate sample data"}
      </div>
    );
  }

  return <PreviewTable data={previewData} />;
}

function PreviewTable({ data }: { data: PreviewData }) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-2 text-muted-foreground text-sm">
        Showing {data.rows.length}
        {data.totalCount ? ` of ${data.totalCount}` : ""} rows
      </p>
      <div className="flex-1 overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/90">
            <tr>
              {data.columns.map((col) => (
                <th className="px-3 py-2 text-left font-medium" key={col}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIdx) => {
              const rowData = row as Record<string, unknown>;
              const keys = data.columnKeys ?? data.columns;
              const rowKey =
                keys.map((k) => String(rowData[k] ?? "")).join("-") ||
                `row-${rowIdx}`;
              return (
                <tr className="border-t" key={rowKey}>
                  {keys.map((key) => (
                    <td className="px-3 py-2" key={key}>
                      {String(rowData[key] ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TemplateEditor({ template, mode }: TemplateEditorProps) {
  const router = useRouter();
  // Initialize state from template when in edit mode
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [format, setFormat] = useState<ReportFormat>(template?.format ?? "csv");
  const [templateContent, setTemplateContent] = useState(
    template?.templateContent ??
      "<%# Report Template %>\n<% for (const row of it.data) { %>\n<%= row.id %> | <%= row.name %>\n<% } %>"
  );
  const [isPublic, setIsPublic] = useState(template?.isPublic ?? false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { createTemplate, updateTemplate, isCreating, isUpdating } =
    useTemplateMutations();

  const isLoading = isCreating || isUpdating;

  async function handlePreview() {
    if (mode !== "edit" || !template) {
      setPreviewError("Save the template first to preview");
      return;
    }

    setIsPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);

    try {
      const { reportExportsPreviewExport } = await import(
        "@workspace/contracts"
      );

      // Use template.format directly to ensure valid format value
      const validFormats = [
        "csv",
        "excel",
        "pdf",
        "thermal",
        "dotmatrix",
      ] as const;
      const formatToUse = validFormats.includes(
        format as (typeof validFormats)[number]
      )
        ? format
        : template.format;

      const response = await reportExportsPreviewExport({
        client: apiClient,
        path: { orgId: template.orgId },
        body: {
          templateId: template.id,
          format: formatToUse,
          limit: 10,
        },
      });

      if (response.error) {
        setPreviewError(getErrorMessage(response.error));
        return;
      }

      const data = response.data as {
        data?: {
          rows: unknown[];
          columns: string[];
          columnKeys?: string[];
          totalCount?: number;
        };
      };
      if (data?.data) {
        setPreviewData(data.data);
      }
    } catch (err) {
      setPreviewError(getErrorMessage(err));
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!templateContent.trim()) {
      setError("Template content is required");
      return;
    }

    try {
      if (mode === "create") {
        await createTemplate({
          name,
          description: description || undefined,
          format,
          templateContent,
          columns: [
            { id: "id", header: "ID" },
            { id: "name", header: "Name" },
          ],
          isPublic,
        });
      } else if (template) {
        await updateTemplate({
          id: template.id,
          data: {
            name,
            description: description || undefined,
            format,
            templateContent,
            isPublic,
          },
        });
      }

      const { toast } = await import("sonner");
      toast.success(
        mode === "create" ? "Template created" : "Template updated"
      );
      router.push("/reports/templates");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <PageHeader mode={mode} />

      <form onSubmit={handleSubmit}>
        {/* Basic Information - Compact horizontal layout */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                {error}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  disabled={isLoading}
                  id="name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Template name"
                  value={name}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Input
                  disabled={isLoading}
                  id="description"
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  value={description}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="format">Format</FieldLabel>
                <FormatSelect
                  disabled={isLoading}
                  onChange={setFormat}
                  value={format}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="isPublic">Visibility</FieldLabel>
                <div className="flex h-9 items-center gap-2">
                  <Switch
                    checked={isPublic}
                    disabled={isLoading}
                    id="isPublic"
                    onCheckedChange={setIsPublic}
                  />
                  <span className="text-muted-foreground text-sm">
                    {isPublic ? "Public" : "Private"}
                  </span>
                </div>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Template Content and Preview - Side by side */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left - Template Content */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Template Content</CardTitle>
                  <CardDescription>Eta template syntax</CardDescription>
                </div>
                {mode === "edit" && (
                  <Button
                    disabled={isLoading || isPreviewLoading}
                    onClick={handlePreview}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {isPreviewLoading ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <PreviewIcon />
                    )}
                    Preview
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <Textarea
                className="min-h-96 flex-1 font-mono text-sm"
                disabled={isLoading}
                id="templateContent"
                onChange={(e) => setTemplateContent(e.target.value)}
                placeholder="Enter template content using Eta syntax"
                value={templateContent}
              />
              <EtaSyntaxHelp />
            </CardContent>
          </Card>

          {/* Right - Preview */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                {mode === "create"
                  ? "Save the template to enable preview"
                  : "Sample data from template columns"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <PreviewCardContent
                mode={mode}
                previewData={previewData}
                previewError={previewError}
              />
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Button asChild disabled={isLoading} type="button" variant="outline">
            <Link href="/reports/templates">Cancel</Link>
          </Button>
          <Button disabled={isLoading} type="submit">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {mode === "create" ? "Create Template" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
