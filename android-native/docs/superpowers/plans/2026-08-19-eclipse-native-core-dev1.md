# Eclipse Native Core DEV1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver a testable Android-native foundation that parses the existing 2613-event Besselian catalogue, computes trustworthy local circumstances, enforces an honest DE440 integrity gate, and presents a compact Compose Home/Results UI.

**Architecture:** A pure-Kotlin `science-core` owns all domain math and parsing. The Android `app` module consumes it and never embeds scientific equations in composables. The existing repository-level `besselian_data.js` is copied into generated Android assets at build time, avoiding duplication of the 1.27 MB catalogue.

**Tech Stack:** Kotlin 2.3.21, Jetpack Compose BOM 2026.08.00, AGP 9.3.0, Gradle 9.5.0, JDK 17, compile/target SDK 37, minSdk 26.

**Spec:** `docs/superpowers/specs/2026-08-19-eclipse-android-native-design.md`

## Global Constraints
- Never claim DE440 active until exact part/final integrity checks pass.
- Keep science-core free of Android dependencies.
- Preserve null C2/C3 for partial eclipses.
- Use explicit local magnitude, not global ratio, for central local eclipses.
- Do not bundle proprietary font binaries.
- Do not modify the legacy web application in this phase.

---

### Task 1: Catalogue + local circumstances core

**Files:**
- Create: `science-core/src/main/kotlin/com/albaz/eclipse/core/model/EclipseModels.kt`
- Create: `science-core/src/main/kotlin/com/albaz/eclipse/core/catalog/JsWrappedBesselianCatalog.kt`
- Create: `science-core/src/main/kotlin/com/albaz/eclipse/core/BesselianLocalEngine.kt`
- Test: `science-core/src/test/kotlin/com/albaz/eclipse/core/CoreRegressionMain.kt`
- Test resource: `science-core/src/test/resources/besselian_fixture.js`

**Interfaces:**
- Produces: `JsWrappedBesselianCatalog.parse(String): List<BesselianElements>`
- Produces: `BesselianLocalEngine.solve(BesselianElements, Observer): LocalCircumstances`

- [x] **Step 1: Write regression tests for catalogue parsing, Mosul 1999, and Madrid 2026.**
- [x] **Step 2: Compile the tests and confirm RED because production APIs do not exist.**
- [x] **Step 3: Implement typed models, JS-string extraction, CSV parsing, Besselian geometry, contact root finding, magnitude/obscuration and civil-time conversion.**
- [x] **Step 4: Compile/run and require every regression assertion to pass.**
- [x] **Step 5: Commit the green science core.**

### Task 2: DE440 integrity contract

**Files:**
- Create: `science-core/src/main/kotlin/com/albaz/eclipse/core/integrity/De440Integrity.kt`
- Modify: `science-core/src/test/kotlin/com/albaz/eclipse/core/CoreRegressionMain.kt`

**Interfaces:**
- Produces: `De440Integrity.validateParts(List<AssetFingerprint>): IntegrityStatus`

- [x] **Step 1: Add failing tests for the four R14.2 part sizes/SHA-256 values and for a corrupted part.**
- [x] **Step 2: Run tests and verify RED because the integrity API is absent.**
- [x] **Step 3: Implement exact metadata validation and full-kernel expected fingerprint constants.**
- [x] **Step 4: Run the complete core regression suite and require PASS.**
- [x] **Step 5: Commit the integrity gate.**

### Task 3: Android Compose project and data bridge

**Files:**
- Create: root Gradle settings/build files and `app/build.gradle.kts`
- Create: `app/src/main/AndroidManifest.xml`
- Create: `app/src/main/java/com/albaz/eclipse/MainActivity.kt`
- Create: `app/src/main/java/com/albaz/eclipse/ui/EclipseApp.kt`
- Create: `app/src/main/java/com/albaz/eclipse/ui/HomeScreen.kt`
- Create: `app/src/main/java/com/albaz/eclipse/ui/ResultsScreen.kt`
- Create: `app/src/main/java/com/albaz/eclipse/ui/EclipseViewModel.kt`
- Create: theme/resources

**Interfaces:**
- Consumes: science-core catalogue and local solver.
- Produces: calculation-first native Home and Results screens.

- [x] **Step 1: Add a structural preflight test script that asserts required Android files, pinned toolchain values, no WebView/Capacitor dependency, and generated-catalogue copy wiring.**
- [x] **Step 2: Run preflight and verify RED.**
- [x] **Step 3: Implement the native Android project, edge-to-edge Compose UI, ViewModel calculation flow, and build-time copy of repository `../besselian_data.js`.**
- [x] **Step 4: Re-run structural preflight and the pure Kotlin core suite.**
- [x] **Step 5: Commit the Android native slice.**

### Task 4: Package verification

**Files:**
- Create: `README_NATIVE_DEV1.md`
- Create: `scripts/run_core_regression.sh`
- Create: `scripts/project_preflight.py`

- [ ] **Step 1: Run core regression from a clean output directory.**
- [ ] **Step 2: Run project preflight.**
- [ ] **Step 3: Scan source for `WebView`, `Capacitor`, dynamic dependency versions, and false `DE440 READY` claims.**
- [ ] **Step 4: Record limitations: Android SDK unavailable in this environment; APK is not claimed.**
- [ ] **Step 5: Create a source ZIP and SHA-256 digest.**
