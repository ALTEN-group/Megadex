/**
 * Runtime admin config injected into index.html by the Docker entrypoint (dev)
 * or by src/admin-server.js (prod). Lets ops set ADMIN_SSO_TOKEN_KEY without
 * rebuilding Angular.
 */
export interface MegadexAdminRuntime {
  ssoTokenKey?: string;
}

declare global {
  interface Window {
    __MEGADEX_ADMIN__?: MegadexAdminRuntime;
  }
}

export function readAdminRuntimeConfig(): MegadexAdminRuntime {
  if (typeof window === "undefined") return {};
  const raw = window.__MEGADEX_ADMIN__;
  return raw && typeof raw === "object" ? raw : {};
}
