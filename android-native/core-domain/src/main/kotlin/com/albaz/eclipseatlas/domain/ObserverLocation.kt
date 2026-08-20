package com.albaz.eclipseatlas.domain

data class ObserverLocation(
    val latitudeDeg: Double,
    val longitudeEastDeg: Double,
    val elevationMeters: Double = 0.0,
) {
    init {
        require(latitudeDeg.isFinite() && latitudeDeg in -90.0..90.0) {
            "latitudeDeg must be finite and inside [-90, 90]"
        }
        require(longitudeEastDeg.isFinite() && longitudeEastDeg in -180.0..180.0) {
            "longitudeEastDeg must be finite and inside [-180, 180]"
        }
        require(elevationMeters.isFinite()) {
            "elevationMeters must be finite"
        }
    }
}
