package com.albaz.eclipseatlas.domain

import java.time.Instant

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
