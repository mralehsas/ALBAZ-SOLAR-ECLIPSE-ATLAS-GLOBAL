package com.albaz.eclipseatlas.eclipse

import com.albaz.eclipseatlas.domain.GlobalEclipseType

data class BesselianElements(
    val year: Int,
    val month: Int,
    val day: Int,
    val tdGreatest: String,
    val deltaTSeconds: Double,
    val lunarNumber: Int,
    val saros: Int,
    val type: GlobalEclipseType,
    val gamma: Double,
    val catalogMagnitude: Double,
    val julianDate: Double,
    val t0Hours: Double,
    val x: DoubleArray,
    val y: DoubleArray,
    val d: DoubleArray,
    val mu: DoubleArray,
    val l1: DoubleArray,
    val l2: DoubleArray,
    val tanF1: Double,
    val tanF2: Double,
    val tMinHours: Double,
    val tMaxHours: Double,
) {
    init {
        require(month in 1..12)
        require(day in 1..31)
        require(x.size == 4)
        require(y.size == 4)
        require(d.size == 3)
        require(mu.size == 3)
        require(l1.size == 3)
        require(l2.size == 3)
    }
}
