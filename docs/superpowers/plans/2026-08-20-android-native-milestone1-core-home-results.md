# Android Native Milestone 1 — Scientific Core, Home, Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first installable native Android milestone that loads the existing 2613-event Besselian catalog, computes validated local eclipse circumstances natively in Kotlin, and presents a responsive bilingual Home → Results flow without WebView.

**Architecture:** Create a new `android-native/` Gradle project inside the existing repository. Scientific code lives in pure Kotlin/JVM modules and is tested independently from Compose. The first milestone uses the audited Besselian/WGS84 local-contact model; DE440 is represented by an explicit verification-status contract only until its real SPK reader and kernel are ported in a later milestone, so this milestone cannot falsely claim DE440 verification.

**Tech Stack:** Android Gradle Plugin 9.3.0, Gradle 9.5.0, Kotlin 2.3.21, JDK 17, compileSdk 37, targetSdk 36, minSdk 26, Jetpack Compose BOM 2026.08.00, Material 3, Coroutines/StateFlow, JUnit 5 for pure JVM scientific tests, AndroidX Compose UI tests.

**Spec:**
- `docs/superpowers/specs/2026-08-20-android-native-scientific-edition-design.md`
- `docs/superpowers/specs/2026-08-20-android-native-scientific-baseline-addendum.md`

## Global Constraints

- Local C1/C2/MAX/C3/C4 are produced by the audited Besselian + WGS84/topocentric model, not by raw DE440 vectors.
- The UI must never display `DE440 verified` unless the `EphemerisVerificationStatus` is explicitly `Verified`.
- The working catalog range is 1550–2650 and contains 2613 events.
- DE440 coverage status must reserve explicit `OutOfCoverage` handling for 2650-02-22 and 2650-08-19.
- No WebView/Capacitor is allowed in the native milestone.
- No network is required for catalog lookup or local calculation.
- Arabic and English must both work in the same binary.
- System status/navigation bars must not overlap content.
- Scientific numerical code must be pure Kotlin/JVM and unit-testable without Android runtime.
- First milestone version identity: `0.1.0-native-alpha`, versionCode `1`.

---

## File Structure Locked for Milestone 1

```text
android-native/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
├── gradle/libs.versions.toml
├── gradle/wrapper/gradle-wrapper.properties
├── app/
│   └── src/main/java/com/albaz/eclipseatlas/app/
│       ├── MainActivity.kt
│       ├── EclipseApp.kt
│       ├── AppLanguage.kt
│       └── AppStrings.kt
├── core-domain/
│   └── src/main/kotlin/com/albaz/eclipseatlas/domain/
│       ├── ObserverLocation.kt
│       ├── EclipseEvent.kt
│       ├── LocalEclipseResult.kt
│       ├── ScientificDiagnostics.kt
│       └── EclipseCalculator.kt
├── core-time/
│   └── src/main/kotlin/com/albaz/eclipseatlas/time/
│       ├── CivilCalendar.kt
│       └── EclipseTimeFormatter.kt
├── core-eclipse/
│   └── src/main/kotlin/com/albaz/eclipseatlas/eclipse/
│       ├── BesselianElements.kt
│       ├── BesselianCatalog.kt
│       ├── BesselianCsvParser.kt
│       └── EclipseType.kt
├── core-local/
│   └── src/main/kotlin/com/albaz/eclipseatlas/local/
│       ├── BesselianLocalEngine.kt
│       ├── LocalGeometry.kt
│       └── DefaultEclipseCalculator.kt
├── core-ephemeris/
│   └── src/main/kotlin/com/albaz/eclipseatlas/ephemeris/
│       └── EphemerisVerificationStatus.kt
├── feature-home/
│   └── src/main/kotlin/com/albaz/eclipseatlas/home/
│       ├── HomeUiState.kt
│       └── HomeScreen.kt
├── feature-results/
│   └── src/main/kotlin/com/albaz/eclipseatlas/results/
│       ├── ResultsScreen.kt
│       └── ResultFormatting.kt
├── tools/
│   └── extract_besselian_csv.py
└── core-eclipse/src/main/resources/
    └── besselian.csv
```

The large generated `besselian.csv` is derived byte-for-byte from the repository root `besselian_data.js`; the root web file remains unchanged.

---

### Task 1: Scaffold the Native Android Multi-Module Project

**Files:**
- Create: `android-native/settings.gradle.kts`
- Create: `android-native/build.gradle.kts`
- Create: `android-native/gradle.properties`
- Create: `android-native/gradle/libs.versions.toml`
- Create: `android-native/gradle/wrapper/gradle-wrapper.properties`
- Create: module `build.gradle.kts` files for `app`, `core-domain`, `core-time`, `core-eclipse`, `core-local`, `core-ephemeris`, `feature-home`, `feature-results`
- Create: `android-native/app/src/main/AndroidManifest.xml`
- Test: Gradle project configuration

**Interfaces:**
- Consumes: none.
- Produces: buildable module graph; application namespace `com.albaz.eclipseatlas`; compileSdk 37 / targetSdk 36 / minSdk 26.

- [ ] **Step 1: Add the failing configuration check**

Create `android-native/verify_project.py`:

```python
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
```

- [ ] **Step 2: Run the check and verify it fails**

Run:

```bash
python android-native/verify_project.py
```

Expected: assertion failure listing the missing Gradle/module files.

- [ ] **Step 3: Create pinned version catalog and root build**

`android-native/gradle/libs.versions.toml`:

```toml
[versions]
agp = "9.3.0"
kotlin = "2.3.21"
compose-bom = "2026.08.00"
activity-compose = "1.13.0"
lifecycle = "2.11.0"
coroutines = "1.10.2"
junit = "5.13.4"

[libraries]
compose-bom = { module = "androidx.compose:compose-bom", version.ref = "compose-bom" }
compose-ui = { module = "androidx.compose.ui:ui" }
compose-foundation = { module = "androidx.compose.foundation:foundation" }
compose-material3 = { module = "androidx.compose.material3:material3" }
compose-ui-tooling-preview = { module = "androidx.compose.ui:ui-tooling-preview" }
compose-ui-tooling = { module = "androidx.compose.ui:ui-tooling" }
activity-compose = { module = "androidx.activity:activity-compose", version.ref = "activity-compose" }
lifecycle-viewmodel = { module = "androidx.lifecycle:lifecycle-viewmodel-compose", version.ref = "lifecycle" }
coroutines-core = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-core", version.ref = "coroutines" }
junit-jupiter = { module = "org.junit.jupiter:junit-jupiter", version.ref = "junit" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
android-library = { id = "com.android.library", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
compose-compiler = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
```

`android-native/build.gradle.kts`:

```kotlin
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.compose.compiler) apply false
}
```

`android-native/settings.gradle.kts`:

```kotlin
pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "ALBAZEclipseAtlasNative"
include(
    ":app",
    ":core-domain",
    ":core-time",
    ":core-eclipse",
    ":core-local",
    ":core-ephemeris",
    ":feature-home",
    ":feature-results",
)
```

`android-native/gradle/wrapper/gradle-wrapper.properties`:

```properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-9.5.0-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```

Every Android module must use Java/Kotlin 17. `app` uses `compileSdk = 37`, `targetSdk = 36`, `minSdk = 26`, Compose enabled, applicationId `com.albaz.eclipseatlas` and version `0.1.0-native-alpha`.

- [ ] **Step 4: Wire module dependencies**

Use this dependency direction:

```text
app -> feature-home, feature-results, core-local, core-eclipse, core-domain
feature-home -> core-domain
feature-results -> core-domain
core-local -> core-domain, core-eclipse, core-time, core-ephemeris
core-eclipse -> core-domain
core-time -> core-domain
core-ephemeris -> core-domain
```

Do not add reverse dependencies from core modules to UI modules.

- [ ] **Step 5: Run the structure check**

Run:

```bash
python android-native/verify_project.py
```

Expected: `native project structure: PASS`.

- [ ] **Step 6: Run Gradle project discovery**

Run from `android-native/`:

```bash
./gradlew projects
```

Expected: all eight modules listed with no configuration error.

- [ ] **Step 7: Commit**

```bash
git add android-native
git commit -m "build: scaffold native Android eclipse project"
```

---

### Task 2: Define Immutable Scientific Domain Contracts and Time Policy

**Files:**
- Create: `android-native/core-domain/src/main/kotlin/com/albaz/eclipseatlas/domain/ObserverLocation.kt`
- Create: `android-native/core-domain/src/main/kotlin/com/albaz/eclipseatlas/domain/EclipseEvent.kt`
- Create: `android-native/core-domain/src/main/kotlin/com/albaz/eclipseatlas/domain/LocalEclipseResult.kt`
- Create: `android-native/core-domain/src/main/kotlin/com/albaz/eclipseatlas/domain/ScientificDiagnostics.kt`
- Create: `android-native/core-domain/src/main/kotlin/com/albaz/eclipseatlas/domain/EclipseCalculator.kt`
- Create: `android-native/core-time/src/main/kotlin/com/albaz/eclipseatlas/time/CivilCalendar.kt`
- Create: `android-native/core-time/src/test/kotlin/com/albaz/eclipseatlas/time/CivilCalendarTest.kt`

**Interfaces:**
- Consumes: Kotlin standard library.
- Produces: `ObserverLocation`, `EclipseEvent`, `LocalEclipseResult`, `ScientificDiagnostics`, `EclipseCalculator`, historical calendar conversion helpers.

- [ ] **Step 1: Write failing historical-calendar tests**

`CivilCalendarTest.kt`:

```kotlin
package com.albaz.eclipseatlas.time

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class CivilCalendarTest {
    @Test
    fun `1582 reform boundary uses Julian before October 15`() {
        assertEquals(2299160, CivilCalendar.jdn(1582, 10, 4))
        assertEquals(2299161, CivilCalendar.jdn(1582, 10, 15))
    }

    @Test
    fun `1550 NASA civil date round trips as Julian`() {
        val jdn = CivilCalendar.jdn(1550, 3, 18)
        assertEquals(CivilDate(1550, 3, 18), CivilCalendar.fromJdn(jdn))
    }
}
```

- [ ] **Step 2: Run the tests and verify failure**

```bash
./gradlew :core-time:test --tests '*CivilCalendarTest*'
```

Expected: compile failure because `CivilCalendar`/`CivilDate` do not exist.

- [ ] **Step 3: Add domain models**

Use these exact public contracts:

```kotlin
package com.albaz.eclipseatlas.domain

import java.time.Instant

data class ObserverLocation(
    val latitudeDeg: Double,
    val longitudeEastDeg: Double,
    val elevationMeters: Double = 0.0,
) {
    init {
        require(latitudeDeg in -90.0..90.0)
        require(longitudeEastDeg in -180.0..180.0)
        require(elevationMeters.isFinite())
    }
}

enum class GlobalEclipseType { PARTIAL, ANNULAR, TOTAL, HYBRID }
enum class LocalEclipseType { NOT_VISIBLE, PARTIAL, ANNULAR, TOTAL }

data class EclipseEvent(
    val year: Int,
    val month: Int,
    val day: Int,
    val globalType: GlobalEclipseType,
    val catalogMagnitude: Double,
    val saros: Int,
)

data class ContactTimes(
    val c1: Instant?,
    val c2: Instant?,
    val maximum: Instant?,
    val c3: Instant?,
    val c4: Instant?,
)

data class LocalEclipseResult(
    val event: EclipseEvent,
    val observer: ObserverLocation,
    val localType: LocalEclipseType,
    val contacts: ContactTimes,
    val magnitude: Double,
    val obscuration: Double,
    val maximumSunAltitudeDeg: Double?,
    val maximumSunAzimuthDeg: Double?,
    val centralDurationSeconds: Double?,
    val diagnostics: ScientificDiagnostics,
)

sealed interface EphemerisVerificationStatus {
    data object Unavailable : EphemerisVerificationStatus
    data object OutOfCoverage : EphemerisVerificationStatus
    data class IntegrityFailed(val reason: String) : EphemerisVerificationStatus
    data class Verified(val kernelSha256: String) : EphemerisVerificationStatus
}

data class ScientificDiagnostics(
    val localModel: String = "BESSELIAN_WGS84",
    val ephemerisVerification: EphemerisVerificationStatus,
    val timeModel: String,
    val iersOperational: Boolean,
)

fun interface EclipseCalculator {
    suspend fun calculate(event: EclipseEvent, observer: ObserverLocation): LocalEclipseResult
}
```

- [ ] **Step 4: Implement the Julian/Gregorian conversion exactly once**

Port the proven integer JDN algorithm from `eclipse_engine.js` into `CivilCalendar.kt`. The Gregorian branch begins at 1582-10-15; dates before that use the Julian branch.

- [ ] **Step 5: Run core tests**

```bash
./gradlew :core-domain:test :core-time:test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add android-native/core-domain android-native/core-time
git commit -m "feat: define native eclipse scientific contracts"
```

---

### Task 3: Extract and Parse the Existing 2613-Event Besselian Catalog

**Files:**
- Create: `android-native/tools/extract_besselian_csv.py`
- Generate: `android-native/core-eclipse/src/main/resources/besselian.csv`
- Create: `android-native/core-eclipse/src/main/kotlin/com/albaz/eclipseatlas/eclipse/BesselianElements.kt`
- Create: `android-native/core-eclipse/src/main/kotlin/com/albaz/eclipseatlas/eclipse/BesselianCsvParser.kt`
- Create: `android-native/core-eclipse/src/main/kotlin/com/albaz/eclipseatlas/eclipse/BesselianCatalog.kt`
- Test: `android-native/core-eclipse/src/test/kotlin/com/albaz/eclipseatlas/eclipse/BesselianCatalogTest.kt`

**Interfaces:**
- Consumes: repository root `besselian_data.js` containing `window.ALBAZ_BESSELIAN_CSV`.
- Produces: `BesselianCatalog.loadDefault(): BesselianCatalog`, `findExact(year, month, day): BesselianElements?`, `eventsInYear(year): List<BesselianElements>`.

- [ ] **Step 1: Write failing catalog tests**

```kotlin
package com.albaz.eclipseatlas.eclipse

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class BesselianCatalogTest {
    @Test
    fun `catalog has audited event count and bounds`() {
        val catalog = BesselianCatalog.loadDefault()
        assertEquals(2613, catalog.size)
        assertNotNull(catalog.findExact(1550, 3, 18))
        assertNotNull(catalog.findExact(2650, 8, 19))
    }

    @Test
    fun `2023 April eclipse is hybrid globally`() {
        val e = requireNotNull(BesselianCatalog.loadDefault().findExact(2023, 4, 20))
        assertEquals(EclipseType.HYBRID, e.type)
    }

    @Test
    fun `2025 contains two partial solar eclipses`() {
        val events = BesselianCatalog.loadDefault().eventsInYear(2025)
        assertEquals(2, events.size)
        assertTrue(events.all { it.type == EclipseType.PARTIAL })
    }
}
```

- [ ] **Step 2: Run and verify failure**

```bash
./gradlew :core-eclipse:test --tests '*BesselianCatalogTest*'
```

Expected: compile/resource failure because catalog classes/data do not exist.

- [ ] **Step 3: Add deterministic extractor**

`extract_besselian_csv.py`:

```python
import json
import re
from pathlib import Path

repo = Path(__file__).resolve().parents[2]
src = (repo / "besselian_data.js").read_text(encoding="utf-8")
match = re.search(
    r'window\.ALBAZ_BESSELIAN_CSV\s*=\s*("(?:\\.|[^"\\])*")\s*;',
    src,
    re.S,
)
if not match:
    raise SystemExit("ALBAZ_BESSELIAN_CSV assignment not found")
csv_text = json.loads(match.group(1))
out = repo / "android-native/core-eclipse/src/main/resources/besselian.csv"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(csv_text, encoding="utf-8", newline="\n")
rows = [line for line in csv_text.splitlines() if line.strip()]
if len(rows) - 1 != 2613:
    raise SystemExit(f"unexpected event count: {len(rows)-1}")
print(f"wrote {len(rows)-1} events to {out}")
```

Run:

```bash
python android-native/tools/extract_besselian_csv.py
```

Expected: `wrote 2613 events ...`.

- [ ] **Step 4: Implement parser with explicit required columns**

`BesselianElements` must contain at minimum:

```kotlin
data class BesselianElements(
    val year: Int, val month: Int, val day: Int,
    val deltaTSeconds: Double,
    val saros: Int,
    val type: EclipseType,
    val catalogMagnitude: Double,
    val t0Hours: Double,
    val x: DoubleArray,
    val y: DoubleArray,
    val d: DoubleArray,
    val mu: DoubleArray,
    val l1: DoubleArray,
    val l2: DoubleArray,
    val tanF1: Double,
    val tanF2: Double,
    val tMinHours: Double,
    val tMaxHours: Double,
)
```

Map `eclipse_type` by first character: `P`, `A`, `T`, `H`. `As`/`A*` still map to annular; `H*` maps to hybrid.

- [ ] **Step 5: Run parser/catalog tests**

```bash
./gradlew :core-eclipse:test
```

Expected: catalog count 2613 and event classification tests pass.

- [ ] **Step 6: Commit**

```bash
git add android-native/tools android-native/core-eclipse
git commit -m "feat: import audited Besselian eclipse catalog"
```

---

### Task 4: Port the Audited Besselian Local-Circumstances Engine to Pure Kotlin

**Files:**
- Create: `android-native/core-local/src/main/kotlin/com/albaz/eclipseatlas/local/LocalGeometry.kt`
- Create: `android-native/core-local/src/main/kotlin/com/albaz/eclipseatlas/local/BesselianLocalEngine.kt`
- Create: `android-native/core-local/src/test/kotlin/com/albaz/eclipseatlas/local/BesselianLocalEngineRegressionTest.kt`

**Interfaces:**
- Consumes: `BesselianElements`, `ObserverLocation`.
- Produces: `BesselianLocalEngine.calculate(elements, observer): LocalEclipseResult`.

- [ ] **Step 1: Write regression tests before the engine**

Use R14.2 audited values with a 5-second contact tolerance.

```kotlin
class BesselianLocalEngineRegressionTest {
    private val catalog = BesselianCatalog.loadDefault()
    private val engine = BesselianLocalEngine()

    @Test
    fun `Austin 2024 total contacts match audited baseline`() {
        val event = requireNotNull(catalog.findExact(2024, 4, 8))
        val result = engine.calculate(event, ObserverLocation(30.267, -97.743, 100.0))
        assertEquals(LocalEclipseType.TOTAL, result.localType)
        assertNearUtc("18:35:56.933", result.contacts.c2, 5.0)
        assertNearUtc("18:36:54.700", result.contacts.maximum, 5.0)
        assertNearUtc("18:37:52.465", result.contacts.c3, 5.0)
        assertEquals(1.002764954, result.magnitude, 5e-6)
    }

    @Test
    fun `Albuquerque 2023 annular contacts match audited baseline`() {
        val event = requireNotNull(catalog.findExact(2023, 10, 14))
        val result = engine.calculate(event, ObserverLocation(35.084, -106.651, 100.0))
        assertEquals(LocalEclipseType.ANNULAR, result.localType)
        assertNearUtc("16:34:29.515", result.contacts.c2, 5.0)
        assertNearUtc("16:36:52.970", result.contacts.maximum, 5.0)
        assertNearUtc("16:39:16.349", result.contacts.c3, 5.0)
        assertEquals(0.970202323, result.magnitude, 5e-6)
    }

    @Test
    fun `Mosul 1999 remains edge-sensitive total`() {
        val event = requireNotNull(catalog.findExact(1999, 8, 11))
        val result = engine.calculate(event, ObserverLocation(36.333333, 43.133333, 223.0))
        assertEquals(LocalEclipseType.TOTAL, result.localType)
        assertNearUtc("11:46:35.375", result.contacts.c2, 5.0)
        assertNearUtc("11:46:54.148", result.contacts.maximum, 5.0)
        assertNearUtc("11:47:12.684", result.contacts.c3, 5.0)
        assertEquals(1.000600778, result.magnitude, 8e-6)
    }
}
```

`assertNearUtc` converts expected `HH:mm:ss.SSS` on the event civil day to epoch seconds using the same Julian/Gregorian policy used by the engine and asserts absolute difference ≤ tolerance.

- [ ] **Step 2: Run regression tests and verify failure**

```bash
./gradlew :core-local:test --tests '*BesselianLocalEngineRegressionTest*'
```

Expected: compile failure because `BesselianLocalEngine` is missing.

- [ ] **Step 3: Port observer and polynomial geometry exactly**

Use constants from the validated JS engine:

```kotlin
private const val DEG = Math.PI / 180.0
private const val RAD = 180.0 / Math.PI
private const val EARTH_A_M = 6_378_140.0
private const val GEO_FACTOR = 0.99664719
private const val HORIZON_RAD = -0.00524
```

Implement private functions corresponding one-to-one with `eclipse_engine.js`:

```text
prepareObserver
polynomial
circumstancesAt
findLocalMid
bisect
rootFromMid
geometryAtMid
jdnFromCivil / civilFromJdn via core-time
utcPartsForT
```

Do not change coefficient order or west/east longitude sign convention during the port. `ObserverLocation.longitudeEastDeg` is east-positive; the Besselian hour-angle calculation uses west longitude internally as `-longitudeEastDeg`.

- [ ] **Step 4: Implement contact solving and horizon handling**

At the local mid point:

```kotlin
val outerFn: (Circumstances) -> Double = { c -> c.m - c.l1p }
val innerFn: (Circumstances) -> Double = { c -> c.m - kotlin.math.abs(c.l2p) }
```

Search outward from mid using deterministic sub-second hour steps, then bisect. Only return C2/C3 for annular/total local geometry; return `null` rather than sentinel strings for contacts that do not physically exist.

- [ ] **Step 5: Build typed diagnostics**

Every result in this milestone must contain:

```kotlin
ScientificDiagnostics(
    localModel = "BESSELIAN_WGS84",
    ephemerisVerification = EphemerisVerificationStatus.Unavailable,
    timeModel = "BESSELIAN_DT_CATALOG",
    iersOperational = false,
)
```

No DE440 wording appears in the scientific result unless a future ephemeris module changes the status to `Verified`.

- [ ] **Step 6: Run the regression suite**

```bash
./gradlew :core-local:test
```

Expected: Austin, Albuquerque, and Mosul tests pass within the declared tolerance.

- [ ] **Step 7: Add non-visible/partial behavior tests**

Add tests asserting:

```kotlin
assertNull(result.contacts.c2)
assertNull(result.contacts.c3)
```

for a location that sees only a partial eclipse, and all contact fields `null` for a location where the event is not locally visible.

- [ ] **Step 8: Commit**

```bash
git add android-native/core-local
git commit -m "feat: port Besselian local eclipse engine to Kotlin"
```

---

### Task 5: Add the Scientific Calculator Facade and DE440 Provenance Guard

**Files:**
- Create: `android-native/core-ephemeris/src/main/kotlin/com/albaz/eclipseatlas/ephemeris/DefaultEphemerisStatusProvider.kt`
- Create: `android-native/core-local/src/main/kotlin/com/albaz/eclipseatlas/local/DefaultEclipseCalculator.kt`
- Test: `android-native/core-local/src/test/kotlin/com/albaz/eclipseatlas/local/DefaultEclipseCalculatorTest.kt`

**Interfaces:**
- Consumes: `BesselianCatalog`, `BesselianLocalEngine`, `EphemerisVerificationStatus`.
- Produces: `DefaultEclipseCalculator.calculate(event, observer)` and a safe provenance policy.

- [ ] **Step 1: Write failing provenance tests**

```kotlin
@Test
fun `milestone 1 never claims DE440 verification without a kernel`() = runTest {
    val result = calculator.calculate(event2024, ObserverLocation(30.267, -97.743, 100.0))
    assertEquals(EphemerisVerificationStatus.Unavailable, result.diagnostics.ephemerisVerification)
}

@Test
fun `late 2650 events are marked out of audited DE440 coverage`() {
    assertEquals(
        EphemerisVerificationStatus.OutOfCoverage,
        statusProvider.statusFor(EclipseEvent(2650, 8, 19, GlobalEclipseType.PARTIAL, 0.0, 0))
    )
}
```

- [ ] **Step 2: Run tests and verify failure**

```bash
./gradlew :core-local:test --tests '*DefaultEclipseCalculatorTest*'
```

- [ ] **Step 3: Implement explicit status provider**

```kotlin
class DefaultEphemerisStatusProvider {
    fun statusFor(event: EclipseEvent): EphemerisVerificationStatus =
        if ((event.year == 2650 && event.month == 2 && event.day == 22) ||
            (event.year == 2650 && event.month == 8 && event.day == 19)) {
            EphemerisVerificationStatus.OutOfCoverage
        } else {
            EphemerisVerificationStatus.Unavailable
        }
}
```

This provider is intentionally conservative until the native SPK milestone supplies real kernel verification.

- [ ] **Step 4: Implement calculator facade**

`DefaultEclipseCalculator` delegates numerical work to `BesselianLocalEngine`, then replaces the diagnostics ephemeris status using `DefaultEphemerisStatusProvider`.

- [ ] **Step 5: Run tests**

```bash
./gradlew :core-local:test :core-ephemeris:test
```

Expected: all provenance tests pass.

- [ ] **Step 6: Commit**

```bash
git add android-native/core-local android-native/core-ephemeris
git commit -m "feat: add scientific calculator provenance guard"
```

---

### Task 6: Build the Native Home and Results Compose UI

**Files:**
- Create: `android-native/app/src/main/java/com/albaz/eclipseatlas/app/AppLanguage.kt`
- Create: `android-native/app/src/main/java/com/albaz/eclipseatlas/app/AppStrings.kt`
- Create: `android-native/feature-home/src/main/kotlin/com/albaz/eclipseatlas/home/HomeUiState.kt`
- Create: `android-native/feature-home/src/main/kotlin/com/albaz/eclipseatlas/home/HomeScreen.kt`
- Create: `android-native/feature-results/src/main/kotlin/com/albaz/eclipseatlas/results/ResultFormatting.kt`
- Create: `android-native/feature-results/src/main/kotlin/com/albaz/eclipseatlas/results/ResultsScreen.kt`
- Test: `android-native/feature-home/src/test/.../HomeInputValidationTest.kt`
- Test: `android-native/app/src/androidTest/.../HomeResultsFlowTest.kt`

**Interfaces:**
- Consumes: domain result models.
- Produces: stateless Compose Home/Results screens and bilingual text model.

- [ ] **Step 1: Write failing input-validation tests**

```kotlin
@Test
fun `latitude outside physical range is rejected`() {
    val state = HomeUiState(latitude = "91", longitude = "44.4")
    assertFalse(state.isInputValid)
}

@Test
fun `Baghdad style coordinate input is valid`() {
    val state = HomeUiState(latitude = "33.3152", longitude = "44.3661", elevation = "34")
    assertTrue(state.isInputValid)
}
```

- [ ] **Step 2: Implement `HomeUiState` parsing without throwing**

```kotlin
data class HomeUiState(
    val year: String = "2026",
    val month: String = "8",
    val day: String = "12",
    val latitude: String = "33.3152",
    val longitude: String = "44.3661",
    val elevation: String = "34",
    val calculating: Boolean = false,
    val error: String? = null,
) {
    val isInputValid: Boolean
        get() = latitude.toDoubleOrNull()?.let { it in -90.0..90.0 } == true &&
            longitude.toDoubleOrNull()?.let { it in -180.0..180.0 } == true &&
            elevation.toDoubleOrNull()?.isFinite() == true &&
            year.toIntOrNull()?.let { it in 1550..2650 } == true
}
```

- [ ] **Step 3: Implement bilingual copy**

Use an app-local language enum for this milestone:

```kotlin
enum class AppLanguage { ARABIC, ENGLISH }
```

`AppStrings` must expose the same keys in both languages: app title, date, location, latitude, longitude, elevation, calculate, results, type, magnitude, obscuration, C1/C2/MAX/C3/C4, diagnostics, Arabic, English, no-local-eclipse, DE440 unavailable, DE440 out-of-coverage.

- [ ] **Step 4: Implement Home layout with safe insets**

The Home screen must fit the core calculation controls in the first viewport on a normal phone. Use:

```kotlin
Scaffold(
    modifier = Modifier.fillMaxSize(),
    contentWindowInsets = WindowInsets.safeDrawing,
) { padding ->
    Column(
        modifier = Modifier
            .padding(padding)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) { /* compact header, language switch, date/location fields, primary action */ }
}
```

Do not reproduce the old oversized hero section above the calculator.

- [ ] **Step 5: Implement Results screen**

Order the visual hierarchy:

1. local eclipse type,
2. magnitude / obscuration / maximum,
3. C1 C2 MAX C3 C4 contact cards,
4. Sun altitude/azimuth and central duration,
5. observer coordinates,
6. scientific diagnostics.

If a contact is `null`, display `—`; never display `null`, `undefined`, or `NaN`.

- [ ] **Step 6: Add Compose UI test for safe navigation**

Test tags:

```text
home.calculate
home.language.ar
home.language.en
results.summary
results.contacts
results.diagnostics
```

The test enters 2024-04-08 / Austin coordinates, taps calculate, and asserts `results.summary` and `results.contacts` are displayed.

- [ ] **Step 7: Run unit and instrumentation compilation tests**

```bash
./gradlew :feature-home:test :feature-results:test :app:compileDebugAndroidTestKotlin
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add android-native/app android-native/feature-home android-native/feature-results
git commit -m "feat: add bilingual native Home and Results UI"
```

---

### Task 7: Integrate Home → Calculate → Results in the Activity and Build the First APK

**Files:**
- Create: `android-native/app/src/main/java/com/albaz/eclipseatlas/app/MainActivity.kt`
- Create: `android-native/app/src/main/java/com/albaz/eclipseatlas/app/EclipseApp.kt`
- Create: `android-native/app/src/main/java/com/albaz/eclipseatlas/app/EclipseSessionViewModel.kt`
- Test: `android-native/app/src/test/.../EclipseSessionViewModelTest.kt`
- Test: `android-native/app/src/androidTest/.../HomeResultsFlowTest.kt`

**Interfaces:**
- Consumes: `BesselianCatalog.loadDefault()`, `DefaultEclipseCalculator`, Home/Results composables.
- Produces: installable native APK with a complete first scientific calculation flow.

- [ ] **Step 1: Write failing ViewModel calculation test**

```kotlin
@Test
fun `calculate loads exact event and publishes result`() = runTest {
    val vm = EclipseSessionViewModel(
        catalog = BesselianCatalog.loadDefault(),
        calculator = DefaultEclipseCalculator(...),
    )
    vm.setDate(2024, 4, 8)
    vm.setObserver(30.267, -97.743, 100.0)
    vm.calculate()
    advanceUntilIdle()
    val result = requireNotNull(vm.state.value.result)
    assertEquals(LocalEclipseType.TOTAL, result.localType)
}
```

- [ ] **Step 2: Implement a single activity-scoped session ViewModel**

`EclipseSessionViewModel` owns:

```kotlin
data class EclipseSessionState(
    val language: AppLanguage = AppLanguage.ARABIC,
    val home: HomeUiState = HomeUiState(),
    val result: LocalEclipseResult? = null,
    val screen: Screen = Screen.HOME,
)

enum class Screen { HOME, RESULTS }
```

`calculate()` must run on a background dispatcher and be cancellable. It finds the exact catalog event for the selected date; if none exists, set a localized error state rather than calculating a fabricated event.

- [ ] **Step 3: Implement edge-to-edge Activity safely**

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        setContent { EclipseApp() }
    }
}
```

The Compose root owns system-bar-safe insets; do not manually add fixed top padding.

- [ ] **Step 4: Add navigation behavior**

After successful calculation, switch to `Screen.RESULTS`. Back from Results returns to Home while retaining the current inputs and result.

- [ ] **Step 5: Run complete milestone tests**

```bash
./gradlew test
./gradlew :app:assembleDebug
```

Expected:

```text
BUILD SUCCESSFUL
```

and APK exists at:

```text
android-native/app/build/outputs/apk/debug/app-debug.apk
```

- [ ] **Step 6: Run scientific smoke checks from JVM tests**

Confirm all three local reference cases pass:

```text
Albuquerque 2023 annular: PASS
Austin 2024 total: PASS
Mosul 1999 edge-sensitive total: PASS
```

- [ ] **Step 7: Record first native milestone metadata**

Create `android-native/MILESTONE_1_VERIFICATION.md` containing exact Gradle/JDK/SDK versions used, test counts, APK SHA-256, and the statement:

```text
Local model: BESSELIAN_WGS84
DE440 verification: NOT YET PORTED IN NATIVE MILESTONE 1
IERS operational: false
```

- [ ] **Step 8: Commit**

```bash
git add android-native
git commit -m "feat: complete native scientific Home Results milestone"
```

---

## Plan Self-Review

### Spec coverage for Milestone 1

Covered:

- Native Kotlin/Compose application shell.
- No WebView.
- Bilingual Arabic/English presentation.
- Safe Android insets.
- Offline Besselian catalog.
- Local C1/C2/MAX/C3/C4 scientific calculation.
- Magnitude/obscuration/local type.
- Explicit scientific provenance.
- Historical calendar policy.
- Regression cases for Albuquerque, Austin, Mosul.
- Actual debug APK build gate.

Intentionally deferred to separate plans because they are independent subsystems:

- Native DE440 DAF/SPK reader + kernel packaging and integrity reconstruction.
- Full R14.2 60-case scientific regression expansion.
- World-city database and GPS/location services.
- 2D MapLibre path map.
- 3D globe renderer.
- Reports/PDF export.
- Baseline Profile/Macrobenchmark performance hardening.

### Placeholder scan

No `TBD`, `TODO`, or unspecified implementation placeholders are accepted in this plan. The DE440 subsystem is explicitly deferred rather than represented by fake data.

### Type consistency

Public names used across tasks are fixed as:

- `ObserverLocation`
- `EclipseEvent`
- `LocalEclipseResult`
- `ScientificDiagnostics`
- `EphemerisVerificationStatus`
- `BesselianElements`
- `BesselianCatalog`
- `BesselianLocalEngine`
- `DefaultEclipseCalculator`
- `EclipseSessionViewModel`
