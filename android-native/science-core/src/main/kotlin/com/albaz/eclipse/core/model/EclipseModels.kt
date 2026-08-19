package com.albaz.eclipse.core.model

import java.time.LocalDateTime

enum class CalendarSystem { JULIAN, GREGORIAN }

enum class GlobalEclipseType(val code: String) {
    PARTIAL("P"), ANNULAR("A"), TOTAL("T"), HYBRID("H"), UNKNOWN("?");

    companion object {
        fun fromCode(raw: String): GlobalEclipseType = when (raw.trim().uppercase().firstOrNull()) {
            'P' -> PARTIAL
            'A' -> ANNULAR
            'T' -> TOTAL
            'H' -> HYBRID
            else -> UNKNOWN
        }
    }
}

enum class LocalEclipseType { NONE, PARTIAL, ANNULAR, TOTAL }

data class Observer(
    val latitudeDeg: Double,
    val longitudeDeg: Double,
    val altitudeMeters: Double = 0.0,
    val label: String = ""
) {
    init {
        require(latitudeDeg in -90.0..90.0) { "latitude out of range" }
        require(longitudeDeg in -180.0..180.0) { "longitude out of range" }
        require(altitudeMeters.isFinite()) { "altitude must be finite" }
    }
}

data class BesselianElements(
    val year: Int,
    val month: Int,
    val day: Int,
    val deltaTSeconds: Double,
    val globalType: GlobalEclipseType,
    val globalMagnitude: Double,
    val greatestLatitudeDeg: Double,
    val greatestLongitudeDeg: Double,
    val t0Hours: Double,
    val x0: Double,
    val x1: Double,
    val x2: Double,
    val x3: Double,
    val y0: Double,
    val y1: Double,
    val y2: Double,
    val y3: Double,
    val d0Deg: Double,
    val d1Deg: Double,
    val d2Deg: Double,
    val mu0Deg: Double,
    val mu1Deg: Double,
    val mu2Deg: Double,
    val l10: Double,
    val l11: Double,
    val l12: Double,
    val l20: Double,
    val l21: Double,
    val l22: Double,
    val tanF1: Double,
    val tanF2: Double,
    val tMinHours: Double,
    val tMaxHours: Double,
    val catalogueTypeRaw: String
) {
    val calendarSystem: CalendarSystem
        get() = if (year > 1582 || (year == 1582 && (month > 10 || (month == 10 && day >= 15)))) {
            CalendarSystem.GREGORIAN
        } else {
            CalendarSystem.JULIAN
        }
}

data class LocalCircumstances(
    val localType: LocalEclipseType,
    val c1Utc: LocalDateTime?,
    val c2Utc: LocalDateTime?,
    val maximumUtc: LocalDateTime,
    val c3Utc: LocalDateTime?,
    val c4Utc: LocalDateTime?,
    val magnitude: Double,
    val obscuration: Double,
    val sunAltitudeDeg: Double,
    val sunAzimuthDeg: Double,
    val calendarSystem: CalendarSystem,
    val solver: String = "Besselian/GSFC local circumstances"
)
