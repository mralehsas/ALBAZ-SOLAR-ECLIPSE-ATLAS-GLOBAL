package com.albaz.eclipseatlas.time

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class CivilCalendarTest {
    @Test
    fun `1582 reform boundary uses Julian before October 15`() {
        assertEquals(2299160, CivilCalendar.jdn(1582, 10, 4))
        assertEquals(2299161, CivilCalendar.jdn(1582, 10, 15))
    }

    @Test
    fun `1550 NASA civil date round trips as Julian`() {
        val jdn = CivilCalendar.jdn(1550, 3, 18)
        assertEquals(CivilDate(1550, 3, 18), CivilCalendar.fromJdn(jdn))
    }
}
