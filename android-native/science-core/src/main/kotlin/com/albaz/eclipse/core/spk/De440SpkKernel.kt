package com.albaz.eclipse.core.spk

import java.io.Closeable
import java.io.EOFException
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel
import java.nio.file.StandardOpenOption
import kotlin.math.floor

/** Geometric Cartesian vector in the SPK frame, kilometres. */
data class Vec3Km(val x: Double, val y: Double, val z: Double) {
    operator fun plus(other: Vec3Km) = Vec3Km(x + other.x, y + other.y, z + other.z)
    operator fun minus(other: Vec3Km) = Vec3Km(x - other.x, y - other.y, z - other.z)

    companion object { val ZERO = Vec3Km(0.0, 0.0, 0.0) }
}

data class SpkSegment(
    val name: String,
    val coverageStartEt: Double,
    val coverageEndEt: Double,
    val target: Int,
    val center: Int,
    val frame: Int,
    val dataType: Int,
    val initialAddress: Int,
    val finalAddress: Int
)

/**
 * Minimal read-only NAIF DAF/SPK reader for Type-2 (Chebyshev position-only) segments.
 *
 * This deliberately implements only the subset needed by JPL DE440. It does not attempt
 * to be a general replacement for CSPICE. Epoch arguments are ephemeris seconds past
 * J2000 TDB, exactly as defined by the SPK format.
 */
class De440SpkKernel private constructor(
    private val channel: FileChannel,
    private val baseOffsetBytes: Long,
    private val logicalLengthBytes: Long,
    private val closeChannelOnClose: Boolean,
    val identificationWord: String,
    val binaryFormat: String,
    val nd: Int,
    val ni: Int,
    val segments: List<SpkSegment>,
    private val byteOrder: ByteOrder
) : Closeable {

    init {
        require(identificationWord == "DAF/SPK") { "Not an SPK DAF: $identificationWord" }
        require(nd == 2 && ni == 6) { "Unsupported SPK summary format ND=$nd NI=$ni" }
        require(segments.isNotEmpty()) { "SPK contains no segments" }
    }

    fun positionSsb(target: Int, etTdbSeconds: Double): Vec3Km {
        require(etTdbSeconds.isFinite()) { "ET must be finite" }
        if (target == SSB) return Vec3Km.ZERO

        var body = target
        var result = Vec3Km.ZERO
        val visited = HashSet<Int>()
        while (body != SSB) {
            require(visited.add(body)) { "SPK center cycle at body $body" }
            val segment = segmentFor(body, etTdbSeconds)
            require(segment.frame == J2000_FRAME) {
                "Unsupported SPK frame ${segment.frame} for target ${segment.target}"
            }
            require(segment.dataType == TYPE_2) {
                "Unsupported SPK data type ${segment.dataType} for target ${segment.target}"
            }
            result += evaluateType2(segment, etTdbSeconds)
            body = segment.center
        }
        return result
    }

    fun positionGeocentric(target: Int, etTdbSeconds: Double): Vec3Km =
        positionSsb(target, etTdbSeconds) - positionSsb(EARTH, etTdbSeconds)

    private fun segmentFor(target: Int, et: Double): SpkSegment {
        return segments.asReversed().firstOrNull {
            it.target == target && et >= it.coverageStartEt && et <= it.coverageEndEt
        } ?: throw IllegalArgumentException("No SPK segment for target=$target at ET=$et")
    }

    private fun evaluateType2(segment: SpkSegment, et: Double): Vec3Km {
        require(segment.finalAddress - segment.initialAddress + 1 >= 5) { "Malformed type-2 segment" }
        val trailer = readWords(segment.finalAddress - 3, segment.finalAddress)
        val init = trailer[0]
        val intervalLength = trailer[1]
        val recordSize = exactPositiveInt(trailer[2], "RSIZE")
        val recordCount = exactPositiveInt(trailer[3], "N")
        require(intervalLength > 0.0 && intervalLength.isFinite()) { "Invalid INTLEN=$intervalLength" }
        require((recordSize - 2) % 3 == 0 && recordSize >= 5) { "Invalid Type-2 RSIZE=$recordSize" }

        val dataWords = segment.finalAddress.toLong() - segment.initialAddress.toLong() + 1L - 4L
        require(dataWords == recordSize.toLong() * recordCount.toLong()) {
            "Type-2 directory mismatch: words=$dataWords rsize=$recordSize n=$recordCount"
        }

        val rawIndex = floor((et - init) / intervalLength).toLong()
        val recordIndex = rawIndex.coerceIn(0L, recordCount.toLong() - 1L)
        val firstAddress = segment.initialAddress.toLong() + recordIndex * recordSize.toLong()
        val lastAddress = firstAddress + recordSize - 1L
        require(firstAddress >= segment.initialAddress && lastAddress <= segment.finalAddress - 4L) {
            "Type-2 record address out of segment"
        }

        val record = readWords(firstAddress.toInt(), lastAddress.toInt())
        val midpoint = record[0]
        val radius = record[1]
        require(radius > 0.0 && radius.isFinite()) { "Invalid Chebyshev radius=$radius" }
        val tau = (et - midpoint) / radius
        require(tau in -1.0000000001..1.0000000001) { "ET outside selected Chebyshev record: tau=$tau" }

        val coefficientCount = (recordSize - 2) / 3
        fun component(component: Int): Double {
            val offset = 2 + component * coefficientCount
            return evaluateChebyshev(record, offset, coefficientCount, tau)
        }
        return Vec3Km(component(0), component(1), component(2))
    }

    private fun readWords(firstAddress: Int, lastAddress: Int): DoubleArray {
        require(firstAddress >= 1 && lastAddress >= firstAddress) { "Invalid DAF address range" }
        val count = lastAddress.toLong() - firstAddress.toLong() + 1L
        require(count <= 10_000_000L) { "DAF read range too large: $count words" }
        val bytes = Math.multiplyExact(count, 8L)
        require(bytes <= Int.MAX_VALUE) { "DAF read exceeds JVM buffer size" }
        val buffer = ByteBuffer.allocate(bytes.toInt()).order(byteOrder)
        val logicalByteEnd = firstAddress.toLong() * 8L + bytes - 8L
        require(logicalByteEnd <= logicalLengthBytes) { "DAF address exceeds logical source length" }
        readFully(channel, buffer, baseOffsetBytes + (firstAddress.toLong() - 1L) * 8L)
        buffer.flip()
        return DoubleArray(count.toInt()) { buffer.double }
    }

    override fun close() {
        if (closeChannelOnClose) channel.close()
    }

    companion object {
        const val SSB = 0
        const val SUN = 10
        const val EARTH = 399
        const val MOON = 301
        private const val J2000_FRAME = 1
        private const val TYPE_2 = 2
        private const val RECORD_BYTES = 1024

        fun open(file: File): De440SpkKernel {
            require(file.isFile) { "SPK file not found: ${file.absolutePath}" }
            val channel = FileChannel.open(file.toPath(), StandardOpenOption.READ)
            return try {
                openChannel(channel, 0L, channel.size(), closeChannelOnClose = true)
            } catch (t: Throwable) {
                channel.close()
                throw t
            }
        }

        /** Opens a logical SPK byte range inside a larger seekable file (for example an uncompressed APK asset). */
        fun openChannel(
            channel: FileChannel,
            baseOffsetBytes: Long,
            logicalLengthBytes: Long,
            closeChannelOnClose: Boolean = false
        ): De440SpkKernel {
            require(baseOffsetBytes >= 0L && logicalLengthBytes >= RECORD_BYTES.toLong()) { "Invalid SPK byte range" }
            require(baseOffsetBytes + logicalLengthBytes <= channel.size()) { "SPK byte range exceeds channel" }
            val fileRecord = ByteBuffer.allocate(RECORD_BYTES)
            readFully(channel, fileRecord, baseOffsetBytes)
            val raw = fileRecord.array()
            val id = ascii(raw, 0, 8).trimEnd()
            val format = ascii(raw, 88, 8).trimEnd('\u0000', ' ')
            val order = when (format) {
                "LTL-IEEE" -> ByteOrder.LITTLE_ENDIAN
                "BIG-IEEE" -> ByteOrder.BIG_ENDIAN
                else -> throw IllegalArgumentException("Unsupported DAF binary format: $format")
            }
            val header = ByteBuffer.wrap(raw).order(order)
            val nd = header.getInt(8)
            val ni = header.getInt(12)
            val forwardRecord = header.getInt(76)
            require(forwardRecord >= 2) { "Invalid initial summary record=$forwardRecord" }
            val segments = parseSegments(channel, baseOffsetBytes, logicalLengthBytes, order, nd, ni, forwardRecord)
            return De440SpkKernel(
                channel = channel,
                baseOffsetBytes = baseOffsetBytes,
                logicalLengthBytes = logicalLengthBytes,
                closeChannelOnClose = closeChannelOnClose,
                identificationWord = id,
                binaryFormat = format,
                nd = nd,
                ni = ni,
                segments = segments,
                byteOrder = order
            )
        }

        private fun parseSegments(
            channel: FileChannel,
            baseOffsetBytes: Long,
            logicalLengthBytes: Long,
            order: ByteOrder,
            nd: Int,
            ni: Int,
            firstSummaryRecord: Int
        ): List<SpkSegment> {
            require(nd >= 0 && ni >= 2) { "Invalid DAF summary dimensions" }
            val summaryWords = nd + (ni + 1) / 2
            val nameChars = 8 * summaryWords
            require(summaryWords in 1..125) { "Invalid DAF summary size=$summaryWords" }
            val maxSummaries = 125 / summaryWords
            val out = ArrayList<SpkSegment>()
            val visitedRecords = HashSet<Int>()
            var recordNumber = firstSummaryRecord

            while (recordNumber != 0) {
                require(visitedRecords.add(recordNumber)) { "DAF summary record cycle at $recordNumber" }
                val summaryBuffer = ByteBuffer.allocate(RECORD_BYTES).order(order)
                val summaryOffset = (recordNumber.toLong() - 1L) * RECORD_BYTES
                require(summaryOffset + RECORD_BYTES <= logicalLengthBytes) { "Summary record exceeds SPK range" }
                readFully(channel, summaryBuffer, baseOffsetBytes + summaryOffset)
                summaryBuffer.flip()
                val next = exactNonNegativeInt(summaryBuffer.double, "NEXT")
                exactNonNegativeInt(summaryBuffer.double, "PREV")
                val count = exactNonNegativeInt(summaryBuffer.double, "NSUM")
                require(count <= maxSummaries) { "Too many summaries in record: $count > $maxSummaries" }

                val nameBuffer = ByteBuffer.allocate(RECORD_BYTES)
                val nameOffsetBytes = recordNumber.toLong() * RECORD_BYTES
                require(nameOffsetBytes + RECORD_BYTES <= logicalLengthBytes) { "Name record exceeds SPK range" }
                readFully(channel, nameBuffer, baseOffsetBytes + nameOffsetBytes)
                val names = nameBuffer.array()

                repeat(count) { index ->
                    val d = DoubleArray(nd) { summaryBuffer.double }
                    val ints = IntArray(ni)
                    var ii = 0
                    repeat((ni + 1) / 2) {
                        val packed = ByteArray(8)
                        summaryBuffer.get(packed)
                        val ib = ByteBuffer.wrap(packed).order(order)
                        if (ii < ni) ints[ii++] = ib.int
                        if (ii < ni) ints[ii++] = ib.int
                    }
                    require(nd >= 2 && ni >= 6) { "SPK summary requires ND>=2 NI>=6" }
                    val initialAddress = ints[4]
                    val finalAddress = ints[5]
                    require(initialAddress >= 1 && finalAddress >= initialAddress) { "Invalid SPK segment address" }
                    val nameOffset = index * nameChars
                    val name = ascii(names, nameOffset, nameChars).trimEnd('\u0000', ' ')
                    out += SpkSegment(
                        name = name,
                        coverageStartEt = d[0],
                        coverageEndEt = d[1],
                        target = ints[0],
                        center = ints[1],
                        frame = ints[2],
                        dataType = ints[3],
                        initialAddress = initialAddress,
                        finalAddress = finalAddress
                    )
                }
                recordNumber = next
            }
            return out
        }

        private fun evaluateChebyshev(record: DoubleArray, offset: Int, count: Int, x: Double): Double {
            require(count >= 1 && offset >= 0 && offset + count <= record.size)
            var t0 = 1.0
            var value = record[offset]
            if (count == 1) return value
            var t1 = x
            value += record[offset + 1] * t1
            for (i in 2 until count) {
                val t2 = 2.0 * x * t1 - t0
                value += record[offset + i] * t2
                t0 = t1
                t1 = t2
            }
            return value
        }

        private fun exactPositiveInt(value: Double, label: String): Int {
            val integer = exactNonNegativeInt(value, label)
            require(integer > 0) { "$label must be positive" }
            return integer
        }

        private fun exactNonNegativeInt(value: Double, label: String): Int {
            require(value.isFinite() && value >= 0.0 && value <= Int.MAX_VALUE.toDouble()) { "Invalid $label=$value" }
            val integer = value.toInt()
            require(integer.toDouble() == value) { "$label is not integral: $value" }
            return integer
        }

        private fun ascii(bytes: ByteArray, offset: Int, length: Int): String {
            require(offset >= 0 && length >= 0 && offset + length <= bytes.size)
            return String(bytes, offset, length, Charsets.US_ASCII)
        }

        private fun readFully(channel: FileChannel, buffer: ByteBuffer, offset: Long) {
            var position = offset
            while (buffer.hasRemaining()) {
                val read = channel.read(buffer, position)
                if (read < 0) throw EOFException("Unexpected EOF at byte $position")
                if (read == 0) continue
                position += read
            }
        }
    }
}
