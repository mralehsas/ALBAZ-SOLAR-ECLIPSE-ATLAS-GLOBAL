# Android Native Scientific Baseline Addendum

Date: 2026-08-20
Applies to: `2026-08-20-android-native-scientific-edition-design.md`

## Purpose

This addendum resolves an ambiguity discovered during implementation planning by reconciling the R14.2 audit with the earlier DE440 audit.

## Correct scientific ownership

The previous Android scientific line did **not** use raw DE440 state vectors as a direct substitute for the complete local-contact solution.

The validated responsibilities are:

- **JPL DE440 Full**: independent high-precision astrometric/geometry verification, Sun/Earth/Moon state vectors, and shadow-axis/global-geometry validation where the native pipeline explicitly uses it.
- **Besselian eclipse elements**: event definition and the validated local-contact solution for C1/C2/MAX/C3/C4, magnitude, obscuration, and local eclipse classification.
- **WGS84/topocentric observer model**: local observer geometry.
- **Delta-T / Earth-orientation policy**: explicitly disclosed; IERS must not be presented as operational unless it actually feeds the active calculation.

This division matches the audited statement that local contacts require the Earth/time/rotation/Besselian eclipse model and must not be derived from raw DE440 position vectors alone.

## DE440 coverage

The audited DE440 kernel covers 2611 of the 2613 catalog events in the 1550–2650 catalog. The two events outside the available kernel coverage are:

- 2650-02-22
- 2650-08-19

Those events may still have Besselian catalog/local calculations, but the app must not mark them as DE440-verified with the audited kernel.

## Native rebuild rule

The new Android app must expose provenance per result instead of showing one ambiguous engine label.

Recommended diagnostics fields:

- `localModel = BESSELIAN_WGS84`
- `ephemerisVerification = DE440_VERIFIED | DE440_UNAVAILABLE | DE440_OUT_OF_COVERAGE | DE440_INTEGRITY_FAILED`
- `timeModel = <explicit model identifier>`
- `iersOperational = true | false`

## Milestone 1 consequence

The first native milestone will port and regression-test the Besselian local engine and native Compose Home/Results flow. It will also define the DE440 verification interface and integrity policy, but it will not falsely claim a working DE440 reader until the kernel and reader are actually present and verified in the new native source tree.

The DE440/SPK port is a separate implementation milestone because the audited R14.2 Java source package is not currently present in the GitHub repository; only its audit reports and checksums are available there.
