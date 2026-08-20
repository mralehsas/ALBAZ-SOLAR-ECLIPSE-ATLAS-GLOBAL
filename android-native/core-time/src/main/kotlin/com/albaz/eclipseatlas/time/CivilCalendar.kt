package com.albaz.eclipseatlas.time

data class CivilDate(
    val year: Int,
    val month: Int,
    val day: Int,
)

object CivilCalendar {
    private const val GREGORIAN_REFORM_JDN = 2_299_161

    fun jdn(year: Int, month: Int, day: Int): Int {
        require(month in 1..12) { "month must be in 1..12" }
        require(day in 1..31) { "day must be in 1..31" }

        val a = (14 - month) / 12
        val y = year + 4800 - a
        val m = month + 12 * a - 3
        val isGregorian = year > 1582 ||
            (year == 1582 && (month > 10 || (month == 10 && day >= 15)))

        return if (isGregorian) {
            day + (153 * m + 2) / 5 + 365 * y + y / 4 - y / 100 + y / 400 - 32045
        } else {
            day + (153 * m + 2) / 5 + 365 * y + y / 4 - 32083
        }
    }

    fun fromJdn(jdn: Int): CivilDate = if (jdn >= GREGORIAN_REFORM_JDN) {
        fromGregorianJdn(jdn)
    } else {
        fromJulianJdn(jdn)
    }

    private fun fromGregorianJdn(jdn: Int): CivilDate {
        val a = jdn + 32044
        val b = (4 * a + 3) / 146097
        val c = a - (146097 * b) / 4
        val d = (4 * c + 3) / 1461
        val e = c - (1461 * d) / 4
        val m = (5 * e + 2) / 153
        val day = e - (153 * m + 2) / 5 + 1
        val month = m + 3 - 12 * (m / 10)
        val year = 100 * b + d - 4800 + m / 10
        return CivilDate(year, month, day)
    }

    private fun fromJulianJdn(jdn: Int): CivilDate {
        val c = jdn + 32082
        val d = (4 * c + 3) / 1461
        val e = c - (1461 * d) / 4
        val m = (5 * e + 2) / 153
        val day = e - (153 * m + 2) / 5 + 1
        val month = m + 3 - 12 * (m / 10)
        val year = d - 4800 + m / 10
        return CivilDate(year, month, day)
    }
}
