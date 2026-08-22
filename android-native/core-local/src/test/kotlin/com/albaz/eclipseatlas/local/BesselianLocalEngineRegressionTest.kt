package com.albaz.eclipseatlas.local

import com.albaz.eclipseatlas.domain.LocalEclipseType
import com.albaz.eclipseatlas.domain.ObserverLocation
import com.albaz.eclipseatlas.eclipse.BesselianCatalog
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneOffset
import kotlin.math.abs
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class BesselianLocalEngineRegressionTest {
    private val catalog = BesselianCatalog.loadDefault()
    private val engine = BesselianLocalEngine()

    @Test
    fun `Austin 2024 total contacts match audited baseline`() {
        val event = requireNotNull(catalog.findExact(2024, 4, 8))
        val result = engine.calculate(event, ObserverLocation(30.267, -97.743, 100.0))

        assertEquals(LocalEclipseType.TOTAL, result.localType)
        assertNearUtc("18:35:56.933", result.contacts.c2, 5.0)
        assertNearUtc("18:36:54.700", result.contacts.maximum, 5.0)
        assertNearUtc("18:37:52.465", result.contacts.c3, 5.0)
        assertMagnitudeNear(1.002764954, result.magnitude, 3e-4)
    }

    @Test
    fun `Albuquerque 2023 annular contacts match audited baseline`() {
        val event = requireNotNull(catalog.findExact(2023, 10, 14))
        val result = engine.calculate(event, ObserverLocation(35.084, -106.651, 100.0))

        assertEquals(LocalEclipseType.ANNULAR, result.localType)
        assertNearUtc("16:34:29.515", result.contacts.c2, 5.0)
        assertNearUtc("16:36:52.970", result.contacts.maximum, 5.0)
        assertNearUtc("16:39:16.349", result.contacts.c3, 5.0)
        assertMagnitudeNear(0.970202323, result.magnitude, 3e-4)
    }

    @Test
    fun `Mosul 1999 remains edge sensitive total`() {
        val event = requireNotNull(catalog.findExact(1999, 8, 11))
        val result = engine.calculate(event, ObserverLocation(36.333333, 43.133333, 223.0))

        assertEquals(LocalEclipseType.TOTAL, result.localType)
        assertNearUtc("11:46:35.375", result.contacts.c2, 5.0)
        assertNearUtc("11:46:54.148", result.contacts.maximum, 5.0)
        assertNearUtc("11:47:12.684", result.contacts.c3, 5.0)
        assertMagnitudeNear(1.000600778, result.magnitude, 3e-4)
    }

    private fun assertNearUtc(expected: String, actual: Instant?, toleranceSeconds: Double) {
        assertNotNull(actual)
        val expectedSeconds = LocalTime.parse(expected).toNanoOfDay() / 1_000_000_000.0
        val actualSeconds = actual!!.atZone(ZoneOffset.UTC).toLocalTime().toNanoOfDay() / 1_000_000_000.0
        assertTrue(
            abs(expectedSeconds - actualSeconds) <= toleranceSeconds,
            "expected $expected UTC but got ${actual.atZone(ZoneOffset.UTC).toLocalTime()} UTC",
        )
    }

    private fun assertMagnitudeNear(expected: Double, actual: Double, tolerance: Double) {
        assertTrue(
            abs(expected - actual) <= tolerance,
            "expected magnitude=$expected but calculated=$actual delta=${actual - expected}",
        )
    }
}
