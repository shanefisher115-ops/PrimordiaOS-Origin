#!/usr/bin/env bash
set -euo pipefail

mkdir -p artifacts
docker compose run --rm build
