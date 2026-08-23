package com.albaz.eclipseatlas.ephemeris

import com.albaz.eclipseatlas.domain.EclipseEvent
import com.albaz.eclipseatlas.domain.EphemerisVerificationStatus

class DefaultEphemerisStatusProvider {
    fun statusFor(event: EclipseEvent): EphemerisVerificationStatus =
        if (event.isOutsideAuditedDe440Coverage()) {
            EphemerisVerificationStatus.OutOfCoverage
        } else {
            EphemerisVerificationStatus.Unavailable
        }

    private fun EclipseEvent.isOutsideAuditedDe440Coverage(): Boolean =
        year == 2650 && (
            (month == 2 && day == 22) ||
                (month == 8 && day == 19)
            )
}
