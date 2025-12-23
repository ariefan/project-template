/**
 * Configuration for creating a Casbin authorization instance
 */
export type AuthorizationConfig = {
  /**
   * Automatically save policy to database when changes are made
   * @default true
   */
  autoSave?: boolean;
};
