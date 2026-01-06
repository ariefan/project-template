"use client";

import type { ReportFormat, ReportTemplate } from "@workspace/contracts";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
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
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api-client";
import { useTemplateMutations } from "../hooks/use-templates-data";

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

type PreviewData = {
  rows: unknown[];
  columns: string[];
  columnKeys?: string[];
  totalCount?: number;
} | null;

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  mode,
}: TemplateFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<ReportFormat>("csv");
  const [templateContent, setTemplateContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { createTemplate, updateTemplate, isCreating, isUpdating } =
    useTemplateMutations();

  useEffect(() => {
    if (open) {
      if (mode === "edit" && template) {
        setName(template.name);
        setDescription(template.description ?? "");
        setFormat(template.format);
        setTemplateContent(template.templateContent);
        setIsPublic(template.isPublic);
      } else {
        setName("");
        setDescription("");
        setFormat("csv");
        setTemplateContent(
          "# Report Template\n\n<% it.data.forEach(row => { %>\n- <%= row.id %>: <%= row.name %>\n<% }) %>"
        );
        setIsPublic(false);
      }
      setError(null);
      setPreviewData(null);
      setPreviewError(null);
    }
  }, [open, mode, template]);

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
      const { apiClient } = await import("@/lib/api-client");

      // Get org ID from the template
      const orgId = template.orgId;

      const response = await reportExportsPreviewExport({
        client: apiClient,
        path: { orgId },
        body: {
          templateId: template.id,
          format,
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

  const isLoading = isCreating || isUpdating;

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
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Template" : "Edit Template"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new report template using Eta syntax"
              : "Update your report template"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                {error}
              </div>
            )}

            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                disabled={isLoading}
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter template name"
                value={name}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Input
                disabled={isLoading}
                id="description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter template description (optional)"
                value={description}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="format">Output Format</FieldLabel>
              <Select
                disabled={isLoading}
                onValueChange={(value) => setFormat(value as ReportFormat)}
                value={format}
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
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="templateContent">
                  Template Content (Eta syntax)
                </FieldLabel>
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
                    )}
                    Preview
                  </Button>
                )}
              </div>
              <Textarea
                className="min-h-50 font-mono text-sm"
                disabled={isLoading}
                id="templateContent"
                onChange={(e) => setTemplateContent(e.target.value)}
                placeholder="Enter template content using Eta syntax"
                value={templateContent}
              />
            </Field>

            {previewError && (
              <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                Preview error: {previewError}
              </div>
            )}

            {previewData && (
              <Field>
                <FieldLabel>
                  Preview Results ({previewData.rows.length}
                  {previewData.totalCount
                    ? ` of ${previewData.totalCount}`
                    : ""}{" "}
                  rows)
                </FieldLabel>
                <div className="max-h-48 overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {previewData.columns.map((col) => (
                          <th
                            className="px-3 py-2 text-left font-medium"
                            key={col}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((row, rowIdx) => {
                        const rowData = row as Record<string, unknown>;
                        const keys =
                          previewData.columnKeys ?? previewData.columns;
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
              </Field>
            )}

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="isPublic">Public Template</FieldLabel>
                <Switch
                  checked={isPublic}
                  disabled={isLoading}
                  id="isPublic"
                  onCheckedChange={setIsPublic}
                />
              </div>
              <p className="text-muted-foreground text-sm">
                Public templates can be used by all organization members
              </p>
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isLoading} type="submit">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create Template" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
