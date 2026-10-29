#!/bin/bash

# Load KEY=VALUE pairs from a docker compose env file and export them.
# Values are read literally (like docker compose does) instead of being
# `source`d, so secrets containing shell metacharacters (<, >, $, &, ;, ...)
# don't get interpreted by bash.
# Usage: source scripts/lib/load-env.sh && load_env_file docker/conf/.env.dev
load_env_file() {
  local file="$1" line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
    [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=(.*)$ ]] || continue
    key="${BASH_REMATCH[2]}"
    value="${BASH_REMATCH[3]}"
    # UID is readonly in bash
    [[ "$key" == "UID" ]] && continue

    value="${value#"${value%%[![:space:]]*}"}"
    if [[ "$value" =~ ^\"(.*)\"[[:space:]]*$ ]] || [[ "$value" =~ ^\'(.*)\'[[:space:]]*$ ]]; then
      value="${BASH_REMATCH[1]}"
    else
      value="${value%%[[:space:]]#*}"
      value="${value%"${value##*[![:space:]]}"}"
    fi
    export "$key=$value"
  done < "$file"
}
