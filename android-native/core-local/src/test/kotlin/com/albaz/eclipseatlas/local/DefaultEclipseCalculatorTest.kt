package com.albaz.eclipseatlas.local

import com.albaz.eclipseatlas.domain.EclipseEvent
import com.albaz.eclipseatlas.domain.EphemerisVerificationStatus
import com.albaz.eclipseatlas.domain.GlobalEclipseType
import com.albaz.eclipseatlas.domain.ObserverLocation
import com.albaz.eclipseatlas.eclipse.BesselianCatalog
import com.albaz.eclipseatlas.ephemeris.DefaultEphemerisStatusProvider
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class DefaultEclipseCalculatorTest {
    private val catalog = BesselianCatalog.loadDefault()
    private val statusProvider = DefaultEphemerisStatusProvider()
    private val calculator = DefaultEclipseCalculator(
        catalog = catalog,
        localEngine = BesselianLocalEngine(),
        statusProvider = statusProvider,
    )

    @Test
    fun `milestone 1 never claims DE440 verification without a native kernel`() = runBlocking {
        val event = EclipseEvent(
            year = 2024,
            month = 4,
            day = 8,
            globalType = GlobalEclipseType.TOTAL,
            catalogMagnitude = 1.0566,
            saros = 139,
        )

        val result = calculator.calculate(
            event,
            ObserverLocation(30.267, -97.743, 100.0),
        )

        assertEquals(
            EphemerisVerificationStatus.Unavailable,
            result.diagnostics.ephemerisVerification,
        )
    }

    @Test
    fun `late 2650 events are explicitly outside audited DE440 coverage`() {
        val february = EclipseEvent(
            year = 2650,
            month = 2,
            day = 22,
            globalType = GlobalEclipseType.PARTIAL,
            catalogMagnitude = 0.0,
            saros = 0,
        )
        val august = february.copy(month = 8, day = 19)

        assertEquals(EphemerisVerificationStatus.OutOfCoverage, statusProvider.statusFor(february))
        assertEquals(EphemerisVerificationStatus.OutOfCoverage, statusProvider.statusFor(august))
    }
}
