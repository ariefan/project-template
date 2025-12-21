import type { NotificationServiceConfig } from "../types";
import { createEmailProvider } from "./email";
import { createSmsProvider } from "./sms";
import { createTelegramProviderFromConfig } from "./telegram";
import type { ProviderRegistry } from "./types";
import { createWhatsAppProvider } from "./whatsapp";

export function createProviderRegistry(
  config: NotificationServiceConfig
): ProviderRegistry {
  return {
    email: createEmailProvider(config.email),
    sms: createSmsProvider(config.sms),
    whatsapp: createWhatsAppProvider(config.whatsapp),
    telegram: createTelegramProviderFromConfig(config.telegram),
  };
}

export { createEmailProvider } from "./email";
export { createSmsProvider } from "./sms";
export {
  createTelegramProvider,
  createTelegramProviderFromConfig,
} from "./telegram";
export * from "./types";
export { createWhatsAppProvider } from "./whatsapp";
