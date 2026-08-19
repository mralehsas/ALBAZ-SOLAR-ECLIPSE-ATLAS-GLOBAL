package com.albaz.eclipse.core

import com.albaz.eclipse.core.model.BesselianElements
import com.albaz.eclipse.core.model.CalendarSystem
import com.albaz.eclipse.core.model.LocalCircumstances
import com.albaz.eclipse.core.model.LocalEclipseType
import com.albaz.eclipse.core.model.Observer
import java.time.LocalDateTime
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.acos
import kotlin.math.asin
import kotlin.math.atan
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.tan

object BesselianLocalEngine {
    private const val DEG = PI / 180.0
    private const val GEO_FACTOR = 0.99664719
    private const val EARTH_A_METERS = 6_378_140.0

    private data class PreparedObserver(
        val latitudeRad: Double,
        val westLongitudeRad: Double,
        val rhoSinPhiPrime: Double,
        val rhoCosPhiPrime: Double
    )

    private data class Polynomial(
        val x: Double, val y: Double, val dx: Double, val dy: Double,
        val declination: Double, val declinationRate: Double,
        val mu: Double, val muRate: Double,
        val l1: Double, val l2: Double
    )

    private data class Circumstance(
        val t: Double,
        val u: Double, val v: Double,
        val a: Double, val b: Double,
        val l1Prime: Double, val l2Prime: Double,
        val m: Double, val n2: Double,
        val declination: Double, val hourAngle: Double,
        val sunAltitude: Double
    )

    fun solve(elements: BesselianElements, observer: Observer): LocalCircumstances {
        val prepared = prepare(observer)
        val maximum = localMid(elements, prepared)
        val geometry = geometryAtMaximum(maximum)

        val external: (Circumstance) -> Double = { it.m - it.l1Prime }
        val c1T = rootFromMid(elements, prepared, maximum.t, external, -1.0, 1.0)
        val c4T = rootFromMid(elements, prepared, maximum.t, external, +1.0, 1.0)

        val internal: (Circumstance) -> Double = { it.m - abs(it.l2Prime) }
        val hasInternal = geometry.localType == LocalEclipseType.TOTAL || geometry.localType == LocalEclipseType.ANNULAR
        val c2T = if (hasInternal) rootFromMid(elements, prepared, maximum.t, internal, -1.0, 0.2) else null
        val c3T = if (hasInternal) rootFromMid(elements, prepared, maximum.t, internal, +1.0, 0.2) else null

        val azimuth = normalizeRadians(
            atan2(
                sin(maximum.hourAngle),
                sin(prepared.latitudeRad) * cos(maximum.hourAngle) -
                    cos(prepared.latitudeRad) * tan(maximum.declination)
            ) + PI
        )

        return LocalCircumstances(
            localType = geometry.localType,
            c1Utc = c1T?.let { timeForT(elements, it) },
            c2Utc = c2T?.let { timeForT(elements, it) },
            maximumUtc = timeForT(elements, maximum.t),
            c3Utc = c3T?.let { timeForT(elements, it) },
            c4Utc = c4T?.let { timeForT(elements, it) },
            magnitude = geometry.magnitude,
            obscuration = geometry.obscuration,
            sunAltitudeDeg = maximum.sunAltitude / DEG,
            sunAzimuthDeg = azimuth / DEG,
            calendarSystem = elements.calendarSystem
        )
    }

    private data class Geometry(val magnitude: Double, val obscuration: Double, val localType: LocalEclipseType)

    private fun geometryAtMaximum(c: Circumstance): Geometry {
        val denominator = c.l1Prime + c.l2Prime
        val rawMagnitude = if (abs(denominator) < 1e-15) 0.0 else (c.l1Prime - c.m) / denominator
        val magnitude = max(0.0, rawMagnitude)
        val localType = when {
            magnitude <= 0.0 -> LocalEclipseType.NONE
            c.m < abs(c.l2Prime) -> if (c.l2Prime < 0.0) LocalEclipseType.TOTAL else LocalEclipseType.ANNULAR
            else -> LocalEclipseType.PARTIAL
        }

        val ratio = if (abs(denominator) < 1e-15) 0.0 else abs((c.l1Prime - c.l2Prime) / denominator)
        val obscuration = when (localType) {
            LocalEclipseType.NONE -> 0.0
            LocalEclipseType.TOTAL -> 1.0
            LocalEclipseType.ANNULAR -> (ratio * ratio).coerceIn(0.0, 1.0)
            LocalEclipseType.PARTIAL -> partialObscuration(ratio, c.m / max(abs(denominator), 1e-15))
        }
        return Geometry(magnitude = magnitude, obscuration = obscuration, localType = localType)
    }

    private fun partialObscuration(radiusRatio: Double, separation: Double): Double {
        val r = radiusRatio
        val d = separation
        if (r <= 0.0 || d >= 1.0 + r) return 0.0
        if (d <= abs(1.0 - r)) return min(1.0, r * r)
        if (d <= 1e-15) return min(1.0, r * r)

        val cos1 = ((d * d + 1.0 - r * r) / (2.0 * d)).coerceIn(-1.0, 1.0)
        val cos2 = ((d * d + r * r - 1.0) / (2.0 * d * r)).coerceIn(-1.0, 1.0)
        val a1 = acos(cos1)
        val a2 = acos(cos2)
        val term = max(0.0, (-d + 1.0 + r) * (d + 1.0 - r) * (d - 1.0 + r) * (d + 1.0 + r))
        val overlap = a1 + r * r * a2 - 0.5 * sqrt(term)
        return (overlap / PI).coerceIn(0.0, 1.0)
    }

    private fun prepare(observer: Observer): PreparedObserver {
        val lat = observer.latitudeDeg * DEG
        val westLon = -observer.longitudeDeg * DEG
        val theta = atan(GEO_FACTOR * tan(lat))
        val rhoSin = GEO_FACTOR * sin(theta) + (observer.altitudeMeters / EARTH_A_METERS) * sin(lat)
        val rhoCos = cos(theta) + (observer.altitudeMeters / EARTH_A_METERS) * cos(lat)
        return PreparedObserver(lat, westLon, rhoSin, rhoCos)
    }

    private fun polynomial(e: BesselianElements, t: Double): Polynomial {
        val t2 = t * t
        val t3 = t2 * t
        val x = e.x0 + e.x1 * t + e.x2 * t2 + e.x3 * t3
        val y = e.y0 + e.y1 * t + e.y2 * t2 + e.y3 * t3
        val dx = e.x1 + 2.0 * e.x2 * t + 3.0 * e.x3 * t2
        val dy = e.y1 + 2.0 * e.y2 * t + 3.0 * e.y3 * t2
        val d = (e.d0Deg + e.d1Deg * t + e.d2Deg * t2) * DEG
        val dd = (e.d1Deg + 2.0 * e.d2Deg * t) * DEG
        val mu = normalizeRadians((e.mu0Deg + e.mu1Deg * t + e.mu2Deg * t2) * DEG)
        val dmu = (e.mu1Deg + 2.0 * e.mu2Deg * t) * DEG
        val l1 = e.l10 + e.l11 * t + e.l12 * t2
        val l2 = e.l20 + e.l21 * t + e.l22 * t2
        return Polynomial(x, y, dx, dy, d, dd, mu, dmu, l1, l2)
    }

    private fun circumstance(e: BesselianElements, o: PreparedObserver, t: Double): Circumstance {
        val p = polynomial(e, t)
        val sd = sin(p.declination)
        val cd = cos(p.declination)
        val h = p.mu - o.westLongitudeRad - (e.deltaTSeconds / 13_713.44)
        val sh = sin(h)
        val ch = cos(h)
        val xi = o.rhoCosPhiPrime * sh
        val eta = o.rhoSinPhiPrime * cd - o.rhoCosPhiPrime * ch * sd
        val zeta = o.rhoSinPhiPrime * sd + o.rhoCosPhiPrime * ch * cd
        val dXi = p.muRate * o.rhoCosPhiPrime * ch
        val dEta = p.muRate * xi * sd - zeta * p.declinationRate
        val u = p.x - xi
        val v = p.y - eta
        val a = p.dx - dXi
        val b = p.dy - dEta
        val l1p = p.l1 - zeta * e.tanF1
        val l2p = p.l2 - zeta * e.tanF2
        val m = hypot(u, v)
        val n2 = a * a + b * b
        val alt = asin((sd * sin(o.latitudeRad) + cd * cos(o.latitudeRad) * ch).coerceIn(-1.0, 1.0))
        return Circumstance(t, u, v, a, b, l1p, l2p, m, n2, p.declination, h, alt)
    }

    private fun localMid(e: BesselianElements, o: PreparedObserver): Circumstance {
        var t = 0.0
        repeat(50) {
            val c = circumstance(e, o, t)
            require(c.n2 > 1e-20) { "Degenerate Besselian derivative at local maximum" }
            val correction = (c.u * c.a + c.v * c.b) / c.n2
            t = (t - correction).coerceIn(e.tMinHours, e.tMaxHours)
            if (abs(correction) < 1e-9) return circumstance(e, o, t)
        }
        return circumstance(e, o, t)
    }

    private fun rootFromMid(
        e: BesselianElements,
        o: PreparedObserver,
        midT: Double,
        fn: (Circumstance) -> Double,
        direction: Double,
        stepSeconds: Double
    ): Double? {
        val step = max(0.2, stepSeconds) / 3600.0
        var inner = midT
        if (fn(circumstance(e, o, inner)) >= 0.0) return null
        repeat(100_000) {
            val outer = inner + direction * step
            if (outer < e.tMinHours || outer > e.tMaxHours) return null
            val outerF = fn(circumstance(e, o, outer))
            if (outerF >= 0.0) {
                return if (direction < 0.0) bisect(e, o, fn, outer, inner) else bisect(e, o, fn, inner, outer)
            }
            inner = outer
        }
        return null
    }

    private fun bisect(
        e: BesselianElements,
        o: PreparedObserver,
        fn: (Circumstance) -> Double,
        low0: Double,
        high0: Double
    ): Double? {
        var low = low0
        var high = high0
        var fLow = fn(circumstance(e, o, low))
        var fHigh = fn(circumstance(e, o, high))
        if (fLow * fHigh > 0.0) return null
        repeat(80) {
            val mid = (low + high) * 0.5
            val fMid = fn(circumstance(e, o, mid))
            if (abs(fMid) < 1e-13 || abs(high - low) < 1e-12) return mid
            if (fLow * fMid <= 0.0) {
                high = mid
                fHigh = fMid
            } else {
                low = mid
                fLow = fMid
            }
        }
        return (low + high) * 0.5
    }

    private fun timeForT(e: BesselianElements, t: Double): LocalDateTime {
        val totalHours = t + e.t0Hours - e.deltaTSeconds / 3600.0
        val dayOffset = floor(totalHours / 24.0).toLong()
        var hourOfDay = totalHours - dayOffset * 24.0
        if (hourOfDay < 0.0) hourOfDay += 24.0

        val civil = addCivilDays(e.year, e.month, e.day, dayOffset, e.calendarSystem)
        var totalNanos = (hourOfDay * 3_600_000_000_000.0).toLong()
        val nanosPerDay = 86_400_000_000_000L
        var date = civil
        if (totalNanos >= nanosPerDay) {
            totalNanos -= nanosPerDay
            date = addCivilDays(civil.first, civil.second, civil.third, 1, e.calendarSystem)
        }
        val hour = (totalNanos / 3_600_000_000_000L).toInt()
        totalNanos %= 3_600_000_000_000L
        val minute = (totalNanos / 60_000_000_000L).toInt()
        totalNanos %= 60_000_000_000L
        val second = (totalNanos / 1_000_000_000L).toInt()
        val nano = (totalNanos % 1_000_000_000L).toInt()
        return LocalDateTime.of(date.first, date.second, date.third, hour, minute, second, nano)
    }

    private data class CivilDate(val first: Int, val second: Int, val third: Int)

    private fun addCivilDays(year: Int, month: Int, day: Int, delta: Long, calendar: CalendarSystem): CivilDate {
        var jdn = toJdn(year, month, day, calendar) + delta
        return fromJdn(jdn, calendar)
    }

    private fun toJdn(year: Int, month: Int, day: Int, calendar: CalendarSystem): Long {
        val a = (14 - month) / 12
        val y = year + 4800 - a
        val m = month + 12 * a - 3
        return if (calendar == CalendarSystem.GREGORIAN) {
            day.toLong() + ((153 * m + 2) / 5) + 365L * y + y / 4 - y / 100 + y / 400 - 32045
        } else {
            day.toLong() + ((153 * m + 2) / 5) + 365L * y + y / 4 - 32083
        }
    }

    private fun fromJdn(jdn: Long, calendar: CalendarSystem): CivilDate {
        return if (calendar == CalendarSystem.GREGORIAN) {
            var a = jdn + 32044
            val b = (4 * a + 3) / 146097
            a -= (146097 * b) / 4
            val c = (4 * a + 3) / 1461
            a -= (1461 * c) / 4
            val d = (5 * a + 2) / 153
            val day = (a - (153 * d + 2) / 5 + 1).toInt()
            val month = (d + 3 - 12 * (d / 10)).toInt()
            val year = (100 * b + c - 4800 + d / 10).toInt()
            CivilDate(year, month, day)
        } else {
            val c = jdn + 32082
            val d = (4 * c + 3) / 1461
            val e = c - (1461 * d) / 4
            val m = (5 * e + 2) / 153
            val day = (e - (153 * m + 2) / 5 + 1).toInt()
            val month = (m + 3 - 12 * (m / 10)).toInt()
            val year = (d - 4800 + m / 10).toInt()
            CivilDate(year, month, day)
        }
    }

    private fun normalizeRadians(value: Double): Double {
        var out = value % (2.0 * PI)
        if (out < 0.0) out += 2.0 * PI
        return out
    }
}
