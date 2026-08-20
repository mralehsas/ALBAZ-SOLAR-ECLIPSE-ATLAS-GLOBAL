package com.albaz.eclipseatlas.domain

enum class GlobalEclipseType {
    PARTIAL,
    ANNULAR,
    TOTAL,
    HYBRID,
}

enum class LocalEclipseType {
    NOT_VISIBLE,
    PARTIAL,
    ANNULAR,
    TOTAL,
}

data class EclipseEvent(
    val year: Int,
    val month: Int,
    val day: Int,
    val globalType: GlobalEclipseType,
    val catalogMagnitude: Double,
    val saros: Int,
)
