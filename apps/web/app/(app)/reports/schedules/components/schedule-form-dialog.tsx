"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  DeliveryMethod,
  ReportTemplate,
  ScheduledReport,
  ScheduleFrequency,
} from "@workspace/contracts";
import { reportTemplatesListOptions } from "@workspace/contracts/query";
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
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useActiveOrganization } from "@/lib/auth";
import { useScheduleMutations } from "../hooks/use-schedules-data";

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: ScheduledReport;
  mode: "create" | "edit";
}

const FREQUENCY_OPTIONS: { value: ScheduleFrequency; label: string }[] = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom (Cron)" },
];

const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "download", label: "Download" },
  { value: "webhook", label: "Webhook" },
  { value: "storage", label: "Cloud Storage" },
];

const DAY_OF_WEEK_OPTIONS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export function ScheduleFormDialog({
  open,
  onOpenChange,
  schedule,
  mode,
}: ScheduleFormDialogProps) {
  const { data: orgData } = useActiveOrganization();
  const orgId = orgData?.id ?? "";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("daily");
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("download");
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [dayOfWeek, setDayOfWeek] = useState("monday");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [cronExpression, setCronExpression] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { createSchedule, updateSchedule, isCreating, isUpdating } =
    useScheduleMutations();

  // Fetch templates for selection
  const { data: templatesData } = useQuery({
    ...reportTemplatesListOptions({
      client: apiClient,
      path: { orgId },
      query: { page: 1, pageSize: 100 },
    }),
    enabled: Boolean(orgId) && open,
  });

  const templates = (templatesData as { data?: ReportTemplate[] })?.data ?? [];

  useEffect(() => {
    if (open) {
      if (mode === "edit" && schedule) {
        setName(schedule.name);
        setDescription(schedule.description ?? "");
        setTemplateId(schedule.templateId);
        setFrequency(schedule.frequency);
        setDeliveryMethod(schedule.deliveryMethod);
        setHour(schedule.hour ?? 9);
        setMinute(schedule.minute ?? 0);
        setDayOfWeek(schedule.dayOfWeek ?? "monday");
        setDayOfMonth(schedule.dayOfMonth ?? 1);
        setCronExpression(schedule.cronExpression ?? "");
        setTimezone(schedule.timezone);
        setIsActive(schedule.isActive);
      } else {
        setName("");
        setDescription("");
        setTemplateId("");
        setFrequency("daily");
        setDeliveryMethod("download");
        setHour(9);
        setMinute(0);
        setDayOfWeek("monday");
        setDayOfMonth(1);
        setCronExpression("");
        setTimezone("UTC");
        setIsActive(true);
      }
      setError(null);
    }
  }, [open, mode, schedule]);

  const isLoading = isCreating || isUpdating;

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Form validation requires checking multiple fields with different rules
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!templateId) {
      setError("Please select a template");
      return;
    }

    try {
      const startDate = new Date();
      startDate.setHours(hour, minute, 0, 0);
      if (startDate < new Date()) {
        startDate.setDate(startDate.getDate() + 1);
      }

      const baseData = {
        name,
        description: description || undefined,
        templateId,
        frequency,
        deliveryMethod,
        hour,
        minute,
        timezone,
        isActive,
        ...(frequency === "weekly" && {
          dayOfWeek: dayOfWeek as
            | "monday"
            | "tuesday"
            | "wednesday"
            | "thursday"
            | "friday"
            | "saturday"
            | "sunday",
        }),
        ...(frequency === "monthly" && { dayOfMonth }),
        ...(frequency === "custom" && { cronExpression }),
      };

      if (mode === "create") {
        await createSchedule({
          ...baseData,
          startDate: startDate.toISOString(),
        });
      } else if (schedule) {
        await updateSchedule({
          id: schedule.id,
          data: baseData,
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
            {mode === "create" ? "Create Schedule" : "Edit Schedule"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Schedule automatic report generation"
              : "Update your scheduled report"}
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
                placeholder="Enter schedule name"
                value={name}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                disabled={isLoading}
                id="description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter schedule description (optional)"
                value={description}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="templateId">Template</FieldLabel>
              <Select
                disabled={isLoading || mode === "edit"}
                onValueChange={setTemplateId}
                value={templateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.format.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="frequency">Frequency</FieldLabel>
              <Select
                disabled={isLoading}
                onValueChange={(value) =>
                  setFrequency(value as ScheduleFrequency)
                }
                value={frequency}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {frequency === "weekly" && (
              <Field>
                <FieldLabel htmlFor="dayOfWeek">Day of Week</FieldLabel>
                <Select
                  disabled={isLoading}
                  onValueChange={setDayOfWeek}
                  value={dayOfWeek}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OF_WEEK_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {frequency === "monthly" && (
              <Field>
                <FieldLabel htmlFor="dayOfMonth">Day of Month</FieldLabel>
                <Input
                  disabled={isLoading}
                  id="dayOfMonth"
                  max={28}
                  min={1}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  type="number"
                  value={dayOfMonth}
                />
              </Field>
            )}

            {frequency === "custom" && (
              <Field>
                <FieldLabel htmlFor="cronExpression">
                  Cron Expression
                </FieldLabel>
                <Input
                  disabled={isLoading}
                  id="cronExpression"
                  onChange={(e) => setCronExpression(e.target.value)}
                  placeholder="0 9 * * *"
                  value={cronExpression}
                />
                <p className="text-muted-foreground text-xs">
                  e.g., &quot;0 9 * * *&quot; for daily at 9 AM
                </p>
              </Field>
            )}

            {frequency !== "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="hour">Hour (0-23)</FieldLabel>
                  <Input
                    disabled={isLoading}
                    id="hour"
                    max={23}
                    min={0}
                    onChange={(e) => setHour(Number(e.target.value))}
                    type="number"
                    value={hour}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="minute">Minute (0-59)</FieldLabel>
                  <Input
                    disabled={isLoading}
                    id="minute"
                    max={59}
                    min={0}
                    onChange={(e) => setMinute(Number(e.target.value))}
                    type="number"
                    value={minute}
                  />
                </Field>
              </div>
            )}

            <Field>
              <FieldLabel htmlFor="deliveryMethod">Delivery Method</FieldLabel>
              <Select
                disabled={isLoading}
                onValueChange={(value) =>
                  setDeliveryMethod(value as DeliveryMethod)
                }
                value={deliveryMethod}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery method" />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
              <Select
                disabled={isLoading}
                onValueChange={setTimezone}
                value={timezone}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">
                    America/New_York
                  </SelectItem>
                  <SelectItem value="America/Los_Angeles">
                    America/Los_Angeles
                  </SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                  <SelectItem value="Asia/Jakarta">Asia/Jakarta</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="isActive">Active</FieldLabel>
                <Switch
                  checked={isActive}
                  disabled={isLoading}
                  id="isActive"
                  onCheckedChange={setIsActive}
                />
              </div>
              <p className="text-muted-foreground text-sm">
                Enable or disable the schedule
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
              {mode === "create" ? "Create Schedule" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
