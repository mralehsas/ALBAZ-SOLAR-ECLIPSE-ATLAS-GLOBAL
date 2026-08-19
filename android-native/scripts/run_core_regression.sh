#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/build/core-regression-clean"
rm -rf "$OUT"
mkdir -p "$OUT"
mapfile -t MAIN_SOURCES < <(find "$ROOT/science-core/src/main/kotlin" -name '*.kt' -type f | sort)
mapfile -t TEST_SOURCES < <(find "$ROOT/science-core/src/test/kotlin" -name '*.kt' -type f | sort)
if [ "${#MAIN_SOURCES[@]}" -eq 0 ] || [ "${#TEST_SOURCES[@]}" -eq 0 ]; then
  echo "ERROR: Kotlin regression sources are missing" >&2
  exit 2
fi
kotlinc "${MAIN_SOURCES[@]}" "${TEST_SOURCES[@]}" \
  -include-runtime \
  -d "$OUT/core-regression.jar"
java -jar "$OUT/core-regression.jar" "$ROOT/science-core/src/test/resources/besselian_fixture.js"
