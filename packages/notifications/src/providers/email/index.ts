import type { NotificationServiceConfig } from "../../types";
import type { EmailProvider } from "../types";
import { createNodemailerProvider } from "./nodemailer";
import { createResendProvider } from "./resend";

export function createEmailProvider(
  config: NotificationServiceConfig["email"]
): EmailProvider | null {
  if (!config) {
    return null;
  }

  if (config.provider === "resend" && config.resend) {
    return createResendProvider(config.resend.apiKey, config.defaultFrom);
  }

  if (config.provider === "nodemailer" && config.nodemailer) {
    return createNodemailerProvider(config.nodemailer, config.defaultFrom);
  }

  return null;
}

export { createNodemailerProvider } from "./nodemailer";
export { createResendProvider } from "./resend";
