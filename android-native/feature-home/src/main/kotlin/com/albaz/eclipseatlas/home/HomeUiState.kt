package com.albaz.eclipseatlas.home

data class HomeUiState(
    val year: String = "2026",
    val month: String = "8",
    val day: String = "12",
    val latitude: String = "33.3152",
    val longitude: String = "44.3661",
    val elevation: String = "34",
    val calculating: Boolean = false,
    val error: String? = null,
) {
    val isInputValid: Boolean
        get() {
            val parsedYear = year.toIntOrNull() ?: return false
            val parsedMonth = month.toIntOrNull() ?: return false
            val parsedDay = day.toIntOrNull() ?: return false
            val parsedLatitude = latitude.toDoubleOrNull() ?: return false
            val parsedLongitude = longitude.toDoubleOrNull() ?: return false
            val parsedElevation = elevation.toDoubleOrNull() ?: return false

            return parsedYear in 1550..2650 &&
                parsedMonth in 1..12 &&
                parsedDay in 1..31 &&
                parsedLatitude.isFinite() && parsedLatitude in -90.0..90.0 &&
                parsedLongitude.isFinite() && parsedLongitude in -180.0..180.0 &&
                parsedElevation.isFinite()
        }
}
