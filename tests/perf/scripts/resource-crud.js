// Authenticated CRUD flow: search + schema on Megadex users resource.
// Covers Gatelin checkRequest (ACL) + proxy + Megadex antity-pgsql query path under sustained load.

import { check, sleep } from "k6";
import http from "k6/http";
import { authHeaders, BASE_URL, login } from "./common.js";

export const options = {
  vus: Number(__ENV.K6_VUS) || 10,
  duration: __ENV.K6_DURATION || "30s",
  thresholds: {
    http_req_duration: ["p(95)<300"],
    http_req_failed: ["rate<0.01"],
  },
};

// One login per run, reused across iterations.
export function setup() {
  return { accessToken: login() };
}

export default function (data) {
  const params = authHeaders(data.accessToken);

  const searchRes = http.post(
    `${BASE_URL}/users/search`,
    JSON.stringify({ filters: [], limit: 25 }),
    { ...params, tags: { name: "users:search" } },
  );
  check(searchRes, { "users search: status 200": (r) => r.status === 200 });

  const schemaRes = http.get(`${BASE_URL}/users/schema`, {
    ...params,
    tags: { name: "users:schema" },
  });
  check(schemaRes, { "users schema: status 200": (r) => r.status === 200 });

  sleep(1);
}
