package com.albaz.eclipseatlas.local

import com.albaz.eclipseatlas.domain.EclipseCalculator
import com.albaz.eclipseatlas.domain.EclipseEvent
import com.albaz.eclipseatlas.domain.LocalEclipseResult
import com.albaz.eclipseatlas.domain.ObserverLocation
import com.albaz.eclipseatlas.eclipse.BesselianCatalog
import com.albaz.eclipseatlas.ephemeris.DefaultEphemerisStatusProvider

class DefaultEclipseCalculator(
    private val catalog: BesselianCatalog = BesselianCatalog.loadDefault(),
    private val localEngine: BesselianLocalEngine = BesselianLocalEngine(),
    private val statusProvider: DefaultEphemerisStatusProvider = DefaultEphemerisStatusProvider(),
) : EclipseCalculator {
    override suspend fun calculate(
        event: EclipseEvent,
        observer: ObserverLocation,
    ): LocalEclipseResult {
        val elements = requireNotNull(catalog.findExact(event.year, event.month, event.day)) {
            "No audited Besselian event for %04d-%02d-%02d".format(
                event.year,
                event.month,
                event.day,
            )
        }
        val result = localEngine.calculate(elements, observer)
        return result.copy(
            diagnostics = result.diagnostics.copy(
                ephemerisVerification = statusProvider.statusFor(event),
            ),
        )
    }
}
