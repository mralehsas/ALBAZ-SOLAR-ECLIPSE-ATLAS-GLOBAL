package com.albaz.eclipse.core.spk

import com.albaz.eclipse.core.integrity.De440Integrity
import com.albaz.eclipse.core.integrity.IntegrityStatus
import java.io.File
import java.nio.file.Files

fun main(args: Array<String>) {
    val partsDir = File(args.firstOrNull() ?: error("parts directory required"))
    val outputDir = Files.createTempDirectory("de440-assemble-").toFile()
    try {
        val result = De440KernelAssembler.assemble(
            partOpener = { name -> File(partsDir, name).inputStream() },
            outputFile = File(outputDir, De440Integrity.FULL_KERNEL_NAME)
        )
        check(result.status == IntegrityStatus.VERIFIED) { "status=${result.status}" }
        check(result.outputFile?.length() == De440Integrity.FULL_KERNEL_SIZE)
        check(result.fullSha256.equals(De440Integrity.FULL_KERNEL_SHA256, ignoreCase = true))

        val bad = File(outputDir, "bad").apply { mkdirs() }
        De440Integrity.expectedParts.forEach { expected ->
            File(partsDir, expected.name).copyTo(File(bad, expected.name))
        }
        File(bad, "de440.bsp.part002").appendBytes(byteArrayOf(1))
        val badResult = De440KernelAssembler.assemble(
            partOpener = { name -> File(bad, name).inputStream() },
            outputFile = File(outputDir, "bad-de440.bsp")
        )
        check(badResult.status == IntegrityStatus.CORRUPT)
        check(!File(outputDir, "bad-de440.bsp").exists())
    } finally {
        outputDir.deleteRecursively()
    }
    println("DE440_ASSEMBLER_REGRESSION PASS")
}
