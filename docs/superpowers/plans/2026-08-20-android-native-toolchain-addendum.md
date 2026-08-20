# Android Native Toolchain Addendum

Date: 2026-08-20
Overrides the toolchain/plugin declarations in `2026-08-20-android-native-milestone1-core-home-results.md` where they conflict with AGP 9 built-in Kotlin.

## Corrected build policy

- Android Gradle Plugin: `9.3.0`.
- Gradle: `9.5.0`.
- JDK/JVM target: `17`.
- compileSdk: `37`.
- targetSdk: `36`.
- minSdk: `26`.
- Compose BOM: `2026.08.00` (Compose 1.12 stable line).
- Kotlin/Compose compiler plugin: `2.3.21`.
- Android modules use AGP 9 **built-in Kotlin** and MUST NOT apply `org.jetbrains.kotlin.android`.
- Pure JVM modules continue to use `org.jetbrains.kotlin.jvm` `2.3.21`.
- Compose Android modules apply `org.jetbrains.kotlin.plugin.compose` `2.3.21`.
- Lifecycle ViewModel Compose is pinned to `2.10.0` for Milestone 1.

## Reason

AGP 9 enables built-in Kotlin by default. Applying `org.jetbrains.kotlin.android` on an AGP 9 Android module can fail because AGP already registers the Kotlin extension. The native rebuild therefore follows the built-in Kotlin migration path rather than opting out with legacy flags.

This addendum changes build plumbing only. It does not change the approved scientific architecture, numerical model, UI scope, or milestone acceptance criteria.
