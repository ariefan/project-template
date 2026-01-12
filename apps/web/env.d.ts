export {};

declare global {
  // biome-ignore lint/style/noNamespace: Standard NodeJS type augmentation
  namespace NodeJS {
    interface ProcessEnv {
      BUILD_COMMIT?: string;
      BUILD_TIME?: string;
      APP_VERSION?: string;
    }
  }
}
