"use server";

import { render } from "@react-email/render";
import {
  GenericNotificationEmail,
  InvoiceReceiptEmail,
  PasswordResetEmail,
  PaymentFailedEmail,
  SecurityAlertEmail,
  TeamInviteEmail,
  VerificationEmail,
  WelcomeEmail,
} from "@workspace/notifications";
import { createElement } from "react";

const TEMPLATES = {
  welcome: {
    name: "Welcome Email",
    component: WelcomeEmail,
    props: {
      userName: "John Doe",
      loginUrl: "https://example.com/login",
    },
  },
  "password-reset": {
    name: "Password Reset",
    component: PasswordResetEmail,
    props: {
      resetUrl: "https://example.com/reset-password?token=123",
      userName: "Jane Smith",
    },
  },
  verification: {
    name: "Email Verification",
    component: VerificationEmail,
    props: {
      verificationUrl: "https://example.com/verify?token=abc",
      userName: "Alex Johnson",
    },
  },
  "security-alert": {
    name: "Security Alert",
    component: SecurityAlertEmail,
    props: {
      userName: "Sam Wilson",
      device: "Chrome on macOS",
      location: "San Francisco, CA",
      date: new Date().toLocaleString(),
    },
  },
  "team-invite": {
    name: "Team Invite",
    component: TeamInviteEmail,
    props: {
      inviterName: "Sarah Connor",
      teamName: "Resistance Tech",
      inviteLink: "https://example.com/join/resistance",
      role: "Lead Engineer",
    },
  },
  "invoice-receipt": {
    name: "Invoice Receipt",
    component: InvoiceReceiptEmail,
    props: {
      invoiceId: "INV-2024-001",
      date: "Jan 1, 2024",
      totalAmount: "$29.00",
      items: [{ description: "Pro Plan (Monthly)", amount: "$29.00" }],
      downloadLink: "https://example.com/invoice.pdf",
    },
  },
  "payment-failed": {
    name: "Payment Failed",
    component: PaymentFailedEmail,
    props: {
      last4: "4242",
      nextRetryDate: "Jan 5, 2024",
      amount: "$29.00",
      actionUrl: "https://example.com/billing",
    },
  },
  "generic-notification": {
    name: "Generic Notification",
    component: GenericNotificationEmail,
    props: {
      title: "System Maintenance",
      body: "We will be undergoing scheduled maintenance on Saturday.\nPlease save your work.",
      actionLabel: "View Status",
      actionUrl: "https://status.example.com",
    },
  },
};

type TemplateKey = keyof typeof TEMPLATES;

export async function renderEmailTemplate(templateKey: TemplateKey) {
  const template = TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Unknown template: ${templateKey}`);
  }

  try {
    // @ts-expect-error - Dynamic components are tricky to type perfectly here
    const element = createElement(template.component, template.props);
    const html = await render(element);
    return html;
  } catch (error) {
    console.error("Error rendering email template:", error);
    return `<div style="padding: 20px; color: red;">Error rendering template: ${error instanceof Error ? error.message : "Unknown error"}</div>`;
  }
}
