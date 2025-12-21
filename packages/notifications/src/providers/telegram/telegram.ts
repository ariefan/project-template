import type { SendResult, TelegramPayload } from "../../types";
import type { TelegramProvider } from "../types";

export type TelegramBotConfig = {
  botToken: string;
};

type TelegramApiResponse = {
  ok: boolean;
  result?: {
    message_id: number;
  };
  description?: string;
};

export function createTelegramProvider(
  config: TelegramBotConfig
): TelegramProvider {
  const baseUrl = `https://api.telegram.org/bot${config.botToken}`;

  return {
    name: "telegram",
    channel: "telegram",

    async send(payload: TelegramPayload): Promise<SendResult> {
      try {
        const response = await fetch(`${baseUrl}/sendMessage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: payload.chatId,
            text: payload.text,
            parse_mode: payload.parseMode ?? "HTML",
            disable_notification: payload.disableNotification,
          }),
        });

        const data = (await response.json()) as TelegramApiResponse;

        if (!data.ok) {
          const isRetryable =
            data.description?.includes("Too Many Requests") ?? false;

          return {
            success: false,
            provider: "telegram",
            error: {
              code: "sendFailed",
              message: data.description ?? "Unknown Telegram API error",
              retryable: isRetryable,
            },
          };
        }

        return {
          success: true,
          messageId: String(data.result?.message_id),
          provider: "telegram",
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        const isRetryable =
          message.includes("timeout") ||
          message.includes("ECONNREFUSED") ||
          message.includes("ETIMEDOUT");

        return {
          success: false,
          provider: "telegram",
          error: {
            code: "sendFailed",
            message,
            retryable: isRetryable,
          },
        };
      }
    },

    validatePayload(payload: TelegramPayload): boolean {
      return Boolean(payload.chatId && payload.text);
    },
  };
}
