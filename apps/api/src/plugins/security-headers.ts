/**
 * Security Headers Plugin
 *
 * Implements security best practices using @fastify/helmet.
 * Protects against common web vulnerabilities by setting HTTP security headers.
 *
 * Headers Added:
 * ---------------
 *
 * 1. Content-Security-Policy (CSP)
 *    - Prevents XSS attacks by controlling resource loading
 *    - Configured for API usage (not frontend rendering)
 *
 * 2. X-Content-Type-Options: nosniff
 *    - Prevents MIME-type sniffing attacks
 *    - Forces browsers to respect declared content types
 *
 * 3. X-Frame-Options: DENY
 *    - Prevents clickjacking attacks
 *    - Blocks page from being embedded in iframes
 *
 * 4. X-XSS-Protection: 0
 *    - Disables legacy XSS filter (CSP is more effective)
 *    - Modern browsers ignore this in favor of CSP
 *
 * 5. Strict-Transport-Security (HSTS)
 *    - Enforces HTTPS connections only
 *    - Tells browsers to only connect via HTTPS for 1 year
 *
 * 6. X-DNS-Prefetch-Control: off
 *    - Prevents DNS prefetching (privacy protection)
 *
 * 7. X-Download-Options: noopen
 *    - Prevents IE from executing downloads in site context
 *
 * 8. X-Permitted-Cross-Domain-Policies: none
 *    - Restricts Adobe Flash/PDF cross-domain policies
 *
 * Security Benefits:
 * ------------------
 * - XSS Protection: CSP prevents malicious script execution
 * - Clickjacking Prevention: X-Frame-Options blocks iframe embedding
 * - MIME Sniffing Protection: Prevents browser content-type confusion
 * - HTTPS Enforcement: HSTS ensures encrypted connections
 * - Privacy: Disables DNS prefetching and cross-domain policies
 *
 * References:
 * - OWASP Secure Headers Project: https://owasp.org/www-project-secure-headers/
 * - Mozilla Web Security Guidelines: https://infosec.mozilla.org/guidelines/web_security
 */

import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";

export default async function securityHeadersPlugin(app: FastifyInstance) {
  await app.register(helmet, {
    // Content Security Policy - prevents XSS attacks
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], // Only load resources from same origin
        scriptSrc: ["'self'"], // Only execute scripts from same origin
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (common for APIs serving docs)
        imgSrc: ["'self'", "data:", "https:"], // Allow images from self, data URIs, and HTTPS
        connectSrc: ["'self'"], // Only connect to same origin
        fontSrc: ["'self'"], // Only load fonts from same origin
        objectSrc: ["'none'"], // Disable plugins (Flash, etc.)
        mediaSrc: ["'self'"], // Only load media from same origin
        frameSrc: ["'none'"], // Disable iframes
      },
    },

    // Cross-Origin policies
    crossOriginEmbedderPolicy: false, // Disabled for API usage
    crossOriginOpenerPolicy: false, // Disabled for API usage
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin requests (API use case)

    // DNS Prefetch Control - disable for privacy
    dnsPrefetchControl: { allow: false },

    // Frameguard - prevents clickjacking
    frameguard: { action: "deny" },

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // HSTS - enforce HTTPS (only in production)
    hsts: {
      maxAge: 31_536_000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },

    // IE No Open - prevents opening downloads in site context
    ieNoOpen: true,

    // MIME Sniffing Protection
    noSniff: true,

    // Origin Agent Cluster
    originAgentCluster: true,

    // Permitted Cross Domain Policies
    permittedCrossDomainPolicies: { permittedPolicies: "none" },

    // Referrer Policy - control referrer information
    referrerPolicy: { policy: "no-referrer" },

    // XSS Filter - disabled in favor of CSP
    xssFilter: false,
  });

  app.log.info("Security headers enabled via @fastify/helmet");
}
