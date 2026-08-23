from pathlib import Path

ROOT = Path(__file__).resolve().parent
required = [
    "settings.gradle.kts",
    "build.gradle.kts",
    "gradle/libs.versions.toml",
    "app/build.gradle.kts",
    "core-domain/build.gradle.kts",
    "core-time/build.gradle.kts",
    "core-eclipse/build.gradle.kts",
    "core-local/build.gradle.kts",
    "core-ephemeris/build.gradle.kts",
    "feature-home/build.gradle.kts",
    "feature-results/build.gradle.kts",
]
missing = [p for p in required if not (ROOT / p).exists()]
assert not missing, f"missing files: {missing}"
print("native project structure: PASS")
