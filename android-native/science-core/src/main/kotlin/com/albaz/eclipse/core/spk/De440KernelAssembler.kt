package com.albaz.eclipse.core.spk

import com.albaz.eclipse.core.integrity.De440Integrity
import com.albaz.eclipse.core.integrity.IntegrityStatus
import java.io.File
import java.io.FileNotFoundException
import java.io.InputStream
import java.security.MessageDigest


data class De440AssemblyResult(
    val status: IntegrityStatus,
    val outputFile: File? = null,
    val fullSha256: String? = null,
    val message: String = ""
)

/** Strict, streaming assembler for the four audited DE440 assets. */
object De440KernelAssembler {
    private const val BUFFER_BYTES = 1024 * 1024

    fun assemble(partOpener: (String) -> InputStream, outputFile: File): De440AssemblyResult {
        outputFile.parentFile?.mkdirs()
        val temp = File(outputFile.parentFile ?: File("."), outputFile.name + ".assembling")
        temp.delete()
        outputFile.delete()

        val fullDigest = MessageDigest.getInstance("SHA-256")
        return try {
            temp.outputStream().buffered(BUFFER_BYTES).use { output ->
                val buffer = ByteArray(BUFFER_BYTES)
                for (expected in De440Integrity.expectedParts) {
                    val partDigest = MessageDigest.getInstance("SHA-256")
                    var count = 0L
                    val input = try {
                        partOpener(expected.name)
                    } catch (e: FileNotFoundException) {
                        throw MissingPart(expected.name, e)
                    }
                    input.use { stream ->
                        while (true) {
                            val n = stream.read(buffer)
                            if (n < 0) break
                            if (n == 0) continue
                            count += n
                            partDigest.update(buffer, 0, n)
                            fullDigest.update(buffer, 0, n)
                            output.write(buffer, 0, n)
                        }
                    }
                    val hash = partDigest.digest().hex()
                    if (count != expected.sizeBytes || !hash.equals(expected.sha256, ignoreCase = true)) {
                        throw CorruptPart(expected.name, count, hash)
                    }
                }
            }

            val fullHash = fullDigest.digest().hex()
            if (temp.length() != De440Integrity.FULL_KERNEL_SIZE ||
                !fullHash.equals(De440Integrity.FULL_KERNEL_SHA256, ignoreCase = true)
            ) {
                temp.delete()
                De440AssemblyResult(IntegrityStatus.CORRUPT, fullSha256 = fullHash, message = "Final DE440 fingerprint mismatch")
            } else if (!temp.renameTo(outputFile)) {
                temp.copyTo(outputFile, overwrite = true)
                temp.delete()
                if (outputFile.length() != De440Integrity.FULL_KERNEL_SIZE) {
                    outputFile.delete()
                    De440AssemblyResult(IntegrityStatus.CORRUPT, message = "Final DE440 move/copy failed")
                } else {
                    De440AssemblyResult(IntegrityStatus.VERIFIED, outputFile, fullHash, "DE440 verified")
                }
            } else {
                De440AssemblyResult(IntegrityStatus.VERIFIED, outputFile, fullHash, "DE440 verified")
            }
        } catch (e: MissingPart) {
            temp.delete(); outputFile.delete()
            De440AssemblyResult(IntegrityStatus.MISSING, message = "Missing ${e.partName}")
        } catch (e: CorruptPart) {
            temp.delete(); outputFile.delete()
            De440AssemblyResult(IntegrityStatus.CORRUPT, message = "Corrupt ${e.partName}: size=${e.size} sha256=${e.sha256}")
        } catch (e: FileNotFoundException) {
            temp.delete(); outputFile.delete()
            De440AssemblyResult(IntegrityStatus.MISSING, message = e.message ?: "Missing DE440 asset")
        } catch (t: Throwable) {
            temp.delete(); outputFile.delete(); throw t
        }
    }

    private class MissingPart(val partName: String, cause: Throwable) : RuntimeException(cause)
    private class CorruptPart(val partName: String, val size: Long, val sha256: String) : RuntimeException()
    private fun ByteArray.hex(): String = joinToString("") { "%02x".format(it.toInt() and 0xff) }
}
