package com.albaz.eclipseatlas.local

import com.albaz.eclipseatlas.domain.ContactTimes
import com.albaz.eclipseatlas.domain.EclipseEvent
import com.albaz.eclipseatlas.domain.EphemerisVerificationStatus
import com.albaz.eclipseatlas.domain.LocalEclipseResult
import com.albaz.eclipseatlas.domain.LocalEclipseType
import com.albaz.eclipseatlas.domain.ObserverLocation
import com.albaz.eclipseatlas.domain.ScientificDiagnostics
import com.albaz.eclipseatlas.eclipse.BesselianElements
import com.albaz.eclipseatlas.time.CivilCalendar
import java.time.Instant
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
import kotlin.math.tan

class BesselianLocalEngine {
    fun calculate(elements: BesselianElements, observer: ObserverLocation): LocalEclipseResult {
        val prepared = prepareObserver(observer)
        val mid = findLocalMid(elements, prepared)
        val geometry = geometryAtMid(mid)
        val event = EclipseEvent(
            year = elements.year,
            month = elements.month,
            day = elements.day,
            globalType = elements.type,
            catalogMagnitude = elements.catalogMagnitude,
            saros = elements.saros,
        )
        val diagnostics = ScientificDiagnostics(
            localModel = "BESSELIAN_WGS84",
            ephemerisVerification = EphemerisVerificationStatus.Unavailable,
            timeModel = "BESSELIAN_DT_CATALOG",
            iersOperational = false,
        )

        if (geometry.magnitude <= 0.0) {
            return LocalEclipseResult(
                event = event,
                observer = observer,
                localType = LocalEclipseType.NOT_VISIBLE,
                contacts = ContactTimes(null, null, null, null, null),
                magnitude = 0.0,
                obscuration = 0.0,
                maximumSunAltitudeDeg = mid.altitudeRad * RAD,
                maximumSunAzimuthDeg = mid.azimuthRad * RAD,
                centralDurationSeconds = null,
                diagnostics = diagnostics,
            )
        }

        val outerFn: (Circumstances) -> Double = { c -> c.m - c.l1Prime }
        val c1T = rootFromMid(elements, prepared, mid.tHours, outerFn, -1, 30.0)
        val c4T = rootFromMid(elements, prepared, mid.tHours, outerFn, +1, 30.0)

        var c2T: Double? = null
        var c3T: Double? = null
        if (geometry.kind == GeometryKind.TOTAL || geometry.kind == GeometryKind.ANNULAR) {
            val innerFn: (Circumstances) -> Double = { c -> c.m - abs(c.l2Prime) }
            c2T = rootFromMid(elements, prepared, mid.tHours, innerFn, -1, 2.0)
            c3T = rootFromMid(elements, prepared, mid.tHours, innerFn, +1, 2.0)
        }

        val centralDuration = if (c2T != null && c3T != null) {
            max(0.0, (c3T - c2T) * 3600.0)
        } else {
            null
        }

        return LocalEclipseResult(
            event = event,
            observer = observer,
            localType = geometry.kind.toLocalType(),
            contacts = ContactTimes(
                c1 = c1T?.let { instantForT(elements, it) },
                c2 = c2T?.let { instantForT(elements, it) },
                maximum = instantForT(elements, mid.tHours),
                c3 = c3T?.let { instantForT(elements, it) },
                c4 = c4T?.let { instantForT(elements, it) },
            ),
            magnitude = geometry.magnitude,
            obscuration = geometry.obscuration,
            maximumSunAltitudeDeg = mid.altitudeRad * RAD,
            maximumSunAzimuthDeg = mid.azimuthRad * RAD,
            centralDurationSeconds = centralDuration,
            diagnostics = diagnostics,
        )
    }

    private fun prepareObserver(observer: ObserverLocation): PreparedObserver {
        val lat = observer.latitudeDeg * DEG
        val theta = atan(GEO_FACTOR * tan(lat))
        val altitudeRatio = observer.elevationMeters / EARTH_A_M
        return PreparedObserver(
            latitudeRad = lat,
            westLongitudeRad = -observer.longitudeEastDeg * DEG,
            rhoSin = GEO_FACTOR * sin(theta) + altitudeRatio * sin(lat),
            rhoCos = cos(theta) + altitudeRatio * cos(lat),
        )
    }

    private fun polynomial(elements: BesselianElements, t: Double): PolynomialState {
        val t2 = t * t
        val t3 = t2 * t
        val x = elements.x[0] + elements.x[1] * t + elements.x[2] * t2 + elements.x[3] * t3
        val y = elements.y[0] + elements.y[1] * t + elements.y[2] * t2 + elements.y[3] * t3
        val dx = elements.x[1] + 2.0 * elements.x[2] * t + 3.0 * elements.x[3] * t2
        val dy = elements.y[1] + 2.0 * elements.y[2] * t + 3.0 * elements.y[3] * t2
        val dDeg = elements.d[0] + elements.d[1] * t + elements.d[2] * t2
        val dd = (elements.d[1] + 2.0 * elements.d[2] * t) * DEG
        var muDeg = elements.mu[0] + elements.mu[1] * t + elements.mu[2] * t2
        muDeg = ((muDeg % 360.0) + 360.0) % 360.0
        val dMu = (elements.mu[1] + 2.0 * elements.mu[2] * t) * DEG
        val l1 = elements.l1[0] + elements.l1[1] * t + elements.l1[2] * t2
        val l2 = elements.l2[0] + elements.l2[1] * t + elements.l2[2] * t2
        return PolynomialState(
            x = x,
            y = y,
            dx = dx,
            dy = dy,
            declinationRad = dDeg * DEG,
            declinationRateRadPerHour = dd,
            muRad = muDeg * DEG,
            muRateRadPerHour = dMu,
            l1 = l1,
            l2 = l2,
        )
    }

    private fun circumstancesAt(
        elements: BesselianElements,
        observer: PreparedObserver,
        t: Double,
    ): Circumstances {
        val p = polynomial(elements, t)
        val sd = sin(p.declinationRad)
        val cd = cos(p.declinationRad)
        val h = p.muRad - observer.westLongitudeRad - elements.deltaTSeconds / 13713.44
        val sh = sin(h)
        val ch = cos(h)
        val xi = observer.rhoCos * sh
        val eta = observer.rhoSin * cd - observer.rhoCos * ch * sd
        val zeta = observer.rhoSin * sd + observer.rhoCos * ch * cd
        val dXi = p.muRateRadPerHour * observer.rhoCos * ch
        val dEta = p.muRateRadPerHour * xi * sd - zeta * p.declinationRateRadPerHour
        val u = p.x - xi
        val v = p.y - eta
        val a = p.dx - dXi
        val b = p.dy - dEta
        val l1Prime = p.l1 - zeta * elements.tanF1
        val l2Prime = p.l2 - zeta * elements.tanF2
        val m = hypot(u, v)
        val n2 = a * a + b * b
        val sinLat = sin(observer.latitudeRad)
        val cosLat = cos(observer.latitudeRad)
        val altitude = asin(clamp(sd * sinLat + cd * cosLat * ch, -1.0, 1.0))
        var azimuth = atan2(-sh * cd, sd * cosLat - ch * sinLat * cd)
        if (azimuth < 0.0) azimuth += 2.0 * PI
        return Circumstances(
            tHours = t,
            u = u,
            v = v,
            a = a,
            b = b,
            l1Prime = l1Prime,
            l2Prime = l2Prime,
            m = m,
            n2 = n2,
            altitudeRad = altitude,
            azimuthRad = azimuth,
        )
    }

    private fun findLocalMid(elements: BesselianElements, observer: PreparedObserver): Circumstances {
        var t = 0.0
        repeat(50) {
            val c = circumstancesAt(elements, observer, t)
            if (c.n2 <= 1e-18) return circumstancesAt(elements, observer, t)
            val correction = (c.u * c.a + c.v * c.b) / c.n2
            if (!correction.isFinite()) return circumstancesAt(elements, observer, t)
            t = clamp(t - correction, elements.tMinHours, elements.tMaxHours)
            if (abs(correction) < 1e-9) return circumstancesAt(elements, observer, t)
        }
        return circumstancesAt(elements, observer, t)
    }

    private fun bisect(
        elements: BesselianElements,
        observer: PreparedObserver,
        fn: (Circumstances) -> Double,
        loInitial: Double,
        hiInitial: Double,
        iterations: Int = 50,
    ): Double? {
        var lo = loInitial
        var hi = hiInitial
        var fLo = fn(circumstancesAt(elements, observer, lo))
        var fHi = fn(circumstancesAt(elements, observer, hi))
        if (!fLo.isFinite() || !fHi.isFinite()) return null
        if (abs(fLo) < 1e-12) return lo
        if (abs(fHi) < 1e-12) return hi
        if (fLo * fHi > 0.0) return null
        repeat(iterations) {
            val mid = (lo + hi) / 2.0
            val fMid = fn(circumstancesAt(elements, observer, mid))
            if (!fMid.isFinite()) return null
            if (abs(fMid) < 1e-11 || abs(hi - lo) < 1e-10) return mid
            if (fLo * fMid <= 0.0) {
                hi = mid
                fHi = fMid
            } else {
                lo = mid
                fLo = fMid
            }
        }
        return (lo + hi) / 2.0
    }

    private fun rootFromMid(
        elements: BesselianElements,
        observer: PreparedObserver,
        midT: Double,
        fn: (Circumstances) -> Double,
        direction: Int,
        stepSeconds: Double,
    ): Double? {
        val step = max(0.2, stepSeconds) / 3600.0
        var innerT = midT
        val initial = fn(circumstancesAt(elements, observer, innerT))
        if (initial >= 0.0) return null
        repeat(10_000) {
            val outerT = innerT + direction * step
            if (outerT < elements.tMinHours || outerT > elements.tMaxHours) return null
            val outerF = fn(circumstancesAt(elements, observer, outerT))
            if (outerF >= 0.0) {
                return if (direction < 0) {
                    bisect(elements, observer, fn, outerT, innerT)
                } else {
                    bisect(elements, observer, fn, innerT, outerT)
                }
            }
            innerT = outerT
        }
        return null
    }

    private fun geometryAtMid(mid: Circumstances): MidGeometry {
        val denominator = mid.l1Prime + mid.l2Prime
        val magnitude = if (denominator != 0.0) (mid.l1Prime - mid.m) / denominator else 0.0
        val ratio = if (denominator != 0.0) (mid.l1Prime - mid.l2Prime) / denominator else 0.0
        val kind = when {
            magnitude <= 0.0 -> GeometryKind.NONE
            mid.m < abs(mid.l2Prime) && mid.l2Prime < 0.0 -> GeometryKind.TOTAL
            mid.m < abs(mid.l2Prime) -> GeometryKind.ANNULAR
            else -> GeometryKind.PARTIAL
        }

        var obscuration = 0.0
        if (magnitude >= 1.0) {
            obscuration = 1.0
        } else if (magnitude > 0.0) {
            obscuration = when {
                kind == GeometryKind.ANNULAR -> clamp(ratio * ratio, 0.0, 1.0)
                mid.m > 1e-12 -> {
                    val d1 = mid.l1Prime * mid.l1Prime - mid.l2Prime * mid.l2Prime
                    val ac1 = clamp(
                        (mid.l1Prime * mid.l1Prime + mid.l2Prime * mid.l2Prime - 2.0 * mid.m * mid.m) / d1,
                        -1.0,
                        1.0,
                    )
                    val ac2 = clamp(
                        (mid.l1Prime * mid.l2Prime + mid.m * mid.m) /
                            (mid.m * (mid.l1Prime + mid.l2Prime)),
                        -1.0,
                        1.0,
                    )
                    val c = acos(ac1)
                    val b = acos(ac2)
                    val a = PI - b - c
                    clamp(((ratio * ratio * a + b) - ratio * sin(c)) / PI, 0.0, 1.0)
                }
                else -> clamp(ratio * ratio, 0.0, 1.0)
            }
        }

        return MidGeometry(
            magnitude = max(0.0, magnitude),
            ratio = ratio,
            obscuration = obscuration,
            kind = kind,
        )
    }

    private fun instantForT(elements: BesselianElements, t: Double): Instant {
        val totalSeconds = (t + elements.t0Hours - elements.deltaTSeconds / 3600.0) * 3600.0
        val dayShift = floor(totalSeconds / 86400.0).toLong()
        var secondsInDay = totalSeconds - dayShift * 86400.0
        var adjustedDayShift = dayShift
        if (secondsInDay < 0.0) {
            secondsInDay += 86400.0
            adjustedDayShift -= 1
        }
        if (secondsInDay >= 86400.0) {
            secondsInDay -= 86400.0
            adjustedDayShift += 1
        }

        val baseJdn = CivilCalendar.jdn(elements.year, elements.month, elements.day).toLong()
        val epochDay = baseJdn + adjustedDayShift - UNIX_EPOCH_JDN
        val wholeSeconds = floor(secondsInDay).toLong()
        val nanos = ((secondsInDay - wholeSeconds) * 1_000_000_000.0).toLong()
        return Instant.ofEpochSecond(epochDay * 86400L + wholeSeconds, nanos)
    }

    private fun GeometryKind.toLocalType(): LocalEclipseType = when (this) {
        GeometryKind.NONE -> LocalEclipseType.NOT_VISIBLE
        GeometryKind.PARTIAL -> LocalEclipseType.PARTIAL
        GeometryKind.ANNULAR -> LocalEclipseType.ANNULAR
        GeometryKind.TOTAL -> LocalEclipseType.TOTAL
    }

    private fun clamp(value: Double, minimum: Double, maximum: Double): Double =
        min(max(value, minimum), maximum)

    private companion object {
        const val DEG = PI / 180.0
        const val RAD = 180.0 / PI
        const val EARTH_A_M = 6_378_140.0
        const val GEO_FACTOR = 0.99664719
        const val UNIX_EPOCH_JDN = 2_440_588L
    }
}
