"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  JobDeliveryMethod,
  ScheduledJob,
  ScheduleFrequency,
} from "@workspace/contracts";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { Check, ChevronDown, Copy, HelpCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api-client";
import { useScheduleMutations } from "../hooks/use-schedules-data";
import { fetchJobTypes } from "../lib/job-templates";
import { DELIVERY_OPTIONS, FREQUENCY_OPTIONS } from "../schedules.config";

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: ScheduledJob;
  mode: "create" | "edit";
}

// Remove static JOB_TYPE_OPTIONS as we'll fetch them dynamically

const DAY_OF_WEEK_OPTIONS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

// Expanded timezone options
const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "America/Denver", label: "America/Denver (MST/MDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "America/Phoenix", label: "America/Phoenix (MST)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Jakarta", label: "Asia/Jakarta (WIB)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST/NZDT)" },
];

// Cron validation regex (basic validation for 5-part cron)
const CRON_REGEX =
  /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|(\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)+)) (\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|(\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)+)) (\*|([0-9]|1[0-9]|2[0-9]|3[0-9])|(\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)+)|\?) (\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9]|10[0-9]|11[0-9]|12[0-9])|(\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)+)|\?) (\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9])|(\/[0-9]+)|([0-9]+-[0-9]+)|([0-9]+(,[0-9]+)+)|\?)$/;

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Form component with many fields
export function ScheduleFormDialog({
  open,
  onOpenChange,
  schedule,
  mode,
}: ScheduleFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [jobType, setJobType] = useState("report");
  const [jobConfig, setJobConfig] = useState<Record<string, unknown>>({});
  const [frequency, setFrequency] = useState<ScheduleFrequency>("daily");
  const [deliveryMethod, setDeliveryMethod] =
    useState<JobDeliveryMethod>("none");
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [dayOfWeek, setDayOfWeek] = useState("monday");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [cronExpression, setCronExpression] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // JSON validation state
  const [jobConfigString, setJobConfigString] = useState("{}");
  const [configError, setConfigError] = useState<string>("");
  const [showTemplateHelp, setShowTemplateHelp] = useState(false);
  const [cronError, setCronError] = useState<string>("");

  const { createSchedule, updateSchedule, isCreating, isUpdating } =
    useScheduleMutations();

  useEffect(() => {
    if (open) {
      if (mode === "edit" && schedule) {
        setName(schedule.name);
        setDescription(schedule.description ?? "");
        setJobType(schedule.jobType);
        const config = (schedule.jobConfig as Record<string, unknown>) ?? {};
        setJobConfig(config);
        setJobConfigString(JSON.stringify(config, null, 2));
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
        setJobType(""); // Start empty and let user select
        setJobConfig({});
        setJobConfigString("{}");
        setFrequency("daily");
        setDeliveryMethod("none");
        setHour(9);
        setMinute(0);
        setDayOfWeek("monday");
        setDayOfMonth(1);
        setCronExpression("");
        setTimezone("UTC");
        setIsActive(true);
      }
      setError(null);
      setConfigError("");
      setCronError("");
      setShowTemplateHelp(false);
    }
  }, [open, mode, schedule]);

  const isLoading = isCreating || isUpdating;

  const { data: jobTypes = [], isLoading: isLoadingJobTypes } = useQuery({
    queryKey: ["job-types"],
    queryFn: fetchJobTypes,
  });

  const currentTemplate = jobTypes.find((t) => t.type === jobType);

  // Handle job config JSON validation
  function handleJobConfigChange(value: string) {
    setJobConfigString(value);
    try {
      if (value.trim()) {
        const parsed = JSON.parse(value);
        setJobConfig(parsed);
        setConfigError("");
      } else {
        setJobConfig({});
        setConfigError("");
      }
    } catch {
      setConfigError("Invalid JSON");
    }
  }

  // Load template config
  function loadTemplate() {
    if (currentTemplate) {
      const templateConfig = JSON.stringify(
        currentTemplate.exampleConfig ?? {},
        null,
        2
      );
      setJobConfigString(templateConfig);
      setJobConfig(currentTemplate.exampleConfig ?? {});
      setConfigError("");
    }
  }

  // Handle cron expression change with validation
  function handleCronChange(value: string) {
    setCronExpression(value);
    if (value && !CRON_REGEX.test(value)) {
      setCronError("Invalid cron format (min hour day month weekday)");
    } else {
      setCronError("");
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Form validation requires checking multiple fields
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!jobType) {
      setError("Job type is required");
      return;
    }

    if (configError) {
      setError("Please fix the JSON configuration error");
      return;
    }

    if (frequency === "custom" && cronError) {
      setError("Please fix the cron expression error");
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
        jobType,
        jobConfig: Object.keys(jobConfig).length > 0 ? jobConfig : undefined,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Schedule" : "Edit Schedule"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Schedule automatic job execution"
              : "Update your scheduled job"}
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
              <FieldLabel htmlFor="jobType">Job Type</FieldLabel>
              <div className="flex gap-2">
                <Select
                  disabled={isLoading || isLoadingJobTypes}
                  onValueChange={(value) => {
                    setJobType(value);
                    const template = jobTypes.find((t) => t.type === value);
                    if (template) {
                      setJobConfig(template.exampleConfig ?? {});
                      setJobConfigString(
                        JSON.stringify(template.exampleConfig ?? {}, null, 2)
                      );
                      setConfigError("");
                    }
                  }}
                  value={jobType}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue
                      placeholder={
                        isLoadingJobTypes
                          ? "Loading job types..."
                          : "Select job type"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTypes.map((option) => (
                      <SelectItem key={option.type} value={option.type}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      className="shrink-0"
                      disabled={isLoading || isLoadingJobTypes}
                      type="button"
                      variant="outline"
                    >
                      <HelpCircle className="size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-4">
                    <div className="space-y-3">
                      <p className="font-medium text-sm">Job Templates</p>
                      <p className="text-muted-foreground text-xs">
                        Select a template to load example configuration
                      </p>
                      {jobTypes.map((option) => (
                        <button
                          className="w-full rounded-md p-2 text-left text-sm transition-colors hover:bg-accent"
                          key={option.type}
                          onClick={() => {
                            setJobType(option.type);
                            setJobConfigString(
                              JSON.stringify(
                                option.exampleConfig ?? {},
                                null,
                                2
                              )
                            );
                            setJobConfig(option.exampleConfig ?? {});
                            setConfigError("");
                          }}
                          type="button"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{option.label}</span>
                            {jobType === option.type && (
                              <Check className="size-3 text-green-500" />
                            )}
                          </div>
                          <div className="mt-0.5 text-muted-foreground text-xs">
                            {option.description}
                          </div>
                        </button>
                      ))}
                      {jobTypes.length === 0 && !isLoadingJobTypes && (
                        <p className="py-2 text-center text-muted-foreground text-xs">
                          No templates available
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-muted-foreground text-sm">
                {currentTemplate
                  ? currentTemplate.description
                  : "Custom job type - enter your own configuration"}
              </p>
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="jobConfig">
                  Job Configuration (JSON)
                </FieldLabel>
                {currentTemplate && (
                  <Button
                    className="h-7 text-xs"
                    disabled={isLoading}
                    onClick={loadTemplate}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Copy className="mr-1.5 size-3" />
                    Load Template
                  </Button>
                )}
              </div>
              <Textarea
                className={cn(
                  "font-mono text-xs",
                  configError &&
                    "border-destructive focus-visible:ring-destructive"
                )}
                disabled={isLoading}
                id="jobConfig"
                onChange={(e) => handleJobConfigChange(e.target.value)}
                placeholder={
                  currentTemplate
                    ? JSON.stringify(currentTemplate.exampleConfig, null, 2)
                    : '{\n  "key": "value"\n}'
                }
                value={jobConfigString}
              />
              {configError && (
                <p className="flex items-center gap-1.5 text-destructive text-sm">
                  <HelpCircle className="size-3" />
                  {configError}
                </p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs">
                  Job-specific configuration in JSON format
                </p>
                {currentTemplate?.configSchema && (
                  <Button
                    className="h-auto p-0 text-xs"
                    disabled={isLoading}
                    onClick={() => setShowTemplateHelp(!showTemplateHelp)}
                    size="sm"
                    type="button"
                    variant="link"
                  >
                    Schema
                    <ChevronDown
                      className={cn(
                        "size-3 transition-transform",
                        showTemplateHelp && "rotate-180"
                      )}
                    />
                  </Button>
                )}
              </div>
              {showTemplateHelp && currentTemplate?.configSchema && (
                <div className="rounded-md bg-muted p-3">
                  <p className="mb-1 text-muted-foreground text-xs">
                    Expected schema for {currentTemplate.label}:
                  </p>
                  <code className="text-xs">
                    {currentTemplate.configSchema}
                  </code>
                </div>
              )}
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
                  max={31}
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
                  className={cn(
                    cronError &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                  disabled={isLoading}
                  id="cronExpression"
                  onChange={(e) => handleCronChange(e.target.value)}
                  placeholder="0 9 * * *"
                  value={cronExpression}
                />
                {cronError && (
                  <p className="flex items-center gap-1.5 text-destructive text-sm">
                    <HelpCircle className="size-3" />
                    {cronError}
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  Format: minute hour day month weekday
                  <br />
                  <a
                    className="underline hover:text-foreground"
                    href="https://crontab.guru/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Cron reference →
                  </a>
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
                  setDeliveryMethod(value as JobDeliveryMethod)
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
                  {TIMEZONE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
