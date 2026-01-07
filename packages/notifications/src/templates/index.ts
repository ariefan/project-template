import { render } from "@react-email/render";
import { createElement } from "react";
import {
  GenericNotificationEmail,
  type GenericNotificationEmailProps,
} from "./email/generic-notification";
import {
  InvoiceReceiptEmail,
  type InvoiceReceiptEmailProps,
} from "./email/invoice-receipt";
import {
  PasswordResetEmail,
  type PasswordResetEmailProps,
} from "./email/password-reset";
import {
  PaymentFailedEmail,
  type PaymentFailedEmailProps,
} from "./email/payment-failed";
import {
  SecurityAlertEmail,
  type SecurityAlertEmailProps,
} from "./email/security-alert";
import {
  TeamInviteEmail,
  type TeamInviteEmailProps,
} from "./email/team-invite";
import {
  VerificationEmail,
  type VerificationEmailProps,
} from "./email/verification";
import { WelcomeEmail, type WelcomeEmailProps } from "./email/welcome";

export type TemplateId =
  | "welcome"
  | "password-reset"
  | "verification"
  | "security-alert"
  | "team-invite"
  | "invoice-receipt"
  | "payment-failed"
  | "generic-notification";

export interface TemplatePropsMap {
  welcome: WelcomeEmailProps;
  "password-reset": PasswordResetEmailProps;
  verification: VerificationEmailProps;
  "security-alert": SecurityAlertEmailProps;
  "team-invite": TeamInviteEmailProps;
  "invoice-receipt": InvoiceReceiptEmailProps;
  "payment-failed": PaymentFailedEmailProps;
  "generic-notification": GenericNotificationEmailProps;
}

interface TemplateConfig<T extends TemplateId> {
  component: React.ComponentType<TemplatePropsMap[T]>;
  defaultSubject: string;
}

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
  "team-invite": {
    component: TeamInviteEmail,
    defaultSubject: "You've been invited to join a team",
  },
  "invoice-receipt": {
    component: InvoiceReceiptEmail,
    defaultSubject: "Receipt for your payment",
  },
  "payment-failed": {
    component: PaymentFailedEmail,
    defaultSubject: "Action Required: Payment Failed",
  },
  "generic-notification": {
    component: GenericNotificationEmail,
    defaultSubject: "New Notification",
  },
};

export interface RenderedEmail {
  html: string;
  text: string;
  subject: string;
}

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

export type { GenericNotificationEmailProps } from "./email/generic-notification";
export { GenericNotificationEmail } from "./email/generic-notification";
export type { InvoiceReceiptEmailProps } from "./email/invoice-receipt";
export { InvoiceReceiptEmail } from "./email/invoice-receipt";
// Type exports
export type { PasswordResetEmailProps } from "./email/password-reset";
// Component exports
export { PasswordResetEmail } from "./email/password-reset";
export type { PaymentFailedEmailProps } from "./email/payment-failed";
export { PaymentFailedEmail } from "./email/payment-failed";
export type { SecurityAlertEmailProps } from "./email/security-alert";
export { SecurityAlertEmail } from "./email/security-alert";
export type { TeamInviteEmailProps } from "./email/team-invite";
export { TeamInviteEmail } from "./email/team-invite";
export type { VerificationEmailProps } from "./email/verification";
export { VerificationEmail } from "./email/verification";
export type { WelcomeEmailProps } from "./email/welcome";
export { WelcomeEmail } from "./email/welcome";
