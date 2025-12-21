import { render } from "@react-email/render";
import { createElement } from "react";
import {
  PasswordResetEmail,
  type PasswordResetEmailProps,
} from "./email/password-reset";
import {
  SecurityAlertEmail,
  type SecurityAlertEmailProps,
} from "./email/security-alert";
import {
  VerificationEmail,
  type VerificationEmailProps,
} from "./email/verification";
import { WelcomeEmail, type WelcomeEmailProps } from "./email/welcome";

export type TemplateId =
  | "welcome"
  | "password-reset"
  | "verification"
  | "security-alert";

export type TemplatePropsMap = {
  welcome: WelcomeEmailProps;
  "password-reset": PasswordResetEmailProps;
  verification: VerificationEmailProps;
  "security-alert": SecurityAlertEmailProps;
};

type TemplateConfig<T extends TemplateId> = {
  component: React.ComponentType<TemplatePropsMap[T]>;
  defaultSubject: string;
};

const templates: { [K in TemplateId]: TemplateConfig<K> } = {
  welcome: {
    component: WelcomeEmail,
    defaultSubject: "Welcome to our platform!",
  },
  "password-reset": {
    component: PasswordResetEmail,
    defaultSubject: "Reset your password",
  },
  verification: {
    component: VerificationEmail,
    defaultSubject: "Verify your email address",
  },
  "security-alert": {
    component: SecurityAlertEmail,
    defaultSubject: "Security Alert",
  },
};

export type RenderedEmail = {
  html: string;
  text: string;
  subject: string;
};

export async function renderTemplate(
  templateId: TemplateId,
  props: Record<string, unknown>,
  options?: { subject?: string }
): Promise<RenderedEmail> {
  const template = templates[templateId];
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Dynamic component/props type at runtime
  const element = createElement(template.component as any, props);
  const html = await render(element);
  const text = await render(element, { plainText: true });

  return {
    html,
    text,
    subject: options?.subject ?? template.defaultSubject,
  };
}

export function getTemplateSubject(templateId: TemplateId): string {
  const template = templates[templateId];
  return template?.defaultSubject ?? "";
}

export function isValidTemplateId(id: string): id is TemplateId {
  return id in templates;
}

// Type exports only - components are internal
export type { PasswordResetEmailProps } from "./email/password-reset";
export type { SecurityAlertEmailProps } from "./email/security-alert";
export type { VerificationEmailProps } from "./email/verification";
export type { WelcomeEmailProps } from "./email/welcome";
