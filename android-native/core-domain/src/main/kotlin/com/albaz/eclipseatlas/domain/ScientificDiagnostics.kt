package com.albaz.eclipseatlas.domain

sealed interface EphemerisVerificationStatus {
    data object Unavailable : EphemerisVerificationStatus
    data object OutOfCoverage : EphemerisVerificationStatus
    data class IntegrityFailed(val reason: String) : EphemerisVerificationStatus
    data class Verified(val kernelSha256: String) : EphemerisVerificationStatus
}

data class ScientificDiagnostics(
    val localModel: String = "BESSELIAN_WGS84",
    val ephemerisVerification: EphemerisVerificationStatus,
    val timeModel: String,
    val iersOperational: Boolean,
)
