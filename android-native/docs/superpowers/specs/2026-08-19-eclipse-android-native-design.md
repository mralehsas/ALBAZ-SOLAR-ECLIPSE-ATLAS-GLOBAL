# ALBAZ Solar Eclipse Atlas Android Native — Design

## Goal
Rebuild the solar-eclipse application as an Android-native scientific application while preserving the validated behavior of the audited R14.2 science stack and eliminating the WebView-first UI architecture.

## Source of truth
1. R14.2 scientific audit is the acceptance baseline for time, eclipse type, local circumstances, DE440 integrity, WGS84 geometry, and historical-calendar behavior.
2. The current GitHub atlas remains the source of the 2613-event Besselian catalogue and the visual identity; its JavaScript UI is not the target architecture.
3. No component may advertise DE440 as active unless the bundled kernel assets have passed exact size and SHA-256 validation.

## End-state architecture
- **app**: Kotlin + Jetpack Compose, adaptive RTL/LTR UI, edge-to-edge safe areas, Home/Results/Map/3D/Report navigation.
- **science-core**: pure Kotlin domain library. No Android UI dependencies.
- **catalog**: lazy parser for the existing `besselian_data.js` wrapper and a typed 1550–2650 event catalogue.
- **local solver**: independent Besselian local-circumstances engine providing C1/C2/MAX/C3/C4, local type, magnitude, obscuration, Sun altitude and azimuth.
- **DE440 audit**: native SPK layer added as a separate verifier. The first native slice contains the integrity contract; SPK vector evaluation is a later isolated phase because the original R14.2 binary/source is not retained in the current repository.
- **map 2D**: MapLibre Native; eclipse field, path limits, centerline, greatest eclipse, observer and impacted cities are data layers, not raster decoration.
- **globe 3D**: separate renderer loaded on demand; it must never block cold start or local computation.
- **reports**: native report model and export layer after the numerical core is locked.

## Scientific rules
- WGS84 is the Earth model at UI/domain boundaries.
- Global event type and local phase type are separate values.
- C1/C4 astronomical contacts remain separate from horizon-visible interval.
- C2/C3 are absent for partial/no-eclipse locations and are represented as null/domain absence, never text `undefined`.
- Local magnitude is location-dependent. For a central local eclipse it must not be replaced by the global Moon/Sun diameter ratio.
- DE440 positions do not silently replace Besselian contact definitions. The UI reports which solver produced each result.
- Historical dates before Gregorian reform preserve an explicit calendar-system label.
- The 2650 late events are not labelled DE440-verified unless a kernel covering them is installed.

## UI design
The opening screen is calculation-first rather than hero-first. Header identity is compact, then event/year, observer/GPS, and a single scientific calculate action. Result cards appear immediately after computation. Bottom navigation exposes Home, Results, Map, 3D and Report. Heavy map/globe modules load only when opened.

The visual system keeps the existing dark scientific identity with cyan/amber accents, but removes oversized hero whitespace. Arabic typography uses the system Arabic stack unless a properly licensed local font is present; no font binary is embedded by this project.

## Performance
Catalogue parsing and calculations run off the main thread. The app caches the parsed catalogue and last successful observer/event result. 3D and large map layers are lazy. Compose state is immutable at screen boundaries.

## Validation
Phase 1 must run without Android SDK as a pure Kotlin regression suite. Mandatory cases are Mosul 1999 and Madrid 2026 plus catalogue/integrity checks. Android assembly is a separate verification when an Android SDK is available.

## Delivery phases
1. Native Core + Compose Home/Results slice (this plan).
2. DE440 SPK audit/geometry migration with the four validated kernel parts.
3. MapLibre 2D + world-city impact engine.
4. Dedicated 3D globe + reports/export + performance/baseline profiles.
