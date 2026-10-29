import { Environment } from "../environments/environment.model";

export const environment: Environment = {
  production: false,
  megadexApi: "http://localhost:8100/api/megadex/",
  gatelinApi: "http://localhost:8100/api/gatelin/",
  apiUsers: "http://localhost:8100/api/users/",
  assets: "assets",
  msNotifEnabled: false,
};
