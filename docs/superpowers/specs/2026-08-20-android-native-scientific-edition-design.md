# ALBAZ Solar Eclipse Atlas Android — Native Scientific Edition

Date: 2026-08-20
Status: Design approved in chat; implementation pending user review of this written specification
Target: Android Native-First scientific eclipse application

## 1. Goal

Rebuild the Android solar eclipse application as a fast, auditable, native-first scientific product while preserving validated scientific logic and reference data from the existing ALBAZ eclipse codebase.

The new application must improve five areas together:

1. scientific correctness and traceability,
2. Android UI quality and responsiveness,
3. map and globe usability,
4. startup/runtime performance,
5. Arabic/English presentation and reporting.

## 2. Scientific baseline to preserve

The validated R14.2 audit is the reference baseline for the new Android implementation.

Baseline scientific properties:

- JPL DE440 Full as the operational ephemeris source.
- WGS84 Earth model.
- Operational search range 1550–2650.
- Native Java DE440 SPK Type-2 reading already validated in the prior Android line.
- Separate treatment of global shadow-path constants and local-contact physical radii.
- Light-time corrected shadow path.
- Hybrid eclipse classification based on central-path behavior, not only maximum eclipse.
- Explicit disclosure that IERS data is a reference/audit layer unless actually injected into the operational time/orientation pipeline.
- Historical Julian/Gregorian display handling separated from the physical time scale.
- Existing regression cases, including 1550 boundary cases, Mosul 1999, Albuquerque 2023, Austin 2024, 2023 hybrid, 2024 total, and 2026 total.

Scientific behavior must not be changed merely for UI convenience.

## 3. Architecture

The application will use a modular native Android architecture.

### 3.1 Modules

- `app`: Android application shell, navigation, permissions, dependency wiring.
- `core-domain`: eclipse/domain models and use cases; no Android UI dependency.
- `core-time`: UTC/TT/UT1/Delta-T/calendar conversion policy.
- `core-ephemeris`: DE440 asset verification and SPK access.
- `core-eclipse`: global eclipse search, Besselian/shadow geometry, greatest eclipse, event classification.
- `core-local`: local circumstances, C1/C2/MAX/C3/C4, magnitude, obscuration, altitude/azimuth.
- `core-geo`: WGS84, observer location, world-city database, geospatial transforms.
- `feature-home`: date/event/location entry and quick calculation.
- `feature-results`: scientific result cards and contact table.
- `feature-map2d`: interactive eclipse path map.
- `feature-globe3d`: dedicated 3D Earth/umbra visualization loaded on demand.
- `feature-report`: report preview/export.
- `feature-settings`: language, units, time display, map preferences.
- `feature-about`: version, scientific engine, limitations, credits, glossary.

### 3.2 UI stack

- Kotlin.
- Jetpack Compose.
- Material 3 foundations with custom ALBAZ scientific visual system.
- Navigation Compose.
- ViewModel + StateFlow.
- Coroutines for non-UI computation.

### 3.3 Dependency direction

UI features depend on domain interfaces, never directly on DE440 files or low-level ephemeris readers.

`feature-* -> core-domain -> scientific core interfaces -> low-level implementations`

This keeps scientific code independently testable and prevents UI refactors from modifying numerical behavior.

## 4. DE440 policy

DE440 is operational only when the app has successfully verified and opened the real kernel.

Required behavior:

- verify every packaged kernel part by size and SHA-256,
- reconstruct/open the full kernel using the validated asset manager approach,
- verify the final kernel SHA-256,
- refuse to label a result as `DE440` if verification fails,
- expose the active ephemeris source in a scientific diagnostics card,
- keep kernel loading off the main UI thread,
- cache initialized kernel state for later calculations.

Reference full kernel fingerprint from R14.2:

`a4ce9bf9b3282becc9f4b2ac3cebe03a2ae7599981aabd7265fd8482fff7c4b5`

## 5. Scientific calculation flow

For a requested date/location:

1. Resolve civil date and display calendar policy.
2. Convert to required physical time scales.
3. Obtain Sun/Earth/Moon state vectors from DE440.
4. Apply the validated light-time policy for apparent shadow geometry.
5. Build the eclipse/global-shadow solution.
6. Classify P/A/T/H globally.
7. Determine greatest eclipse.
8. Generate global path geometry.
9. For a local observer, solve local topocentric contacts.
10. Compute C1, C2, MAX, C3, C4 where physically applicable.
11. Compute magnitude, obscuration, altitude, azimuth, duration, and edge-sensitivity flags.
12. Return a typed immutable scientific result object to the UI.

No `undefined`, NaN, or placeholder contact values may leak into UI-facing models.

## 6. Time and Earth-orientation policy

The app must explicitly label which time/orientation model produced each result.

- Modern observations may use updated Earth-orientation data when an actual supported input pipeline exists.
- Historical/future calculations must disclose Delta-T uncertainty.
- IERS must never be presented as operational unless it actually feeds the calculation.
- UTC-like, UT1, TT, and display-local time must not be conflated.
- Historical dates before Gregorian reform must have an explicit Julian/Gregorian display policy.

## 7. Main Android UX

### 7.1 Home

Primary flow visible without scrolling on a normal phone:

- event/date selector,
- current location / city / coordinates,
- timezone summary,
- `Calculate Eclipse` primary action,
- last-result summary when available.

The current oversized introductory layout is not the main interaction surface in the new edition.

### 7.2 Bottom navigation

Five primary destinations:

1. Home
2. Results
3. Map
4. 3D
5. Report

Settings/About are secondary destinations.

### 7.3 Results

Top summary:

- eclipse type,
- magnitude,
- obscuration,
- maximum time,
- central-phase duration where applicable,
- Sun altitude.

Detailed cards:

- C1/C2/MAX/C3/C4,
- local circumstances,
- observer coordinates/elevation,
- time-scale diagnostics,
- edge sensitivity / horizon warnings.

## 8. Visual design

Retain the ALBAZ scientific/cinematic identity while making it mobile-native.

Rules:

- dark scientific background,
- restrained cyan/blue and gold accents,
- high-contrast typography,
- no decorative glow that reduces legibility,
- consistent component radii and spacing,
- proper Android status/navigation bar insets,
- correct RTL for Arabic and LTR for English,
- layouts adaptive for compact phones, landscape, foldables, and tablets.

Arabic and English are first-class modes, not machine-translated overlays.

## 9. Typography

Use a bundled, legally distributable Arabic/Latin font family suitable for Android packaging.

The historical visual preference for Janna LT Bold may guide appearance, but the application must not depend on an unbundled device font for layout correctness.

Typography must be defined through a Compose type scale and tested in both languages.

## 10. 2D map

The 2D map is a scientific data surface, not a decorative map.

Required layers:

- center line,
- total/annular central-path limits,
- partial-eclipse limits where available,
- greatest-eclipse marker,
- observer marker,
- day/night terminator,
- latitude/longitude graticule,
- optional important-city layer,
- contact/path labels,
- magnitude/obscuration overlay where computationally justified.

Interaction:

- pan/zoom/rotate,
- tap any point to calculate local circumstances,
- toggle scientific layers,
- fit eclipse path,
- center on observer,
- clear loading/error state.

MapLibre Native is preferred for the 2D map unless a measured prototype exposes a blocker.

## 11. 3D globe

The 3D globe is an independent lazy-loaded feature.

It must not delay cold start or basic eclipse calculation.

Required capabilities:

- Earth globe with geographic context,
- eclipse shadow/path rendering,
- observer marker,
- day/night visualization,
- smooth orbit/zoom gestures,
- time scrub/animation for the eclipse event.

The implementation is isolated behind a `GlobeRenderer` interface so the rendering backend can change without touching the scientific core.

## 12. Performance

Performance targets are measured, not assumed.

Required strategy:

- no DE440 reconstruction on the main thread,
- no 3D initialization during initial app startup,
- lazy-load map/globe feature graphs,
- cache city indexes and repeated scientific intermediates,
- structured concurrency and cancellation for user-triggered recalculation,
- avoid recomposition of heavy map/globe layers,
- Baseline Profile for startup and primary calculation flow,
- Macrobenchmark coverage for startup and core screen transitions.

Initial target budget for a typical modern Android phone:

- usable Home screen quickly after process launch,
- calculation progress must remain responsive,
- map and 3D loading show deterministic progress/error states,
- no ANR during global-path generation.

Exact millisecond acceptance thresholds will be set after the first native performance baseline is measured.

## 13. Offline behavior

Core eclipse calculation must work offline.

Bundled/offline assets include:

- DE440 kernel parts,
- validated eclipse data/reference tables as needed,
- core city database,
- required map base data or an explicit offline-capable map strategy,
- glossary and help content.

Network access may enhance maps or update audit/reference data, but must not be required for the core calculation.

## 14. Reports

Reports must be generated from the same immutable result model shown in the UI.

Report sections:

- event identity,
- observer location,
- eclipse classification,
- contact times,
- magnitude/obscuration,
- duration,
- altitude/azimuth,
- map snapshot where available,
- active ephemeris/time model,
- scientific limitations/warnings,
- app/build version.

Arabic and English report output are both required.

## 15. Error handling

Errors are typed and user-readable.

Examples:

- DE440 integrity failure,
- unsupported year,
- no eclipse at observer location,
- central contacts do not exist,
- map data unavailable,
- 3D renderer failure,
- malformed city data,
- invalid coordinates,
- interrupted/cancelled calculation.

Scientific errors and UI/network errors must not be merged into one generic message.

## 16. Testing

### 16.1 Scientific regression

Port and preserve all validated R14.2 reference cases.

Minimum required cases:

- 1550-03-18 annular,
- 1550-09-10 total,
- 1706-05-12 total,
- 1860-07-18 total,
- 1919-05-29 total,
- 2012-05-20 annular,
- 2017-08-21 total,
- 2023-04-20 hybrid,
- 2024-04-08 total,
- both 2025 partial eclipses,
- 2026-08-12 total,
- Mosul 1999 edge-sensitive total,
- Albuquerque 2023 local contacts,
- Austin 2024 local contacts.

### 16.2 Android tests

- unit tests for view models and formatting,
- Compose UI tests for Arabic/English,
- screenshot/golden checks for key phone widths,
- map layer integration tests,
- globe smoke tests,
- rotation/configuration-change tests,
- offline startup and calculation tests,
- process recreation/state restoration tests,
- export/report tests.

### 16.3 Release gate

No scientific release is accepted unless:

- scientific regression passes,
- DE440 integrity checks pass,
- UI test suite passes,
- map path test cases pass,
- Arabic/English layout checks pass,
- APK/AAB is actually assembled with Android SDK,
- at least one real-device test is completed.

## 17. Migration strategy

Do not rewrite validated science blindly.

Migration order:

1. freeze the R14.2 scientific outputs as golden reference data,
2. extract/port low-level DE440 and eclipse logic behind interfaces,
3. establish native Kotlin/JVM regression equivalence,
4. build the Compose shell,
5. implement results flow,
6. implement 2D map,
7. implement report flow,
8. implement 3D globe,
9. performance hardening,
10. final scientific and real-device acceptance.

The existing web/global repository remains a reference source and comparison harness during migration.

## 18. Versioning

The native rebuild must use a distinct Android version identity rather than pretending to be the old WebView/Capacitor line.

Working product identity:

`ALBAZ Solar Eclipse Atlas Android — Native Scientific Edition`

A final semantic version/build number will be assigned at the first installable native milestone.

## 19. Non-goals for the first native milestone

- cloud accounts,
- social features,
- arbitrary online AI dependency,
- unrelated astronomy modules,
- claiming meter-level central-limit accuracy without event-specific lunar limb data,
- claiming operational IERS usage when it is not actually injected.

## 20. Definition of success

The native edition succeeds when a user can launch the app, choose an eclipse/date and location, receive scientifically validated local circumstances, inspect an accurate interactive path map, open a responsive 3D eclipse visualization, and export a bilingual report — with the same scientific core independently testable outside the UI and with transparent disclosure of the active ephemeris/time models.