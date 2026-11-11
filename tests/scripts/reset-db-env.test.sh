#!/bin/bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
TEST_DIR=$(mktemp -d)
cleanup() {
  rm -f "$TEST_DIR/docker/conf/.env.dev" "$TEST_DIR/bin/docker" \
    "$TEST_DIR/scripts/start-dev.sh" "$TEST_DIR/calls"
  rmdir "$TEST_DIR/docker/conf" "$TEST_DIR/docker" "$TEST_DIR/bin" \
    "$TEST_DIR/scripts" "$TEST_DIR"
}
trap cleanup EXIT
mkdir -p "$TEST_DIR/docker/conf" "$TEST_DIR/bin" "$TEST_DIR/scripts"

cat > "$TEST_DIR/docker/conf/.env.dev" <<'ENV'
APP_NAME=fixture
ENV_NAME=local
UID=1000
MEGADEX_HOST=${APP_NAME}-megadex-${ENV_NAME}
GATELIN_HOST=${APP_NAME}-gatelin-${ENV_NAME}
FOXNOX_HOST=${APP_NAME}-foxnox-${ENV_NAME}
POSTGRES_HOST=${APP_NAME}-postgres-${ENV_NAME}
MEGADEX_MIGRATION_SERVICE_NAME=megadex-migration
GATELIN_MIGRATION_SERVICE_NAME=gatelin-migration
FOXNOX_MIGRATION_SERVICE_NAME=foxnox-migration
MEGADEX_MIGRATION_HOST=${APP_NAME}-${MEGADEX_MIGRATION_SERVICE_NAME}-${ENV_NAME}
GATELIN_MIGRATION_HOST=${APP_NAME}-${GATELIN_MIGRATION_SERVICE_NAME}-${ENV_NAME}
FOXNOX_MIGRATION_HOST=${APP_NAME}-${FOXNOX_MIGRATION_SERVICE_NAME}-${ENV_NAME}
POSTGRES_ROOT_USER=root
POSTGRES_ROOT_PWD='fixture password'
FOXNOX_DB_NAME=foxnox
MEGADEX_DB_NAME=megadex
DEFAULT_PORT=3000
SWAGGER_HOST=${APP_NAME}-swagger-${ENV_NAME}
UNRELATED_EMAIL=Example <noreply@example.invalid>
UNRELATED_COMMAND=$(exit 91)
ENV

cat > "$TEST_DIR/bin/docker" <<'MOCK'
#!/bin/bash
set -euo pipefail
printf '%s\n' "$*" >> "$TEST_CALLS"
case "$1" in
  stop|rm|volume) ;;
  inspect) printf 'healthy\n' ;;
  exec)
    [[ "$*" == *"SELECT COUNT(*) FROM pwd"* ]] || exit 92
    printf '7\n'
    ;;
  *) exit 93 ;;
esac
MOCK

cat > "$TEST_DIR/scripts/start-dev.sh" <<'MOCK'
#!/bin/bash
set -euo pipefail
exec bash "$TEST_ROOT/scripts/setup-mocks.sh" --if-missing
MOCK
chmod +x "$TEST_DIR/bin/docker" "$TEST_DIR/scripts/start-dev.sh"
export TEST_ROOT="$ROOT" TEST_CALLS="$TEST_DIR/calls"
export PATH="$TEST_DIR/bin:$PATH"

(
  cd "$TEST_DIR"
  bash "$ROOT/scripts/reset-db.sh"
)

for expected in \
  'stop fixture-megadex-local' \
  'stop fixture-gatelin-local' \
  'stop fixture-foxnox-local' \
  'rm -f fixture-megadex-migration-local' \
  'rm -f fixture-gatelin-migration-local' \
  'rm -f fixture-foxnox-migration-local' \
  'rm -f fixture-postgres-local' \
  'volume rm fixture_postgres_data'; do
  grep -Fxq -- "$expected" "$TEST_CALLS"
done
grep -Fq 'inspect -f {{.State.Health.Status}} fixture-foxnox-local' "$TEST_CALLS"
grep -Fq 'SELECT COUNT(*) FROM pwd' "$TEST_CALLS"
printf 'PASS: reset and seeding ignore unrelated dotenv syntax; Docker was mocked.\n'
