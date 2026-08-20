package com.albaz.eclipseatlas.eclipse

import com.albaz.eclipseatlas.domain.GlobalEclipseType
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class BesselianCatalogTest {
    @Test
    fun `catalog has audited event count and boundaries`() {
        val catalog = BesselianCatalog.loadDefault()

        assertEquals(2613, catalog.size)
        assertNotNull(catalog.findExact(1550, 3, 18))
        assertNotNull(catalog.findExact(2650, 8, 19))
    }

    @Test
    fun `2023 April eclipse is hybrid globally`() {
        val event = requireNotNull(BesselianCatalog.loadDefault().findExact(2023, 4, 20))

        assertEquals(GlobalEclipseType.HYBRID, event.type)
    }

    @Test
    fun `2025 contains exactly two partial solar eclipses`() {
        val events = BesselianCatalog.loadDefault().eventsInYear(2025)

        assertEquals(2, events.size)
        assertTrue(events.all { it.type == GlobalEclipseType.PARTIAL })
    }
}
