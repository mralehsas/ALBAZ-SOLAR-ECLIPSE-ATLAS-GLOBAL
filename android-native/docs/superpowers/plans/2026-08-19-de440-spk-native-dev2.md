# DE440 Native SPK DEV2 Implementation Plan

**Goal:** Add a pure-Kotlin native DAF/SPK Type-2 reader that validates and reads the recovered official DE440 kernel, exposes Earth/Sun/Moon geometric positions, and can be consumed by Android without WebView/Skyfield.

**Scientific source:** NAIF DAF Required Reading + SPK Required Reading Type 2. The recovered `de440.bsp` must match the R14.2 SHA-256 before use.

## Task 1 — RED kernel structure regression
- Add tests for DAF/SPK identity, LTL-IEEE, ND=2, NI=6, 14 segments.
- Require segments 3→0, 10→0, 301→3, 399→3, all frame 1/type 2.
- Require raw ET=0 vector reference values derived independently from the same official kernel using a separate Python spec reader.
- Confirm tests fail before production reader exists.

## Task 2 — GREEN pure Kotlin DAF/SPK Type-2 reader
- Parse the 1024-byte DAF file record and summary/name record chain.
- Decode packed integer summary components respecting LTL/BIG IEEE.
- Read Type-2 trailer INIT/INTLEN/RSIZE/N.
- Select fixed-interval record and evaluate Chebyshev T_n.
- Resolve target→center chains to SSB and geocentric vectors.
- Reject unsupported DAF format, unsupported type/frame, out-of-coverage epochs, malformed addresses and invalid record sizes.

## Task 3 — Integrity + zero-copy Android asset provider
- Retain strict four-part assembly as a regression/fallback compatibility layer for R14.2 archives.
- For the Android APK, inject the official full `de440.bsp` at build time and store it uncompressed.
- Verify its exact SHA-256 on first run, persist a verification marker, then seek directly inside the APK asset with a base-offset FileChannel instead of copying another 120 MB into app-private storage.
- Never expose VERIFIED/READY on size/hash/SPK smoke-test mismatch.

## Task 4 — Android integration
- Run kernel asset verification off the main thread.
- Add DE440 state to ViewModel.
- Add a compact Scientific Audit result card: kernel integrity + Sun/Moon geometric distances at a safe test epoch / selected event when timescale conversion is available.
- Do not replace Besselian C1–C4 with DE440 raw vectors.

## Task 5 — CI and package
- CI downloads official NAIF `de440.bsp` at build time only, verifies exact SHA-256, injects the full uncompressed asset, and builds an offline APK.
- Run core regression against the official kernel before assembleDebug.
- Inspect the resulting APK to confirm `assets/de440.bsp` is present, uncompressed, and exactly 119,799,808 bytes.
- Publish DEV2 debug APK artifact without merging to main.
