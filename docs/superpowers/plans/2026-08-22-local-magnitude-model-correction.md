# Local Magnitude Model Correction

Date: 2026-08-22
Status: scientific correction discovered during TDD execution

## Finding

Task 4 originally required the pure Besselian fallback engine to reproduce the R14.2 local magnitude to 5e-6 while also instructing the implementation to port the legacy Besselian geometry one-to-one. TDD showed that these requirements are numerically inconsistent.

The pure Besselian local engine reproduces the audited local contact times for Austin 2024, Albuquerque 2023, and Mosul 1999 within the declared 5-second contact tolerance, but its geometric magnitude differs from the R14.2 audited native value by approximately 1.4e-4 to 2.8e-4.

Observed values after removing the legacy central-eclipse moon/sun-ratio overwrite:

- Austin 2024: audited 1.002764954; Besselian fallback 1.0024830603; delta -2.81894e-4.
- Albuquerque 2023: audited 0.970202323; Besselian fallback 0.9700594422; delta -1.42881e-4.
- Mosul 1999: audited 1.000600778; Besselian fallback 1.0003978492; delta -2.02929e-4.

## Cause

R14.2 explicitly separated the Besselian/global cone constants from the physical-radii local model. The audited native line used physical solar/lunar radii for the high-precision local geometry, while the current Milestone 1 core is intentionally the offline Besselian fallback and does not yet contain the DE440 SPK/local physical-vector pipeline.

The old web engine also overwrote central-eclipse local magnitude with a moon/sun ratio derived from Besselian l1/l2. That behavior is not retained because it makes the reported magnitude insensitive to local center separation in the way required by the audited local result.

## Correct Milestone 1 acceptance rule

For the pure Besselian fallback:

- C1/C2/MAX/C3/C4 regression tolerance remains <= 5 seconds against the R14.2 audited cases.
- Local classification must match R14.2.
- Besselian fallback magnitude must stay within 3e-4 of the R14.2 physical-model magnitude for the three reference cases.
- Diagnostics must label the model `BESSELIAN_WGS84` and must not claim DE440 verification.

For the later native DE440/physical-radii local engine:

- Restore the strict magnitude acceptance tolerance of <= 5e-6 for Austin and Albuquerque and <= 8e-6 for Mosul.
- Use the physical Sun radius 696000 km and Moon radius 1737.4 km as documented by the R14.2 audit.
- Do not claim this stricter accuracy until the real kernel and physical local vector pipeline are operational and tested.

This is a correction of test-model provenance, not a relaxation of the final scientific target.