import { Environment } from "../environments/environment.model";

export const environment: Environment = {
  production: false,
  megadexApi: "http://localhost:8300/api/megadex/",
  gatelinApi: "http://localhost:8300/api/gatelin/",
  apiUsers: "http://localhost:8300/api/megadex/",
  assets: "assets",
  msNotifEnabled: false,
};
