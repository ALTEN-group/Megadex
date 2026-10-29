export interface Environment {
  production: boolean;
  /** Megadex CRUD API base (`/api/megadex/`, with a trailing slash). */
  megadexApi: string;
  /** Gatelin auth / preferences base (`/api/gatelin/`). */
  gatelinApi: string;
  apiUsers: string;
  /**
   * Foxnox Handlebars workflow pages (`…/foxnox/web`).
   * Defaults to `/api/foxnox/web` when omitted.
   */
  webBase?: string;
  assets: string;
  msNotifEnabled: boolean;
}
