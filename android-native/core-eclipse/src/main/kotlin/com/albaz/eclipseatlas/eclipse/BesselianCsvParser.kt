package com.albaz.eclipseatlas.eclipse

import com.albaz.eclipseatlas.domain.GlobalEclipseType

internal object BesselianCsvParser {
    private const val ASSIGNMENT = "window.ALBAZ_BESSELIAN_CSV"

    fun parseJavaScript(source: String): List<BesselianElements> {
        val csv = decodeAssignedString(source)
        val lines = csv.lineSequence().filter { it.isNotBlank() }.toList()
        require(lines.isNotEmpty()) { "Besselian CSV is empty" }

        val header = lines.first().split(',')
        val column = header.withIndex().associate { it.value.trim() to it.index }

        fun index(name: String): Int = requireNotNull(column[name]) {
            "Missing required Besselian column: $name"
        }

        val iy = index("year")
        val imo = index("month")
        val iday = index("day")
        val itdGe = index("td_ge")
        val idt = index("dt")
        val iluna = index("luna_num")
        val isaros = index("saros")
        val itype = index("eclipse_type")
        val igamma = index("gamma")
        val imag = index("magnitude")
        val ijd = index("julian_date")
        val it0 = index("t0")
        val ix0 = index("x0")
        val ix1 = index("x1")
        val ix2 = index("x2")
        val ix3 = index("x3")
        val iy0 = index("y0")
        val iy1 = index("y1")
        val iy2 = index("y2")
        val iy3 = index("y3")
        val id0 = index("d0")
        val id1 = index("d1")
        val id2 = index("d2")
        val imu0 = index("mu0")
        val imu1 = index("mu1")
        val imu2 = index("mu2")
        val il10 = index("l10")
        val il11 = index("l11")
        val il12 = index("l12")
        val il20 = index("l20")
        val il21 = index("l21")
        val il22 = index("l22")
        val itanF1 = index("tan_f1")
        val itanF2 = index("tan_f2")
        val itMin = index("tmin")
        val itMax = index("tmax")

        return lines.drop(1).mapIndexed { rowIndex, line ->
            val cells = line.split(',')
            require(cells.size >= header.size) {
                "Malformed Besselian row ${rowIndex + 2}: expected ${header.size} columns, got ${cells.size}"
            }

            fun s(i: Int): String = cells[i].trim()
            fun d(i: Int): Double = s(i).toDouble()
            fun n(i: Int): Int = s(i).toInt()

            BesselianElements(
                year = n(iy),
                month = n(imo),
                day = n(iday),
                tdGreatest = s(itdGe),
                deltaTSeconds = d(idt),
                lunarNumber = n(iluna),
                saros = n(isaros),
                type = parseType(s(itype)),
                gamma = d(igamma),
                catalogMagnitude = d(imag),
                julianDate = d(ijd),
                t0Hours = d(it0),
                x = doubleArrayOf(d(ix0), d(ix1), d(ix2), d(ix3)),
                y = doubleArrayOf(d(iy0), d(iy1), d(iy2), d(iy3)),
                d = doubleArrayOf(d(id0), d(id1), d(id2)),
                mu = doubleArrayOf(d(imu0), d(imu1), d(imu2)),
                l1 = doubleArrayOf(d(il10), d(il11), d(il12)),
                l2 = doubleArrayOf(d(il20), d(il21), d(il22)),
                tanF1 = d(itanF1),
                tanF2 = d(itanF2),
                tMinHours = d(itMin),
                tMaxHours = d(itMax),
            )
        }
    }

    private fun parseType(raw: String): GlobalEclipseType = when (raw.firstOrNull()?.uppercaseChar()) {
        'P' -> GlobalEclipseType.PARTIAL
        'A' -> GlobalEclipseType.ANNULAR
        'T' -> GlobalEclipseType.TOTAL
        'H' -> GlobalEclipseType.HYBRID
        else -> error("Unknown eclipse type: $raw")
    }

    private fun decodeAssignedString(source: String): String {
        val assignmentStart = source.indexOf(ASSIGNMENT)
        require(assignmentStart >= 0) { "$ASSIGNMENT assignment not found" }

        val equals = source.indexOf('=', assignmentStart + ASSIGNMENT.length)
        require(equals >= 0) { "Besselian assignment has no '='" }

        val quote = source.indexOf('"', equals + 1)
        require(quote >= 0) { "Besselian assignment has no opening quote" }

        val out = StringBuilder(source.length.coerceAtMost(1_500_000))
        var i = quote + 1
        while (i < source.length) {
            when (val ch = source[i]) {
                '"' -> return out.toString()
                '\\' -> {
                    require(i + 1 < source.length) { "Truncated escape in Besselian JavaScript string" }
                    val escaped = source[++i]
                    when (escaped) {
                        'n' -> out.append('\n')
                        'r' -> out.append('\r')
                        't' -> out.append('\t')
                        '"' -> out.append('"')
                        '\\' -> out.append('\\')
                        '/' -> out.append('/')
                        'b' -> out.append('\b')
                        'f' -> out.append('\u000C')
                        'u' -> {
                            require(i + 4 < source.length) { "Truncated Unicode escape" }
                            val hex = source.substring(i + 1, i + 5)
                            out.append(hex.toInt(16).toChar())
                            i += 4
                        }
                        else -> error("Unsupported JavaScript escape: \\$escaped")
                    }
                }
                else -> out.append(ch)
            }
            i++
        }
        error("Unterminated Besselian JavaScript string")
    }
}
