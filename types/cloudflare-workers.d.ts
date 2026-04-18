/**
 * Virtual module provided by the Cloudflare Workers runtime (not npm).
 * @see https://developers.cloudflare.com/changelog/2025-03-17-importable-env/
 */
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
