#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def check(ok, name):
    checks.append((bool(ok), name))

def require_file(rel):
    p = ROOT / rel
    check(p.is_file(), f"file {rel}")
    return p

def require_text(rel, needles):
    p = require_file(rel)
    text = p.read_text(encoding="utf-8") if p.is_file() else ""
    for needle in needles:
        check(needle in text, f"{rel} contains {needle!r}")
    return text

root_build = require_text("build.gradle.kts", [
    'com.android.application") version "9.3.0"',
    'org.jetbrains.kotlin.plugin.compose") version "2.3.21"',
])
require_text("settings.gradle.kts", ['include(":app", ":science-core")'])
require_text("science-core/build.gradle.kts", ['org.jetbrains.kotlin.jvm', 'jvmToolchain(17)', 'runCoreRegression', 'CoreRegressionMainKt'])
app_build = require_text("app/build.gradle.kts", [
    'compileSdk = 37', 'minSdk = 26', 'targetSdk = 37',
    'compose = true', 'androidx.compose:compose-bom:2026.08.00',
    '../besselian_data.js', 'generated/besselianAssets',
    'androidComponents', 'addGeneratedSourceDirectory'
])
require_text("gradle/wrapper/gradle-wrapper.properties", ['gradle-9.5.0-bin.zip'])
require_file("app/src/main/AndroidManifest.xml")
require_file("app/src/main/java/com/albaz/eclipse/MainActivity.kt")
require_file("app/src/main/java/com/albaz/eclipse/ui/EclipseApp.kt")
require_file("app/src/main/java/com/albaz/eclipse/ui/EclipseViewModel.kt")
require_file("app/src/main/java/com/albaz/eclipse/ui/HomeScreen.kt")
require_file("app/src/main/java/com/albaz/eclipse/ui/ResultsScreen.kt")
require_file("app/src/main/java/com/albaz/eclipse/ui/UiText.kt")
require_file("app/src/main/java/com/albaz/eclipse/ui/theme/AlbazEclipseTheme.kt")
require_file("science-core/src/main/kotlin/com/albaz/eclipse/core/BesselianLocalEngine.kt")
require_file("science-core/src/main/kotlin/com/albaz/eclipse/core/catalog/JsWrappedBesselianCatalog.kt")
require_file("science-core/src/main/kotlin/com/albaz/eclipse/core/integrity/De440Integrity.kt")
require_file("science-core/src/test/kotlin/com/albaz/eclipse/core/CoreRegressionMain.kt")
require_file("scripts/run_core_regression.sh")
require_file("README_NATIVE_DEV1.md")

all_kotlin = "\n".join(
    p.read_text(encoding="utf-8", errors="ignore")
    for p in ROOT.rglob("*.kt")
)
all_gradle = "\n".join(
    p.read_text(encoding="utf-8", errors="ignore")
    for p in ROOT.rglob("*.gradle.kts")
)

check('org.jetbrains.kotlin.android' not in root_build and 'org.jetbrains.kotlin.android' not in app_build, "AGP 9.3 uses built-in Kotlin in the Android app")
check("WebView" not in all_kotlin, "native Kotlin source contains no WebView")
check("Capacitor" not in all_kotlin, "native Kotlin source contains no Capacitor")
check("DE440 READY" not in all_kotlin, "native Kotlin source contains no false DE440 READY claim")
check(not re.search(r'version\s+["\'][^"\']*\+[^"\']*["\']', all_gradle), "Gradle plugin versions contain no dynamic +")
check(not re.search(r'(implementation|api|debugImplementation|androidTestImplementation)\(["\'][^"\']*:\+?["\']\)', all_gradle), "dependencies contain no dynamic +")
check('0.2.0-dev1' in app_build, "DEV1 version is explicit")
check('DE440 not installed in DEV1' in all_kotlin, "UI discloses DE440 inactive state")
check('LocalEclipseType.PARTIAL' in all_kotlin, "partial local type is represented")

failed = [name for ok, name in checks if not ok]
for ok, name in checks:
    print(("PASS" if ok else "FAIL") + " | " + name)
print(f"SUMMARY | {len(checks)-len(failed)}/{len(checks)} PASS")
if failed:
    sys.exit(1)
