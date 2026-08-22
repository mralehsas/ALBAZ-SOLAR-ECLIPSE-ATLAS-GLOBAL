package com.albaz.eclipseatlas.local

internal data class PreparedObserver(
    val latitudeRad: Double,
    val westLongitudeRad: Double,
    val rhoSin: Double,
    val rhoCos: Double,
)

internal data class PolynomialState(
    val x: Double,
    val y: Double,
    val dx: Double,
    val dy: Double,
    val declinationRad: Double,
    val declinationRateRadPerHour: Double,
    val muRad: Double,
    val muRateRadPerHour: Double,
    val l1: Double,
    val l2: Double,
)

internal data class Circumstances(
    val tHours: Double,
    val u: Double,
    val v: Double,
    val a: Double,
    val b: Double,
    val l1Prime: Double,
    val l2Prime: Double,
    val m: Double,
    val n2: Double,
    val altitudeRad: Double,
    val azimuthRad: Double,
)

internal data class MidGeometry(
    val magnitude: Double,
    val ratio: Double,
    val obscuration: Double,
    val kind: GeometryKind,
)

internal enum class GeometryKind {
    NONE,
    PARTIAL,
    ANNULAR,
    TOTAL,
}
