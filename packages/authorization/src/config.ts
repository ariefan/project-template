/**
 * Configuration for creating a Casbin authorization instance
 */
export interface AuthorizationConfig {
  /**
   * Automatically save policy to database when changes are made
   * @default true
   */
  autoSave?: boolean;
}
