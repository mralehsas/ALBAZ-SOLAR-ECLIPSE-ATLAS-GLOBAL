package com.albaz.eclipse.core.spk

import java.io.File
import kotlin.math.abs

private fun near(actual: Double, expected: Double, tolerance: Double, label: String) {
    check(abs(actual - expected) <= tolerance) { "$label expected=$expected actual=$actual tolerance=$tolerance" }
}

private fun near3(actual: Vec3Km, expected: DoubleArray, toleranceKm: Double, label: String) {
    near(actual.x, expected[0], toleranceKm, "$label.x")
    near(actual.y, expected[1], toleranceKm, "$label.y")
    near(actual.z, expected[2], toleranceKm, "$label.z")
}

fun main(args: Array<String>) {
    val kernelPath = args.firstOrNull() ?: System.getenv("DE440_BSP")
    require(!kernelPath.isNullOrBlank()) { "Pass de440.bsp path or set DE440_BSP" }
    val file = File(kernelPath)
    check(file.isFile) { "Kernel not found: $kernelPath" }

    De440SpkKernel.open(file).use { kernel ->
        check(kernel.identificationWord == "DAF/SPK")
        check(kernel.binaryFormat == "LTL-IEEE")
        check(kernel.nd == 2)
        check(kernel.ni == 6)
        check(kernel.segments.size == 14) { "segments=${kernel.segments.size}" }

        fun requireSegment(target: Int, center: Int) {
            val s = kernel.segments.single { it.target == target }
            check(s.center == center)
            check(s.frame == 1)
            check(s.dataType == 2)
        }
        requireSegment(3, 0)
        requireSegment(10, 0)
        requireSegment(301, 3)
        requireSegment(399, 3)

        near3(kernel.positionSsb(399, 0.0), doubleArrayOf(-27566740.48280604, 132361381.15354352, 57418653.286251314), 1e-5, "Earth SSB ET0")
        near3(kernel.positionGeocentric(10, 0.0), doubleArrayOf(26499033.677425086, -132757417.33833946, -57556718.47053819), 1e-5, "Sun geo ET0")
        near3(kernel.positionGeocentric(301, 0.0), doubleArrayOf(-291608.3846334331, -266716.8333942294, -76102.48709990084), 1e-6, "Moon geo ET0")
        near3(kernel.positionGeocentric(10, 840_000_000.0), doubleArrayOf(-118712249.69105619, 86411021.19463784, 37458224.08346179), 1e-5, "Sun geo ET840M")
        near3(kernel.positionGeocentric(301, 840_000_000.0), doubleArrayOf(-366788.5077909678, 77579.0859798044, 21762.750925794244), 1e-6, "Moon geo ET840M")

        var rejected = false
        try {
            kernel.positionGeocentric(10, kernel.segments.first().coverageEndEt + 1.0)
        } catch (_: IllegalArgumentException) {
            rejected = true
        }
        check(rejected) { "out-of-coverage epoch must be rejected" }
    }
    println("DE440_SPK_REGRESSION PASS")
}
