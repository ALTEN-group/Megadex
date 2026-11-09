#!/bin/sh
# Logs in as $RESTLER_PERSONA (an example key under POST /gatelin/sessions or
# components.schemas.user.examples in the mounted OpenAPI spec) and prints the
# header RESTler injects into every fuzzed request via --token_refresh_command.
set -e

SPEC_FILE="${RESTLER_SPEC_FILE:-/opt/restler/spec/megadex.openapi.json}"
TARGET_HOST="${RESTLER_TARGET_HOST:?RESTLER_TARGET_HOST not set}"
TARGET_PORT="${RESTLER_TARGET_PORT:-80}"
PERSONA="${RESTLER_PERSONA:-admin}"

TOKEN=$(python3 - "$SPEC_FILE" "$TARGET_HOST" "$TARGET_PORT" "$PERSONA" <<'PY'
import json, sys, urllib.request

spec_file, host, port, persona = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

with open(spec_file) as f:
    spec = json.load(f)

examples = {}
examples.update(
    spec.get("paths", {})
    .get("/gatelin/sessions", {})
    .get("post", {})
    .get("requestBody", {})
    .get("content", {})
    .get("application/json", {})
    .get("examples", {})
)
examples.update(
    spec.get("components", {}).get("schemas", {}).get("user", {}).get("examples", {})
)

if persona not in examples:
    if "admin" in examples:
        persona = "admin"
    else:
        sys.stderr.write(f"persona '{persona}' not found in {spec_file}\n")
        sys.exit(1)

value = examples[persona]["value"]
body = json.dumps({"email": value["email"], "pwd": value["pwd"]}).encode()

req = urllib.request.Request(
    f"http://{host}:{port}/api/gatelin/sessions",
    data=body,
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(req) as resp:
        data = json.load(resp)
except Exception as e:
    sys.stderr.write(f"login request failed: {e}\n")
    sys.exit(1)

token = data.get("accessToken", "")
if not token:
    sys.stderr.write(f"login succeeded but no accessToken in response: {data}\n")
    sys.exit(1)
print(token)
PY
)

if [ -z "$TOKEN" ]; then
  echo "refresh-token.sh: login failed for persona ${PERSONA}" >&2
  exit 1
fi

# RESTler's token_refresh_cmd contract: a metadata line (any dict literal,
# unused here) followed by one "<header-name>: <value>" line per app.
echo "{}"
echo "Authorization: Bearer ${TOKEN}"
