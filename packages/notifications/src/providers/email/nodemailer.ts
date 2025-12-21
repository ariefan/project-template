import nodemailer from "nodemailer";
import type { EmailPayload, SendResult } from "../../types";
import type { EmailProvider } from "../types";

export type NodemailerConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
};

export function createNodemailerProvider(
  config: NodemailerConfig,
  defaultFrom?: string
): EmailProvider {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  return {
    name: "nodemailer",
    channel: "email",

    async send(payload: EmailPayload): Promise<SendResult> {
      const from = payload.from ?? defaultFrom;
      if (!from) {
        return {
          success: false,
          provider: "nodemailer",
          error: {
            code: "missingFrom",
            message: "No from address specified",
            retryable: false,
          },
        };
      }

      try {
        const result = await transporter.sendMail({
          from,
          to: payload.to,
          subject: payload.subject,
          text: payload.body,
          html: payload.html,
          replyTo: payload.replyTo,
          cc: payload.cc?.join(", "),
          bcc: payload.bcc?.join(", "),
          attachments: payload.attachments?.map((att) => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType,
          })),
        });

        return {
          success: true,
          messageId: result.messageId,
          provider: "nodemailer",
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        const isConnectionError =
          message.includes("ECONNREFUSED") ||
          message.includes("ETIMEDOUT") ||
          message.includes("ENOTFOUND");

        return {
          success: false,
          provider: "nodemailer",
          error: {
            code: "sendFailed",
            message,
            retryable: isConnectionError,
          },
        };
      }
    },

    validatePayload(payload: EmailPayload): boolean {
      return Boolean(payload.to && payload.subject && payload.body);
    },
  };
}
