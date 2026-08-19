package com.albaz.eclipse.core

import com.albaz.eclipse.core.catalog.JsWrappedBesselianCatalog
import com.albaz.eclipse.core.model.LocalEclipseType
import com.albaz.eclipse.core.model.Observer
import com.albaz.eclipse.core.integrity.AssetFingerprint
import com.albaz.eclipse.core.integrity.De440Integrity
import com.albaz.eclipse.core.integrity.IntegrityStatus
import java.io.File
import java.time.Duration
import java.time.LocalDateTime
import kotlin.math.abs

private fun assertNear(actual: Double, expected: Double, tolerance: Double, label: String) {
    check(abs(actual - expected) <= tolerance) { "$label expected=$expected actual=$actual tolerance=$tolerance" }
}

private fun assertSeconds(actual: LocalDateTime?, expected: LocalDateTime, toleranceSeconds: Double, label: String) {
    check(actual != null) { "$label is null" }
    val millis = abs(Duration.between(expected, actual).toMillis())
    check(millis <= toleranceSeconds * 1000.0) { "$label delta=${millis / 1000.0}s > ${toleranceSeconds}s; actual=$actual expected=$expected" }
}

fun main() {
    val fixture = File("science-core/src/test/resources/besselian_fixture.js").readText()
    val events = JsWrappedBesselianCatalog.parse(fixture)
    check(events.size == 2) { "catalogue fixture size expected=2 actual=${events.size}" }
    check(events[1].year == 2026 && events[1].globalType.code == "T") { "2026 total event was not parsed" }

    val mosul = BesselianLocalEngine.solve(
        events.first { it.year == 1999 },
        Observer(latitudeDeg = 36.333333, longitudeDeg = 43.133333, altitudeMeters = 223.0)
    )
    check(mosul.localType == LocalEclipseType.TOTAL) { "Mosul 1999 must be total, got ${mosul.localType}" }
    assertSeconds(mosul.c1Utc, LocalDateTime.parse("1999-08-11T10:23:30.262"), 5.0, "Mosul C1")
    assertSeconds(mosul.c2Utc, LocalDateTime.parse("1999-08-11T11:46:35.375"), 5.0, "Mosul C2")
    assertSeconds(mosul.maximumUtc, LocalDateTime.parse("1999-08-11T11:46:54.148"), 5.0, "Mosul MAX")
    assertSeconds(mosul.c3Utc, LocalDateTime.parse("1999-08-11T11:47:12.684"), 5.0, "Mosul C3")
    assertSeconds(mosul.c4Utc, LocalDateTime.parse("1999-08-11T13:01:34.485"), 5.0, "Mosul C4")
    assertNear(mosul.magnitude, 1.000600778, 0.001, "Mosul magnitude")

    val madrid = BesselianLocalEngine.solve(
        events.first { it.year == 2026 },
        Observer(latitudeDeg = 40.4168, longitudeDeg = -3.7038, altitudeMeters = 667.0)
    )
    check(madrid.localType == LocalEclipseType.PARTIAL) { "Madrid 2026 must be partial, got ${madrid.localType}" }
    check(madrid.c2Utc == null && madrid.c3Utc == null) { "Partial eclipse must not expose C2/C3" }
    assertSeconds(madrid.c1Utc, LocalDateTime.parse("2026-08-12T17:36:40.499"), 0.1, "Madrid C1")
    assertSeconds(madrid.maximumUtc, LocalDateTime.parse("2026-08-12T18:32:18.108"), 0.1, "Madrid MAX")
    assertSeconds(madrid.c4Utc, LocalDateTime.parse("2026-08-12T19:24:25.610"), 0.1, "Madrid C4")
    assertNear(madrid.magnitude, 0.9988184702, 1e-6, "Madrid magnitude")

    val validParts = listOf(
        AssetFingerprint("de440.bsp.part001", 33_554_432L, "c82327e943876775462eae7f50a9ba75259f9e6074a08b613fa423640d6d1b84"),
        AssetFingerprint("de440.bsp.part002", 33_554_432L, "3bf39a078cdbb920cd44231d3fc24dc87ffb766703cbb5faa96d02c38bfb82f2"),
        AssetFingerprint("de440.bsp.part003", 33_554_432L, "7189ab5e85a73d8bd1fe67111c7cfca5b8af34aa18511c366ab1e354fdcdcb8a"),
        AssetFingerprint("de440.bsp.part004", 19_136_512L, "2f6ca02ce40deb793b95cfea43c412616e151924cf496ca666dd3e5ad76b0105")
    )
    check(De440Integrity.validateParts(validParts) == IntegrityStatus.VERIFIED) { "Known R14.2 DE440 parts must verify" }
    val corrupt = validParts.toMutableList().also { it[2] = it[2].copy(sha256 = "00".repeat(32)) }
    check(De440Integrity.validateParts(corrupt) == IntegrityStatus.CORRUPT) { "Corrupted DE440 part must be rejected" }

    println("CORE_REGRESSION PASS: catalogue=2 Mosul1999=PASS Madrid2026=PASS DE440_INTEGRITY=PASS")
}
